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
    startTime) {

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


    deltaWStart = startTime - now
    deltaGStart = deltaWStart + wTime - gTime - WGHMargin
    deltaHStart = deltaGStart + wTime - hTime - 2 * WGHMargin

    ns.run("Hacking-copy/ThreadScripts/Weaken.js", threads.weaken, target, deltaWStart)
    ns.run("Hacking-copy/ThreadScripts/Grow.js", threads.grow, target, deltaGStart)
    ns.run("Hacking-copy/ThreadScripts/Hack.js", threads.hack, target, deltaHStart)
}


// idk
async function permaHack(ns, target) {
    const minWeakenTime = ns.getWeakenTime(target)

    // time from epoch to first lowSecHole
    const deltaLowSecStart = (Date.now() + minWeakenTime) % execMargin
    // let firstStartTime = Date.now() + execMargin

    while (true) {
        // calculate avalibleShels
        const avalibleShels = 100
        const shotgunShels = Math.min(avalibleShels, maxShotgunShels)

        const firstStartTime = Date.now() + execMargin

        // wait till the next lowSecHole
        await waitTilLowSec(ns, deltaLowSecStart)

        ns.tprint(firstStartTime)
        let batchStartTime = firstStartTime
        for (let i = 0; i < shotgunShels; i++) {
            await startBatch(ns, "idk", batchStartTime)
            batchStartTime += minDeltaBatchExec
        }
    }
}




