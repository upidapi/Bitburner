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

function getNextSecHole(time=null) {
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

    while (true) {
        // calculate avalibleShels
        const avalibleRam = getAvailableRam(ns, servers)
        const maxBatches = Math.floor(avalibleRam / batchRamUsage)

        const batchStartTime = getNextSecHole()
        
        // sleep untill the low sec hole
        await ns.sleep(batchStartTime - Date.now())

        const nextLowSecStart = getNextSecHole()
        
        // the time the batch shuld be fully compleate
        let batchExecTime = nextLowSecStart - sleepMargin 

        for (let i = 0; i < maxBatches; i++) {
            if (batchExecTime - Date.now() - ns.getWeakenTime(target) > sleepMargin) {
                // the batch will be lanched after the next batch starts to execute
                // therefour go the next batch now

                // i.e sleep untill the next low sec hole
                batchStartTime = getNextSecHole(batchStartTime)
                await ns.sleep(batchStartTime - Date.now())

                continue
            }

            const sucsesSatus = await startBatch(ns, 
                target, 
                fullBatchThreads, 
                servers, 
                batchExecTime)
                
            if (sucsesSatus == -1) {
                // one of the aditionalMsec where negative
                // i.e batchExecTime is to smal

                // get the next nextLowSecStart after batchExecTime
                nextLowSecStart = getNextSecHole(nextLowSecStart)
        
                // the time the batch shuld be fully  
                batchExecTime = nextLowSecStart - sleepMargin 
                break
            } 

            batchExecTime -= minDeltaBatchExec

        }
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
