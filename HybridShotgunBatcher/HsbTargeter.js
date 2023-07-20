/**
 * calculates the optimal targets for multi target hsb
 */

import { averageBatchASec, execMargin, maxShotgunShells, minDeltaBatchExec } from "HybridShotgunBatcher/Settings"

import { getServers } from "Other/ScanServers"
import { getBestFixBatch, getBestMoneyBatch, getOptimalFixBatch, getOptimalMoneyBatch, startBatch } from "HybridShotgunBatcher/Batching"
import { getMoneyPerMs } from "HybridShotgunBatcher/Other"
import { getLowSecHoleEnd, getNextLowSecEnd, getNextSecHole, goToNextSecHole, inLowSecHole } from "HybridShotgunBatcher/SecHoles"
import { getMinSecWeakenTime } from "Helpers/MyFormulas"


const hostRamMargin = 100

/** 
 * @param {NS} ns 
 * @returns {Array<string>}
*/
export function getAvailableWGHServers(ns) {
    // gets the possible servers for WGH distribution

    const hostName = ns.getHostname()

    const allServers = getServers(ns)

    const availableServers = allServers.filter(
        (x) => {
            if (x == ns.getHostname()) {
                return false
            }

            if (!ns.hasRootAccess(x)) {
                return false
            }

            return true
        }
    )

    const serverRam = availableServers.reduce(
        (partialSum, serverName) =>
            partialSum + Math.max(0, ns.getServerMaxRam(serverName) - 2),
        0  // initial value
    )

    // check if the amount of ram on the servers is lees than the ram on home
    // if so add home as a possibility for WGH thread distribution 
    const hostTotalAvailableRam = ns.getServerMaxRam(hostName)
    // const hostAvailableRam = Math.max(0, hostTotalAvailableRam - hostRamMargin)

    if (serverRam < hostTotalAvailableRam) {
        return [...availableServers, hostName]
    }

    return availableServers
}

/**
 * @param {NS} ns 
 * @param {String} server
 */
function getServerHsbUsedRam(ns, server) {
    let usedRam = 0

    const wghScripts = [
        "HybridShotgunBatcher/ThreadScripts/Grow.js",
        "HybridShotgunBatcher/ThreadScripts/Weaken.js",
        "HybridShotgunBatcher/ThreadScripts/Hack.js",
    ]

    const ramMap = Object.fromEntries(wghScripts.map(scriptName => [scriptName, ns.getScriptRam(scriptName)]))

    for (const scriptData of ns.ps(server)) {
        const scriptRam = ramMap[scriptData.filename] ?? 0

        usedRam += scriptRam * scriptData.threads
    }

    return usedRam
}


function getServerAvailableHsbRam(ns, server) {
    const hsbUsedRam = getServerHsbUsedRam(ns, server)
    const totHsbAvailableRam = ns.getServerMaxRam(server) * 0.95
    let hsbAvailableRam = totHsbAvailableRam - hsbUsedRam

    const hostName = ns.getHostname()

    if (server == hostName) {
        // it's very annoying having no ram on hostName (home)
        // therefor reserve some ram on hostName (home)
        hsbAvailableRam -= hostRamMargin
    } else {

        // remove 2 gb from each server

        // if we don't do this the available ram might spread out on several servers 
        // ex (server 1) ram: 1, (server 2) ram: 1, (server 3) ram: 1
        // this would result in a total available ram of 3.
        // that would make it believe it has space for another hack thread (1.6 gb of ram)
        // but no server has enough ram fo it 
        // resulting in the process crashing

        // therefor we remove ram from the available ram
        hsbAvailableRam -= 2
    }

    return hsbAvailableRam
}


/**
 * @param {NS} ns 
 */
function getAvailableHsbRam(ns) {
    const servers = getAvailableWGHServers(ns)

    let totalHsbAvailableRam = 0

    for (const server of servers) {
        totalHsbAvailableRam += getServerAvailableHsbRam(ns, server)
    }

    return totalHsbAvailableRam
}


function getTargetsData(ns) {
    const servers = getServers(ns)

    let targetsData = {}
    for (const target of servers) {
        targetsData[target] = {
            execTime: Date.now(),
            fixedStatus: 0,
            batch: getOptimalMoneyBatch(ns, target),
            baseSecurity: 0, // will be set by somethingBatchFix()
        }
    }

    return targetsData
}


/**
 * @param {NS} ns 
 * @param {String} target 
 */
function ensureCanHack(ns, target) {
    if (!ns.hasRootAccess(target)) {
        // we need more programs

        return false
    }

    if (ns.getServerRequiredHackingLevel(target) < ns.getHackingLevel()) {
        // we need to level up

        return false
    }

    return true
}


function getTargetPriority(ns, targetsData) {
    const targetInfo = []

    for (const target in targetsData) {
        const targetData = targetsData[target]

        const batch = targetData.batch

        const moneyPerMs = getMoneyPerMs(ns, target, batch)
        const moneyPerMsPerRam = moneyPerMs / batch.ramUsage()

        targetInfo.push([target, moneyPerMsPerRam])
    }

    // sort the targetInfo in descending moneyPerMsPerRam order
    targetInfo.sort((a, b) => b[1] - a[1])

    const targetPriority = []
    let aRam = getAvailableHsbRam(ns)

    for (const [target, _] of targetInfo) {
        if (!ensureCanHack(ns, target)) {
            continue
        }

        const targetData = targetsData[target]
        const batch = targetData.batch

        const averageBatchTime = getMinSecWeakenTime(ns, target) + averageBatchASec
        const maxConcurrentBatches = (averageBatchTime / execMargin) * maxShotgunShells

        const maxRam = batch.ramUsage() * maxConcurrentBatches

        targetPriority.push(target)

        if (maxRam > aRam) {
            return [targetPriority, [target, aRam]]
        }

        aRam -= maxRam
    }

    return [targetPriority, [null, 0]]
}


function targetFixed(ns, target) {
    if (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target) != 0) {
        // probably due to that the last weaken, before the sec hole start
        // somehow didn't exec before the sec hole

        ns.print("security not min")
        ns.print("  min sec: " + ns.getServerMinSecurityLevel(target))
        ns.print("  cur sec: " + ns.getServerSecurityLevel(target))

        return false
    }

    if (ns.getServerMaxMoney(target) - ns.getServerMoneyAvailable(target) != 0) {
        // server money not max

        const serverMoney = formatNum(ns.getServerMoneyAvailable(target), 3)
        const serverMaxMoney = formatNum(ns.getServerMaxMoney(target), 3)
        const moneyP = (ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target)) * 100

        ns.print("money not max")
        ns.print(`    money: ${serverMoney}/${serverMaxMoney} ${moneyP}%`)

        return false
    }

    return true
}


/**
 * @param {NS} ns 
 * @param {String} target 
 * @param {Number} data.target 
 * @returns {Boolean} if we don't have to wait to get a validExecTime
 */
function ensureValidExecTime(ns, target, targetData) {

    if (!inLowSecHole()) {
        // the sleepMargin was surpassed
        // i.e the sleep time inaccuracy was larger than the sleepMargin 

        return false
    }

    // if (ns.getServerSecurityLevel(target) > targetData.baseSecurity) {
    //     // something went wrong and the security is optimal when in the low sec hole

    //     throw new Error(
    //         "security not min in lowSecHole" + "\n" +
    //         `  sec: ${ns.getServerSecurityLevel(target)}` + "\n" +
    //         `  min sec: ${ns.getServerMinSecurityLevel(target)}` + "\n" +
    //         `  base sec: ${targetData.baseSecurity}`
    //     )
    //     // return false
    // }

    while (true) {
        // the exec time for a batch that would be launched now (or to be exact after the sleep hole ends)
        // the thing is that we can't launch a batch before this one
        const firstPossibleExecTime = getNextLowSecEnd() + minDeltaBatchExec + ns.getWeakenTime(targetData.target)

        if (targetData.execTime < firstPossibleExecTime) {
            // we can't launch a batch ion the past
            targetData.execTime = firstPossibleExecTime
            console.log(targetData, "exec in past")
            continue
        }

        // if the batch exec collides with a lowSecHole
        if (inLowSecHole(targetData.execTime) ||
            inLowSecHole(targetData.execTime - minDeltaBatchExec) ||
            getNextSecHole(targetData.execTime - minDeltaBatchExec) < targetData.execTime) {
            // we can't launch a batch that would collide with the lowSecHole
            // since that would remove the lowSecHole

            targetData.execTime = getNextLowSecEnd(targetData.execTime) + minDeltaBatchExec
            console.log(targetData, "exec in low sec")
            continue
        }

        // const toSecHoleEnd = getLowSecHoleEnd() - Date.now()

        // the time from the lowSecEnd to when the WGH starts
        const firstStartTime = targetData.execTime - ns.getWeakenTime(target) - minDeltaBatchExec
        const deltaFirstStartTime = firstStartTime - getNextLowSecEnd()

        if (deltaFirstStartTime > execMargin) {
            // deltaFirstStartTime being larger than execMargin would mean that 
            // we are basically pre firing the next shotgun's batches.
            // Doing that would just waste ram, whiteout any upside therefore 
            // wait til the next shotgun to fire those batches if that happens
            // i.e skip this shotgun and just go the next (whiteout increasing the 
            // execTime) 

            console.log(getLowSecHoleEnd(), firstStartTime, deltaFirstStartTime, 2)

            return false
        }

        return true
    }
}


function ensureFixed(ns, target, targetData) {
    // fixes the target security/money
    // also returns if the target is ready to hsb

    // data.fixedStatus possibilities
    // - a number (the exec time of the fix batch)
    // - fixing
    // - fixed

    // console.log(1)

    if (targetData.fixedStatus == "fixed") {
        return true
    }

    // console.log(2)

    if (targetFixed(ns, target)) {
        targetData.baseSecurity = ns.getServerSecurityLevel(target)

        targetData.fixedStatus = "fixed"
        return true
    }

    // console.log(3)

    if (targetData.fixedStatus == "fixing") {
        if (speedStart) {
            return true
        }
        return false
    }

    // console.log(4)
    // if data.fixedStatus is not "fixing" or "fixed"
    // then data.fixedStatus must be a number
    if (targetData.fixedStatus > Date.now()) {
        // if the fix exec time is after now
        // then we shouldn't start another fix batch  
        return false
    }

    const fixBatch = getBestFixBatch(ns, target, getAvailableHsbRam(ns))
    const optimalFixBatch = getOptimalFixBatch(ns, target)

    // console.log(5, fixBatch, optimalFixBatch)

    if (fixBatch.equal(optimalFixBatch)) {
        // the target will be finished when the batch completes

        targetData.fixedStatus == "fixing"
    } else {
        // we will need (at least) another batch to fully fix it

        targetData.fixedStatus == targetData.execTime
    }

    startBatch(ns,
        target,
        fixBatch,
        targetData.execTime)

    targetData.execTime += minDeltaBatchExec

    targetData.baseSecurity = ns.getServerSecurityLevel(target)

    if (targetData.fixedStatus == "fixing") {
        if (speedStart) {
            return true
        }
        return false
    }
    return false
}


function getMaxBatchesForTime(firstBatchExec) {
    const lastAllowedExecTime = getNextSecHole(firstBatchExec)

    // since it will round upp to the next when at the start of a secHole
    // i.e it will be execMargin larger if the firstBatchExec == the start of a lowSecHole
    if (firstBatchExec == lastAllowedExecTime - execMargin) {
        return 1
    }

    return Math.ceil((lastAllowedExecTime - firstBatchExec) / execMargin)
}


/**
 * @param {NS} ns 
 */
function scheduleSubShotgun(ns,
    target,
    targetData,
    subShotgunBatchExecTimes,
    subShotgunMaxRam,
    subBatchData,
) {
    // sub shotgun

    let subBatchTotalUsedRam = 0

    for (let i = 0; i < subShotgunBatchExecTimes.length; i++) {
        const batchExecTime = subShotgunBatchExecTimes[i]

        if (batchExecTime >= Date.now()) {
            const notCompleteBatches = (subShotgunBatchExecTimes.length - i)
            subBatchTotalUsedRam += targetData.batch.ramUsage() * notCompleteBatches
        }
    }

    if (subBatchData[0] != null) {
        if (subBatchData[1] >= Date.now()) {
            subBatchTotalUsedRam += subBatchData[0].ramUsage()
        }
    }

    const subBatchAvailableRam = subShotgunMaxRam - subBatchTotalUsedRam
    const availableRam = Math.max(0, Math.min(getAvailableHsbRam(ns), subBatchAvailableRam))

    const maxBatchesForRam = Math.floor(availableRam / targetData.batch.ramUsage())
    const maxBatchesForTime = getMaxBatchesForTime(data.execTime)
    const maxBatches = Math.min(maxBatchesForRam, maxBatchesForTime)

    for (let i = 0; i < maxBatches; i++) {
        subShotgunBatchExecTimes.push(targetData.execTime)

        startBatch(ns, target, targetData.batch, targetData.execTime)

        targetData.execTime += minDeltaBatchExec
    }

    if (maxBatchesForRam < maxBatchesForTime) {
        const subBatchRam = availableRam % targetData.batch.ramUsage()

        const subBatch = getBestMoneyBatch(ns, target, subBatchRam)

        subBatchData = [subBatch, targetData.execTime]

        startBatch(ns, target, subBatch, targetData.execTime)

        targetData.execTime += minDeltaBatchExec
    }

    return subBatchData
}


/**
 * @param {NS} ns 
 */
function scheduleFullShotgun(ns, target, targetData) {
    // full shotgun
    const maxBatchesForTime = getMaxBatchesForTime(targetData.execTime)

    const maxBatchesForRam = Math.floor(getAvailableHsbRam() / targetData.batch.ramUsage())
    const maxBatches = Math.min(maxBatchesForTime, maxBatchesForRam)

    for (let i = 0; i < maxBatches; i++) {
        startBatch(ns, target, targetData.batch, targetData.execTime)

        targetData.execTime += minDeltaBatchExec
    }
}


/**
 * @param {NS} ns 
 */
export async function multiServerHSb(ns) {
    // ordered based on the priority of each target 
    let targetsData = getTargetsData(ns)

    let subShotgunTarget = null
    let subShotgunBatchExecTimes = []
    let subShotgunMaxRam = 0

    // batch, execTime
    let subBatchData = [null, 0]

    while (true) {
        let targetPriority, newSubShotgunTarget
        [targetPriority, [newSubShotgunTarget, subShotgunMaxRam]] = getTargetPriority(ns, targetsData)

        if (newSubShotgunTarget != subShotgunTarget) {
            subShotgunTarget = newSubShotgunTarget

            subShotgunBatchExecTimes = []
        }

        await goToNextSecHole(ns)

        for (const target of targetPriority) {
            let targetData = targetsData[target]

            if (!ensureValidExecTime(ns, targetData)) {
                continue
            }

            if (!ensureFixed(ns, targetData)) {
                continue
            }

            if (subShotgunTarget == target) {
                subBatchData = scheduleSubShotgun(ns,
                    targetData,
                    subShotgunBatchExecTimes,
                    subShotgunMaxRam,
                    subBatchData
                )
            } else {
                scheduleFullShotgun(ns,
                    targetData
                )
            }
        }
    }
}

/**
 * @param {NS} ns 
 */
export async function main(ns) {
    ns.disableLog("ALL")
    const targetsData = getTargetsData(ns)

    while (true) {
        await goToNextSecHole(ns)

        const target = "omega-net"
        const targetData = targetsData[target]

        console.log(targetData)
        if (!ensureValidExecTime(ns, target, targetData)) {
            targetsData[target] = targetData
            continue
        }

        if (!ensureFixed(ns, target, targetData)) {
            targetsData[target] = targetData
            continue
        }

        if (subShotgunTarget == target) {
            console.log(targetData,
                subShotgunBatchExecTimes,
                subShotgunMaxRam,
                subBatchData
            )
            return
            subBatchData = scheduleSubShotgun(ns,
                target,
                targetData,
                subShotgunBatchExecTimes,
                subShotgunMaxRam,
                subBatchData
            )
        } else {
            console.log(targetData)
            return
            scheduleFullShotgun(ns,
                target,
                targetData
            )
        }

        targetsData[target] = targetData
    }
}


// function test(dict) {
//     dict.a += 1
//     dict.b = "hello"
// }


// export async function main(ns) {
//     const dict = {
//         a: 100,
//         b: 20
//     }
//     test(dict)
//     console.log(dict)
// }