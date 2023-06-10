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
    maxShotgunShels
} from "Hacking copy/Settings"


/** @param {NS} ns */
async function waitTilLowSec(ns, deltaLowSecStart) {
    // garantees that we wil be in a low sec hole when function returns

    const toLowBefore = (Date.now() - deltaLowSecStart + lowSecHoleTime) % execMargin
    const toNextLowSecHole = execMargin - toLowBefore

    if (toNextLowSecHole > 0) [
        ns.sleep(toNextLowSecHole)
    ]
}

/** @param {NS} ns */
async function startBatch(ns,
    threads,
    startTime,
    servers) {

    const wTime = ns.getWeakenTime()
    const gTime = ns.getGrowTime()
    const hTime = ns.getHackTime()

    const now = Date.now()

    /**   
     *    W G    H
     *    v v    v 
     * |--I-----------|
     * |----I--------|
     * |---------I--|
     *              |-|
     *          2 * WGHMargin
     */


    const deltaWStart = startTime - now
    const deltaGStart = deltaWStart + wTime - gTime - WGHMargin
    const deltaHStart = deltaGStart + wTime - hTime - 2 * WGHMargin

    distributeThreads(ns, servers,
        "Hacking-copy/ThreadScripts/Weaken.js",
        threads.weaken,
        target,
        deltaWStart)
    distributeThreads(ns, servers,
        "Hacking-copy/ThreadScripts/Grow.js",
        threads.grow,
        target,
        deltaGStart)
    distributeThreads(ns, servers,
        "Hacking-copy/ThreadScripts/Hack.js",
        threads.hack,
        target,
        deltaHStart)
}

/** @param {NS} ns */
async function hybridShotgunLoop(ns, target, fullBatchThreads) {
    const batchRamUsage = fullBatchThreads.ramUsage()

    const servers = getServers(ns)

    const WeakenTime = ns.getWeakenTime(target)
    // time from epoch to first lowSecHole
    const deltaLowSecStart = (Date.now() + WeakenTime) % execMargin

    while (true) {
        // calculate avalibleShels
        const avalibleRam = getAvalibleRam(ns, servers)
        const maxBatches = Math.floor(avalibleRam / batchRamUsage)

        const shotgunShels = Math.min(maxBatches, maxShotgunShels)

        const firstStartTime = Date.now() + execMargin

        // wait till the next lowSecHole
        await waitTilLowSec(ns, deltaLowSecStart)

        ns.tprint(firstStartTime)
        let batchStartTime = firstStartTime
        for (let i = 0; i < shotgunShels; i++) {
            await startBatch(ns, fullBatchThreads, batchStartTime, servers)
            batchStartTime += minDeltaBatchExec
        }
    }
}

import { fixServer } from "Hacking copy/SetupServer"
import { getMaxHackThreads } from "Hacking copy/CalcMaxBatchSize"
import { distributeThreads, getAvalibleRam } from "Hacking copy/Helpers"
import { getServers } from "Other/ScanServers"

/** @param {NS} ns */
export async function start(ns, target) {
    await fixServer(ns, target)

    const servers = getServers(ns)
    const availableRam = getAvalibleRam(ns, servers)
    const returnVal = getMaxHackThreads(ns, target, availableRam)
    const batchThreads = returnVal[0]
    const optimal = returnVal[2]

    if (!optimal) {
        ns.printf("the batchThreads are not optimal for the selected server (%s)", target)
    }

    // wont ever return
    await hybridShotgunLoop(ns, target, batchThreads)
}


