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
async function hybridShotgunLoop(ns, target, fullBatchThreads, loggingPortHandle) {
    const batchRamUsage = fullBatchThreads.ramUsage()

    ns.printf("batch size:")
    ns.printf("    " + fullBatchThreads.hack + " hack threads")
    ns.printf("    " + fullBatchThreads.grow + " money correcing threads")
    ns.printf("    " + fullBatchThreads.weaken + " security correcting threads")
    // ns.printf("    times " + multiThreads + " instaces")
    // ns.printf("    expected gain: $" + bigFormatNum(expextedMoney))

    const servers = getServers(ns)

    let secHoleStart = getNextSecHole(Date.now())
    await ns.sleep(secHoleStart - Date.now())
    let execTime = getNextSecHole(Date.now() + ns.getWeakenTime(target))

    while (true) {
        if (Date.now() - secHoleStart > sleepMargin) {
            // the sleepMargin was surpassed
            // i.e the sleep time inacuraccy was larger than the sleepMargin 

            ns.print("the sleepMargin was surpassed:")
            ns.print("  after low sec start " + (Date.now() - secHoleStart))
            ns.print("  after low sec end " + (Date.now() - secHoleStart - sleepMargin))

            const oldHole = secHoleStart
            const oldTime = Date.now()

            secHoleStart = getNextSecHole(Date.now())
            await ns.sleep(secHoleStart - Date.now())

            ns.print(`oldHole:     ${oldHole}`)
            ns.print(`nextHole:    ${secHoleStart}`)
            ns.print(`sleepTime:   ${secHoleStart - oldTime}`)
            ns.print(`actuallTime: ${Date.now() - oldTime}`)

        }

        if (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) {
            const errorMsg =
                "securrity to high ("
                + ns.getServerSecurityLevel(target).toFixed(2)
                + "/"
                + ns.getServerMinSecurityLevel(target).toFixed(2)
                + ")"

            ns.print(errorMsg)

            ns.tail()

            throw new Error(errorMsg)
        }

        const lowSecHoleEnd = secHoleStart + lowSecHoleTime

        // ie the end of the secHole right before the execTime secHole
        // + WGHMargin (because it's the final exec time) 
        const firstBatchExecTime = execTime - minDeltaBatchExec * (maxShotgunShels - 1)

        // the "- WGHMargin" is due to that the weaken doesn't actually start 
        // ns.getWeakenTime(target) ms earlier since it is sheduled to be compleate 
        // at execTime - WGHMargin
        const firstBatchLanch = firstBatchExecTime - ns.getWeakenTime(target) - WGHMargin

        // the time from when the secHole ends to the time that the 
        // first batch in the shotgun lanches
        const firstBatchDeltaLanch = firstBatchLanch - lowSecHoleEnd

        if (firstBatchDeltaLanch < 0) {
            // we can't lanch a batch in the past

            // therefor push the exec time to the next possible 
            // time. i.e the next security hole
            execTime += execMargin

            ns.print("end shift")

            continue
        }

        if (firstBatchDeltaLanch > execMargin) {
            // firstBatchDeltaLanch beeing larger than execMargin would mean that 
            // we are basically pre fiering the next shotgun's batches.
            // Doing that would just waste ram, whithout any upside therefour 
            // wait til the next shotgun to fire those batches if that happens
            // i.e skip this shotgun and just go the next (whithout increasing the 
            // execTime) 

            ns.print("start shift")

            // go to the next shotgun start

            const oldHole = secHoleStart
            const oldTime = Date.now()

            secHoleStart = getNextSecHole(Date.now())
            await ns.sleep(secHoleStart - Date.now())

            ns.print(`oldHole:     ${oldHole}`)
            ns.print(`nextHole:    ${secHoleStart}`)
            ns.print(`sleepTime:   ${secHoleStart - oldTime}`)
            ns.print(`actuallTime: ${Date.now() - oldTime}`)

            continue
        }

        // calculate maxShells for shotgun
        const avalibleRam = getAvailableRam(ns, servers)

        const maxShellsForRam = Math.floor(avalibleRam / batchRamUsage)

        const maxShellsForTime = maxShotgunShels

        const maxShells = Math.min(maxShellsForRam, maxShellsForTime)

        ns.print("idk:")
        ns.print("  execTime:             " + execTime)
        ns.print("  lowSecHoleEnd:        " + lowSecHoleEnd)
        ns.print("  firstBatchExecTime:   " + firstBatchExecTime)
        ns.print("  firstBatchLanch:      " + firstBatchLanch)
        ns.print("  firstBatchDeltaLanch: " + firstBatchDeltaLanch)
        ns.print("  maxShells:            " + maxShells)
        ns.print("  maxShellsForTime:     " + maxShellsForTime)
        ns.print("  weaken time:          " + ns.getWeakenTime(target))
        ns.print("  now:                  " + Date.now())

        let batchData

        for (let i = 0; i < maxShells; i++) {
            const batchExecTime = firstBatchExecTime + i * minDeltaBatchExec

            batchData = await startBatch(ns,
                target,
                fullBatchThreads,
                servers,
                batchExecTime)
        }

        const sleepCorrector = lowSecHoleEnd - Date.now()

        const logEntry = new LogEntry(
            Date.now(),
            new ShotgunData(
                batchData,
                sleepCorrector,
                minDeltaBatchExec,
                maxShells
            ),
            "ShotgunData"
        )
            
        // ns.tprintf(logEntry.toStr())
        loggingPortHandle.write(logEntry.toStr())

        ns.print("shot " + maxShells + " shells at " + execTime.toFixed(0))

        // push the folowing batches to the next shotgun
        execTime += execMargin

        // go to the next viable low sec hole (i.e the next hole that is after Date.now())

        const oldHole = secHoleStart
        const oldTime = Date.now()

        secHoleStart = getNextSecHole(Date.now())
        await ns.sleep(secHoleStart - Date.now())

        ns.print(`oldHole:     ${oldHole}`)
        ns.print(`nextHole:    ${secHoleStart}`)
        ns.print(`sleepTime:   ${secHoleStart - oldTime}`)
        ns.print(`actuallTime: ${Date.now() - oldTime}`)
    }
}


import { fixServer } from "HybridShotgunBatcher/SetupServer"
import { getMaxHackThreads } from "HybridShotgunBatcher/CalcMaxBatchSize"
import { getServers } from "Other/ScanServers"
import { LogEntry, ShotgunData } from "HybridShotgunBatcher/Dashboard/DataClasses"

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

    ns.run("HybridShotgunBatcher/Dashboard/Dashboard.js", 1, ns.pid, target)

    // wont ever return
    await hybridShotgunLoop(ns, target, batchThreads, ns.getPortHandle(ns.pid))
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")
    ns.clearLog()
    const target = ns.args[0]

    await start(ns, target)
}
