/**
 * this is a hybrid shotgun controller
 * it controlls the batch starts
 */

import {
    execMargin,
    WGHMargin,
    // sleepMargin,
    lowSecHoleTime,
    minDeltaBatchExec,
    maxShotgunShels,
    sleepMargin
} from "HybridShotgunBatcher/Settings"


/** @param {NS} ns */
async function waitTilLowSec(ns, deltaLowSecStart) {
    // garantees that we wil be in a low sec hole when function returns

    const toLowBefore = (Date.now() - deltaLowSecStart + lowSecHoleTime) % execMargin
    const toNextLowSecHole = execMargin - toLowBefore

    await ns.asleep(toNextLowSecHole)
    return Date.now() + toNextLowSecHole
}

import { startBatch } from "HybridShotgunBatcher/Helpers"
import { getAvailableRam } from "HybridShotgunBatcher/Helpers"

/** @param {NS} ns */
async function hybridShotgunLoop(ns, target, fullBatchThreads) {
    const batchRamUsage = fullBatchThreads.ramUsage()

    ns.printf("batch size:")
    ns.printf("    " + fullBatchThreads.hack + " hack threads")
    ns.printf("    " + fullBatchThreads.grow + " money correcing threads")
    ns.printf("    " + fullBatchThreads.weaken + " security correcting threads")
    // ns.printf("    times " + multiThreads + " instaces")
    // ns.printf("    expected gain: $" + bigFormatNum(expextedMoney))


    const servers = getServers(ns)

    // ns.tprint(servers)

    const WeakenTime = ns.getWeakenTime(target)
    // time from epoch to first lowSecHole
    const deltaLowSecStart = (Date.now() + WeakenTime) % execMargin

    while (true) {
        // calculate avalibleShels
        const avalibleRam = getAvailableRam(ns, servers)
        const maxBatches = Math.floor(avalibleRam / batchRamUsage)

        const shotgunShels = Math.min(maxBatches, maxShotgunShels)

        // wait till the next lowSecHole
        const nextLowSecStart = await waitTilLowSec(ns, deltaLowSecStart)
        const firstStartTime = nextLowSecStart + 100

        // ns.tprint(firstStartTime)
        let batchStartTime = firstStartTime
        for (let i = 0; i < shotgunShels; i++) {
            await startBatch(ns, target, fullBatchThreads, servers, batchStartTime)
            batchStartTime += minDeltaBatchExec
        }
    }
}

function getNextSecHole(time = null) {
    time = time ?? Date.now()

    // gets the start time of the next sec hole
    // the nextHole is awlays larger than time

    const a = (time + sleepMargin) / execMargin
    const n = Math.floor(Math.floor(a + 1))
    const nextHole = execMargin * n - sleepMargin

    return nextHole
}


/** @param {NS} ns */
async function waitTilNextLowSec(ns) {
    // sleeps til next sec hole start (but inacuracies will make it sleep into the sleepMargin)
    // if at the edge of the start of a sec hole, it sleepts to the next
    // the sleep amounts (passed to ns.sleep) shuld always be larger then 0

    const sleepTime = getNextSecHole() - Date.now()

    // only for testing
    if (sleepTime <= 0) {
        throw new Error("sleep time to low (" + sleepTime + ")")
    }

    ns.sleep(sleepTime)
}

/** @param {NS} ns */
async function v2(ns, target, fullBatchThreads) {
    const batchRamUsage = fullBatchThreads.ramUsage()

    ns.printf("batch size:")
    ns.printf("    " + fullBatchThreads.hack + " hack threads")
    ns.printf("    " + fullBatchThreads.grow + " money correcing threads")
    ns.printf("    " + fullBatchThreads.weaken + " security correcting threads")
    // ns.printf("    times " + multiThreads + " instaces")
    // ns.printf("    expected gain: $" + bigFormatNum(expextedMoney))

    const servers = getServers(ns)

    let shotgunStartTime = getNextSecHole()

    // todo maby add a mergin here
    let shotgunLastExecTime = getNextSecHole(Date.now() + ns.getWeakenTime(target))

    while (true) {
        // calculate avalibleShels
        const avalibleRam = getAvailableRam(ns, servers)
        const maxBatches = Math.floor(avalibleRam / batchRamUsage)

        // the time the batch shuld be fully compleate
        let batchExecTime = shotgunLastExecTime

        // a shotgun is a group of sheduled batch execs folowed by a low sec hole
        /**
         * security:
         *                        low sec hole                 low sec hole
         *                         |--------|                   |--------|
         * __________--------------__________-------------------__________----------------__________
         * __________                                                 
         *     start                                          exec
         *       v                                             v
         *     1 |--------------------I--------------------I---|
         *     2 |----------------I--------------------I---|        
         *     3 |------------I--------------------I---|           
         *     4 |------I--------------------I---|        
         *                               I---I    
         *                                 ^
         *     trying a 5th here would make it impeetch on the low sec hole
         *   
         * 
         *     therefor wait untill the next sec hole (this it the "if (sucsesSatus == -1)" part)
         *                               start                                          exec
         *                                 v                                             v
         *                               5 |--------------------I--------------------I---|
         *                               6 |----------------I--------------------I---|
         *                               7 |------------I--------------------I---|
         *                               8 |------I--------------------I---|
         * 
         *      start                                                             exec
         *       v                                                                  v
         *     1 |-----------------------------------------I--------------------I---|
         *     2 |-------------------------------------I--------------------I---|        
         *     3 |---------------------------------I--------------------I---|           
         *     4 |---------------------------I--------------------I---|        
    
         *      |------|
         *  if this time (i.e aSec) before the "firet one"
         *        
         *      |--------------------------|
         *  is larger than this time (i.e the execTime) might aswell move the start
         *  (but not the exec forward to the next hole)
         * 
         *  that would become this => 
         *                               start                                     exec
         *                                 v                                        v
         *                                 |---------------I--------------------I---|
         *                                 |-----------I--------------------I---|        
         *                                 |-------I--------------------I---|           
         *                                 |-I--------------------I---|       
         * 
         * this it the "if (smalesBatchExecTime - Date.now() - ns.getWeakenTime(target) > execMargin)" part
         */

        const smalesBatchExecTime = shotgunLastExecTime - maxShotgunShels * minDeltaBatchExec

        if (smalesBatchExecTime - Date.now() - ns.getWeakenTime(target) > execMargin) {
            // the first batch will be lanched after the next shotgun starts
            // therefour we might as well go to the next shotgun start now

            // i.e sleep untill the next low sec hole
            shotgunStartTime = getNextSecHole(shotgunStartTime)
            await ns.sleep(shotgunStartTime - Date.now())

            continue
        }

        // lanch batches in shotgun
        for (let i = 0; i < maxBatches; i++) {
            const sucsesSatus = await startBatch(ns,
                target,
                fullBatchThreads,
                servers,
                batchExecTime)

            if (sucsesSatus == -1) {
                // one of the aditionalMsec where negative
                // i.e batchExecTime is to smal

                // only way to increase batchExecTime is to go to the next shotgun

                // + sleepMargin is for getting to the 
                break
            }

            batchExecTime -= minDeltaBatchExec

        }

        // let the execTime go to next low sec hole and start a new shotgun there
        shotgunLastExecTime += execMargin
    }
}

/** @param {NS} ns */
async function v2(ns, target, fullBatchThreads) {
    const batchRamUsage = fullBatchThreads.ramUsage()

    ns.printf("batch size:")
    ns.printf("    " + fullBatchThreads.hack + " hack threads")
    ns.printf("    " + fullBatchThreads.grow + " money correcing threads")
    ns.printf("    " + fullBatchThreads.weaken + " security correcting threads")
    // ns.printf("    times " + multiThreads + " instaces")
    // ns.printf("    expected gain: $" + bigFormatNum(expextedMoney))

    const servers = getServers(ns)

    let secHoleStart = getNextSecHole(Date.now())
    ns.sleep(secHoleStart - Date.now())
    let execTime = getNextSecHole(Date.now() + ns.getWeakenTime(target))

    while (true) {
        const lowSecHoleEnd = secHoleStart + sleepMargin

        // ie the end of the secHole right before the execTime secHole
        // + WGHMargin (because it's the final exec time) 
        const firstBatchExecTime = execTime - execMargin + sleepMargin + WGHMargin

        const firstBatchLanch = firstBatchExecTime - ns.getWeakenTime(target)

        // the time from when the secHole ends to the time that the 
        // first batch in the shotgun lanches
        const firstBatchDeltaLanch = firstBatchLanch - lowSecHoleEnd

        // firstBatchDeltaLanch beeing larger than execMargin would mean that 
        // we are basically pre fiering the next shotgun's batches.
        // Doing that would just waste ram, whithout any upside therefour 
        // wait til the next shotgun to fire those batches if that happens
        // i.e skip this shotgun and just go the next (whithout increasing the 
        // execTime) 
        if (firstBatchDeltaLanch < execMargin) {
            // calculate maxShells for shotgun
            const avalibleRam = getAvailableRam(ns, servers)

            const maxShellsForRam = Math.floor(avalibleRam / batchRamUsage)

            const maxShellsForTime = maxShotgunShels

            const maxShells = Math.min(maxShellsForRam, maxShellsForTime)

            for (let i = 0; i < maxShells; i++) {
                const batchExecTime = execTime - i * WGHMargin

                const sucsesSatus = await startBatch(ns,
                    target,
                    fullBatchThreads,
                    servers,
                    batchExecTime)

                if (!sucsesSatus) {
                    // batchExecTime to smal =>
                    // go to next shotgun
                    break
                }
            }

            // push the folowing batches to the next shotgun
            execTime += execMargin
        }

        // go to the next shotgun start
        let secHoleStart = getNextSecHole(secHoleStart)
        ns.sleep(secHoleStart - Date.now())
    }
}


import { fixServer } from "HybridShotgunBatcher/SetupServer"
import { getMaxHackThreads } from "HybridShotgunBatcher/CalcMaxBatchSize"
import { getServers } from "Other/ScanServers"

/** @param {NS} ns */
export async function start(ns, target) {
    ns.tprintf("started hacking %s", target)

    await fixServer(ns, target)

    const servers = getServers(ns)
    // ns.print(servers)

    const availableRam = getAvailableRam(ns, servers)
    const returnVal = getMaxHackThreads(ns, target, availableRam)
    const batchThreads = returnVal[0]
    const optimal = returnVal[2]

    if (!optimal) {
        ns.printf("the batchThreads are not optimal for the selected server (%s)", target)
    }

    // wont ever return
    await v2(ns, target, batchThreads)
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")
    const target = ns.args[0]

    await start(ns, target)
}
