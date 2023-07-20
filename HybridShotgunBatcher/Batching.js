import {
    execMargin,
    WGHMargin,
    // sleepMargin,
    lowSecHoleTime,
    minDeltaBatchExec,
    maxShotgunShells
} from "HybridShotgunBatcher/Settings"


import { estimateX } from "Helpers/EstimateX"


function getBestMoneyFixBatch(ns, target, availableRam) {
    if (availableRam == 0) {
        return new Threads()
    }

    const serverMoney = ns.getServerMoneyAvailable(target)
    const maxServerMoney = ns.getServerMaxMoney(target)

    if (maxServerMoney == 0) {
        return new Threads()
    }

    // check if it has to be fixed
    if (serverMoney != maxServerMoney) {

        const moneyOnServer = Math.max(1, ns.getServerMoneyAvailable(target))

        // calculate start max threads
        const moneyLeftP = moneyOnServer / maxServerMoney
        const maxMul = 1 / moneyLeftP

        let threads = new Threads()

        // nothing is set to the result since it already sets the properties of "threads"
        // use binary search to find the largest "growthPercent" such that"growthPercentToRam(growthPercent) <= aRam"
        estimateX(ns,

            // growthPercentToRam(x)
            x => {
                threads.grow = Math.ceil(ns.growthAnalyze(target, x))

                let secInc = ns.growthAnalyzeSecurity(threads.grow)

                threads.weaken = secInc / ns.weakenAnalyze(1)
                threads.weaken = Math.ceil(threads.weaken)

                return threads.ramUsage()
            },
            availableRam, 1, maxMul, 0, 0.1)

        return threads
    }

    return new Threads()
}

function getBestSecurityFixBatch(ns, target, availableRam) {
    if (availableRam == 0) {
        return new Threads()
    }

    const fromMin = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)

    if (fromMin != 0) {
        const optimalWeakenThreads = Math.ceil(fromMin / ns.weakenAnalyze(1))

        const maxWeakenThreads = Math.floor(availableRam / RamUsage["weaken"])

        const weakenThreads = Math.min(optimalWeakenThreads, maxWeakenThreads)

        const threads = new Threads(0, 0, weakenThreads)

        return threads
    }

    return new Threads()
}

export function getOptimalFixBatch(ns, target) {
    const securityFixBatch = getBestSecurityFixBatch(ns, target, Infinity)

    const moneyFixBatch = getBestMoneyFixBatch(ns, target, Infinity)

    return securityFixBatch.add(moneyFixBatch)
}


/**
 * gets the batch that will get the target the closest to fixed (with the available ram)
 */
export function getBestFixBatch(ns, target, availableRam) {
    const securityFixBatch = getBestSecurityFixBatch(ns, target, availableRam)

    availableRam -= securityFixBatch.ramUsage()

    const moneyFixBatch = getBestMoneyFixBatch(ns, target, availableRam)

    const bestFixBatch = securityFixBatch.add(moneyFixBatch)
    return bestFixBatch
}

/**
 * gets the optimal batch for a given target and ram
 */
export function getBestMoneyBatch(ns, target, availableRam) {
    function hackThreadsToRam(hackThreads) {
        threads.hack = Math.floor(hackThreads)

        const moneyStolenP = ns.hackAnalyze(target) * threads.hack
        const neededMoneyIncD = 1 / (1 - moneyStolenP)

        threads.grow = ns.growthAnalyze(target, neededMoneyIncD)
        threads.grow = Math.ceil(threads.grow)

        let secInc = 0
        secInc += ns.hackAnalyzeSecurity(threads.hack)
        secInc += ns.growthAnalyzeSecurity(threads.grow)

        threads.weaken = secInc / ns.weakenAnalyze(1)
        threads.weaken = Math.ceil(threads.weaken)

        return threads.ramUsage()
    }

    const hackPart = ns.hackAnalyze(target)
    if (hackPart == 0) {
        return new Threads()
    }

    const hackForHalf = 0.5 / hackPart
    let threads = new Threads()

    estimateX(ns, hackThreadsToRam, availableRam, 0, hackForHalf, -10, 0)

    return threads
}

// /**
//  * @param {NS} ns 
//  * @param {String} target 
//  * @returns {Threads}
//  * 
//  * Gets the batch that will get the most money (the optimal batch) for a given target.
//  * Without considering the ram usage.
//  * */ 

// export function getOptimalMoneyBatch(ns, target) {
//     const hackPart = ns.hackAnalyze(target)
//     if (hackPart == 0) {
//         return new Threads()
//     }

//     const hackForHalf = Math.floor(0.5 / hackPart)
//     let threads = new Threads(hackForHalf, 0, 0)

//     const moneyStolenP = ns.hackAnalyze(target) * threads.hack
//     const neededMoneyIncD = 1 / (1 - moneyStolenP)

//     threads.grow = ns.growthAnalyze(target, neededMoneyIncD)
//     threads.grow = Math.ceil(threads.grow)

//     let secInc = 0
//     secInc += ns.hackAnalyzeSecurity(threads.hack)
//     secInc += ns.growthAnalyzeSecurity(threads.grow)

//     threads.weaken = secInc / ns.weakenAnalyze(1)
//     threads.weaken = Math.ceil(threads.weaken)

//     return threads
// }



/**
 * @param {NS} ns 
 * @param {String} target 
 * @returns {Threads}
 * 
 * Gets the batch that will get the most money (the optimal batch) for a given target.
 * Without considering the ram usage.
 * */ 

export function getOptimalMoneyBatch(ns, target) {
    return getBestMoneyBatch(ns, target, Infinity)
}


import { RamUsage, Threads, distributeThreads } from "HybridShotgunBatcher/Helpers"


import { BatchData, WGHData } from "HybridShotgunBatcher/Dashboard/DataClasses"


/** 
 * @param {NS} ns 
 * @returns a Batch dataClass instance
*/
export async function startBatch(ns,
    target,
    batch,
    execTime = null
) {
    // returns if the 

    const wTime = ns.getWeakenTime(target)
    const gTime = ns.getGrowTime(target)
    const hTime = ns.getHackTime(target)

    /**   
     * now W G    H  execTime
     *  v  v v    v     v 
     *  |--I-----------|
     *  |----I--------|
     *  |---------I--|
     *  |-|          |-|
     *  Msec      2 * WGHMargin
     *               |--|
     *            3 * WGHMargin
     * (Msec i.e additionalMsec)
     */


    const toExec = execTime ? execTime - Date.now() : wTime + WGHMargin

    const toWStart = toExec - wTime - WGHMargin * 1
    const toGStart = toExec - gTime - WGHMargin * 2
    const toHStart = toExec - hTime - WGHMargin * 3

    // ns.printf("starting hack with %i", threads.hack)
    // ns.printf("  start   : %f", toHStart)
    // ns.printf("  duration: %f", ((toHStart + hTime) / 1000).toFixed(3))
    // ns.printf("  end     : %f", toHStart + hTime)
    // ns.print("")

    // ns.printf("starting grow with %i", threads.grow)
    // ns.printf("  start   : %f", toGStart)
    // ns.printf("  duration: %f", ((toGStart + gTime) / 1000).toFixed(3))
    // ns.printf("  end     : %f", toGStart + gTime)
    // ns.print("")

    // ns.print("")
    // ns.printf("starting weaken with %i", threads.weaken)
    // ns.printf("  start   : %f", toWStart)
    // ns.printf("  duration: %f", ((toWStart + wTime) / 1000).toFixed(3))
    // ns.printf("  end     : %f", toWStart + wTime)
    // ns.print("")

    if (toWStart < 0 | toGStart < 0 | toHStart < 0) {
        const errorMsg =
            "execTime to small \n"
            + "toWStart: " + toWStart + "\n"
            + "toGStart: " + toGStart + "\n"
            + "toHStart: " + toHStart + "\n"
            + "toExec: " + toExec + "\n"
            + "execTime: " + execTime + "\n"
            + "wTime: " + wTime + "\n"

        // execTime to small
        ns.print("didn't start batch, " + errorMsg)

        ns.tail()
        // return false
        throw new Error(errorMsg)
    }

    // ns.printf("starting batch at %i", Date.now())
    // ns.printf("    to launch %i", toWStart)
    // ns.printf("    to exec %i", toExec)
    // ns.printf("    launch time %i", Date.now() + toWStart)
    // ns.printf("    exec time %i", execTime)

    // ns.tprint(toWStart)
    // ns.tprint(deltaWStart, " ", deltaGStart, " ", deltaHStart)
    distributeThreads(ns,
        "HybridShotgunBatcher/ThreadScripts/Weaken.js",
        batch.weaken,
        target,
        toWStart,
        Date.now() + toExec + wTime)

    distributeThreads(ns,
        "HybridShotgunBatcher/ThreadScripts/Grow.js",
        batch.grow,
        target,
        toGStart,
        Date.now() + toExec + gTime)

    distributeThreads(ns,
        "HybridShotgunBatcher/ThreadScripts/Hack.js",
        batch.hack,
        target,
        toHStart,
        Date.now() + toExec + hTime)


    // data things
    const wData = new WGHData(
        "weaken",
        wTime,
        batch.weaken,
        toWStart - toWStart,
    )

    const gData = new WGHData(
        "grow",
        gTime,
        batch.grow,
        toGStart - toWStart,
    )

    const hData = new WGHData(
        "hack",
        hTime,
        batch.hack,
        toHStart - toWStart,
    )

    const batchData = new BatchData(
        wData,
        gData,
        hData
    )

    return batchData
}

