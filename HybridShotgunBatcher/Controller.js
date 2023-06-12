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


import { startBatch } from "HybridShotgunBatcher/Helpers"
import { getAvailableRam } from "HybridShotgunBatcher/Helpers"


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
