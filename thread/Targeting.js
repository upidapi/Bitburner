import { estimateX } from "Helpers/EstimateX"
import { calcMinHackChance, getMinSecWeakenTime } from "Helpers/MyFormulas"
import { getServers } from "Other/ScanServers"
import { Batch } from "thread/Other"
import { BatchStartMargin, DeltaBatchExec, ThreadMargin } from "thread/Setings"

const RamUsage = {
    "hack": 1.70, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
    "grow": 1.75, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
    "weaken": 1.75 // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
}

export function getBestMoneyBatch(ns, target, availableRam) {
    function hackThreadsToRam(hackThreads) {
        // exec order: ghw
        batch.hack = Math.floor(hackThreads)

        const moneyStolenD = ns.hackAnalyze(target) * batch.hack
        const neededMoneyIncD = 1 / (1 - moneyStolenD)

        batch.grow = ns.growthAnalyze(target, neededMoneyIncD)
        batch.grow = Math.ceil(batch.grow * ThreadMargin)

        const secInc =
            ns.hackAnalyzeSecurity(batch.hack) +
            ns.growthAnalyzeSecurity(batch.grow)

        batch.weaken = secInc / ns.weakenAnalyze(1)
        batch.weaken = Math.ceil(batch.weaken * ThreadMargin)

        return batch.ramUsage()
    }

    const hackPart = ns.hackAnalyze(target)
    if (hackPart == 0) {
        return new Batch()
    }

    const hackForHalf = 0.5 / hackPart
    let batch = new Batch()

    estimateX(ns, hackThreadsToRam, availableRam, 0, hackForHalf, 0, 0, "min")

    return batch
}


/**
 * @param {NS} ns 
 * @param {String} target 
 * @returns {Batch}
 * 
 * Gets the batch that will get the most money (the optimal batch) for a given target.
 * Without considering the ram usage.
 * */

export function getOptimalMoneyBatch(ns, target) {
    return getBestMoneyBatch(ns, target, Infinity)
}


function getBestMoneyFixBatch(ns, target, availableRam) {
    if (availableRam <= 0) {
        return new Batch()
    }

    const serverMoney = ns.getServerMoneyAvailable(target)
    const maxServerMoney = ns.getServerMaxMoney(target)

    if (maxServerMoney == 0) {
        return new Batch()
    }

    // check if it has to be fixed
    if (serverMoney != maxServerMoney) {

        const moneyOnServer = Math.max(1, ns.getServerMoneyAvailable(target))

        // calculate start max batch
        const moneyLeftP = moneyOnServer / maxServerMoney
        const maxMul = 1 / moneyLeftP

        let batch = new Batch()

        // nothing is set to the result since it already sets the properties of "threads"
        // use binary search to find the largest "growthPercent" such that"growthPercentToRam(growthPercent) <= aRam"
        estimateX(ns,

            // growthPercentToRam(x)
            x => {
                batch.grow = Math.ceil(ns.growthAnalyze(target, x))

                let secInc = ns.growthAnalyzeSecurity(batch.grow)

                batch.weaken = secInc / ns.weakenAnalyze(1)
                batch.weaken = Math.ceil(batch.weaken)

                return batch.ramUsage()
            },
            availableRam, 1, maxMul, 0, 0.1, "min")

        return batch
    }

    return new Batch()
}


function getBestSecurityFixBatch(ns, target, availableRam) {
    if (availableRam <= 0) {
        return new Batch()
    }

    const fromMin = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)

    if (fromMin != 0) {
        const optimalWeakenThreads = Math.ceil(fromMin / ns.weakenAnalyze(1))

        const maxWeakenThreads = Math.floor(availableRam / RamUsage["weaken"])

        const weakenThreads = Math.min(optimalWeakenThreads, maxWeakenThreads)

        const batch = new Batch(0, 0, weakenThreads)

        return batch
    }

    return new Batch()
}


/**
 * gets the batch that will get the target the closest to fixed (with the available ram)
 */
export function getBestFixBatch(ns, target, availableRam) {
    const securityFixBatch = getBestSecurityFixBatch(ns, target, availableRam)

    availableRam -= securityFixBatch.ramUsage()

    const moneyFixBatch = getBestMoneyFixBatch(ns, target, availableRam)

    const bestFixBatch = securityFixBatch
    bestFixBatch.weaken += moneyFixBatch.weaken
    bestFixBatch.grow += moneyFixBatch.grow
    bestFixBatch.hack += moneyFixBatch.hack

    return bestFixBatch
}

export function getOptimalFixBatch(ns, target) {
    return getBestFixBatch(ns, target, Infinity)
}


/**
 * @param {NS} ns 
 * @param {String} target 
 * @param {Batch} batch 
 * 
 * gets the (average) money per sec per ram for a given batch and target
 */
function getMoneyPerMs(ns, target, batch) {
    const gSecInc = ns.growthAnalyzeSecurity(batch.grow, target)
    const secWhenHack = ns.getServerMinSecurityLevel(target) + gSecInc

    const hackChance = calcMinHackChance(ns, target, secWhenHack)
    const hackPart = ns.hackAnalyze(target) * batch.hack

    const averageHackAmount = hackPart * hackChance * ns.getServerMaxMoney(target)
    const batchTime = getMinSecWeakenTime(ns, target)
    const moneyPerMs = averageHackAmount / batchTime

    return moneyPerMs
}


export class TargetData {
    /**
     * 
     * @param {NS} ns 
     * @param {String} target 
     */
    constructor(ns, target) {
        this.target = target
        this.execTime = performance.now()
        this.batch = getOptimalMoneyBatch(ns, target)

        this.fixComplete = 0
        this.secAftFix = ns.getServerSecurityLevel(target)
        this.security = ns.getServerSecurityLevel(target)
    }

    copy(ns) {
        const copy = new TargetData(ns, this.target)

        copy.execTime = this.execTime
        copy.fixedStatus = this.fixedStatus
        copy.batch = this.batch

        return copy
    }
}


/**
 * @param {NS} ns 
 * @returns {Array<TargetData>}
 */
export function getTargetsData(ns) {
    const servers = getServers(ns)

    let targetsData = []
    for (const target of servers) {
        // no pint in hacking "empty" servers
        if (ns.getServerMaxMoney(target) == 0) {
            continue
        }

        targetsData.push(new TargetData(ns, target))
    }

    return targetsData
}


/** @param {NS} ns */
export function getRoot(ns, target) {
    if (ns.hasRootAccess(target)) {
        return true
    }

    const homePrograms = ns.ls("home")
    const portOpeners = []

    function addPossible(file_name, func) {
        if (homePrograms.indexOf(file_name) >= 0) {
            portOpeners.push(func)
        }
    }

    addPossible("BruteSSH.exe", ns.brutessh)
    addPossible("FTPCrack.exe", ns.ftpcrack)
    addPossible("relaySMTP.exe", ns.relaysmtp)
    addPossible("HTTPWorm.exe", ns.httpworm)
    addPossible("SQLInject.exe", ns.sqlinject)

    const portsReq = ns.getServerNumPortsRequired(target)

    if (portOpeners.length < portsReq) {
        return false
    }

    // iterate over all needed programs to get root
    for (let i = 0; i < portsReq; i++) {
        portOpeners[i](target)
    }

    ns.nuke(target)

    return true
}


/**
 * 
 * @param {NS} ns 
 * @param {Array<TargetData>} targetsData 
 */
export function getBestTarget(ns, targetsData, totalRam) {
    const level = ns.getHackingLevel()

    let bestTarget = null
    let bestMoneyPerMs = 0

    for (const targetData of targetsData) {
        const target = targetData.target

        // we can't hack our own servers
        if (target.startsWith("pserver-2^")) {
            continue
        }

        if (!getRoot(ns, target)) {
            continue
        }

        if (ns.getServerRequiredHackingLevel(target) > level) {
            continue
        }

        if (ns.getServerMaxMoney(target) == 0) {
            continue
        }

        const batch = targetData.batch
        const moneyPerMsPerBatch = getMoneyPerMs(ns, target, batch)


        const ramPerBatch = batch.ramUsage()
        const maxBatchesRam = totalRam / ramPerBatch

        const startPerMs = 1 / DeltaBatchExec
        const batchTime =
            getMinSecWeakenTime(ns, targetData.target)
            + DeltaBatchExec
            + BatchStartMargin * 2

        const maxConcurrentBatches = startPerMs * batchTime / 4
        const maxBatchesTime = maxConcurrentBatches

        const maxBatches = Math.min(
            maxBatchesRam,
            maxBatchesTime
        )

        const moneyPerMs = moneyPerMsPerBatch * maxBatches
        // console.log(targetData, maxBatchesRam, maxBatchesTime, moneyPerMs)

        // console.log(moneyPerMsPerRam, target)

        if (moneyPerMs > bestMoneyPerMs) {
            bestMoneyPerMs = moneyPerMs
            bestTarget = targetData
        }
    }

    if (bestTarget == null) {
        throw new Error("no targets found")
    }

    return bestTarget
}

// function getTargetPriority(ns, targetsData) {
//     const targetInfo = []

//     for (const target in targetsData) {
//         const targetData = targetsData[target]

//         const batch = targetData.batch

//         const moneyPerMs = getMoneyPerMs(ns, target, batch)
//         const moneyPerMsPerRam = moneyPerMs / batch.ramUsage()

//         targetInfo.push([target, moneyPerMsPerRam])
//     }

//     // sort the targetInfo in descending moneyPerMsPerRam order
//     targetInfo.sort((a, b) => b[1] - a[1])

//     const targetPriority = []
//     let aRam = getAvailableHsbRam(ns)

//     for (const [target, _] of targetInfo) {
//         if (ensureCanHack(ns, target)) {
//             continue
//         }

//         const targetData = targetsData[target]
//         const batch = targetData.batch

//         const averageBatchTime = getMinSecWeakenTime(ns, target) + averageBatchASec
//         const maxConcurrentBatches = (averageBatchTime / execMargin) * maxShotgunShells

//         const maxRam = batch.ramUsage() * maxConcurrentBatches

//         targetPriority.push(target)

//         if (maxRam > aRam) {
//             return [targetPriority, [target, aRam]]
//         }

//         aRam -= maxRam
//     }

//     return [targetPriority, [null, 0]]