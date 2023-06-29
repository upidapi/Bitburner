// the amount of ram to be reserved on host when distributing WGH threads 
const hostRamMargin = 100


import {
    execMargin,
    WGHMargin,
    // sleepMargin,
    lowSecHoleTime,
    minDeltaBatchExec,
    maxShotgunShells
} from "HybridShotgunBatcher/Settings"

export const RamUsage = {
    "hack": 1.70, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
    "grow": 1.75, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
    "weaken": 1.75 // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
}


export class Threads {
    constructor(hack = 0, grow = 0, weaken = 0) {
        this.hack = hack;
        this.grow = grow;
        this.weaken = weaken;
    }

    copy() {
        return Threads(this.hack, this.grow, this.weaken)
    }

    ramUsage() {
        let req_ram = 0

        req_ram += this.hack * RamUsage["hack"]
        req_ram += this.grow * RamUsage["grow"]
        req_ram += this.weaken * RamUsage["weaken"]

        return req_ram
    }
}


/** @param {NS} ns */
export function getServerAvailableRam(ns, server) {
    return ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
}


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
    const hostTotalAvailableRam = getServerAvailableRam(ns, hostName)
    const hostAvailableRam = Math.max(0, hostTotalAvailableRam - hostRamMargin)

    if (serverRam < hostAvailableRam) {
        return [...availableServers, hostName]
    }

    return availableServers
}

/** 
 * @param {NS} ns 
*/
function getServersAndRam(ns) {
    const servers = getAvailableWGHServers(ns)
    const hostName = ns.getHostname()

    const serversAndRam = []

    for (let i = 0; i < servers.length; i++) {
        const serverName = servers[i]
        const totServerRam = getServerAvailableRam(ns, serverName)
        let serverRam

        if (serverName == hostName) {
            // it's very annoying having no ram on hostName (home)
            // therefor reserve some ram on hostName (home)
            serverRam = totServerRam - hostRamMargin
        } else {

            // remove 2 gb from each server

            // if we don't do this the available ram might spread out on several servers 
            // ex (server 1) ram: 1, (server 2) ram: 1, (server 3) ram: 1
            // this would result in a total available ram of 3.
            // that would make it believe it has space for another hack thread (1.6 gb of ram)
            // but no server has enough ram fo it 
            // resulting in the process crashing

            // therefor we remove ram from the available ram
            serverRam = totServerRam - 2
        }

        serversAndRam.push([serverName, Math.max(0, serverRam)])
    }

    return serversAndRam
}


/** 
 * @param {NS} ns 
*/
function getServersAndMaxRam(ns) {
    const servers = getAvailableWGHServers(ns)
    const hostName = ns.getHostname()

    const serversAndRam = []

    for (let i = 0; i < servers.length; i++) {
        const serverName = servers[i]
        const totServerRam = ns.getServerMaxRam(serverName)
        let serverRam

        if (serverName == hostName) {
            // it's very annoying having no ram on hostName (home)
            // therefor reserve some ram on hostName (home)
            serverRam = totServerRam - hostRamMargin
        } else {

            // remove 2 gb from each server

            // if we don't do this the available ram might spread out on several servers 
            // ex (server 1) ram: 1, (server 2) ram: 1, (server 3) ram: 1
            // this would result in a total available ram of 3.
            // that would make it believe it has space for another hack thread (1.6 gb of ram)
            // but no server has enough ram fo it 
            // resulting in the process crashing

            // therefor we remove ram from the available ram
            serverRam = totServerRam - 2
        }

        serversAndRam.push([serverName, Math.max(0, serverRam)])
    }

    return serversAndRam
}

/** @param {NS} ns */
export function getMaxAvailableRam(ns) {
    const serversAndRam = getServersAndMaxRam(ns)

    let availableRam = 0

    serversAndRam.forEach(
        (x) => availableRam += x[1]
    )

    return availableRam
}


/** @param {NS} ns */
export function getAvailableRam(ns) {
    const serversAndRam = getServersAndRam(ns)

    let availableRam = 0

    serversAndRam.forEach(
        (x) => availableRam += x[1]
    )

    return availableRam
}


/** @param {NS} ns */
export function distributeThreads(ns, script_name, threads, ...args) {
    // distributes the script over multiple servers to get a total threads "threads"
    if (threads == 0) {
        return
    }

    const scriptRam = ns.getScriptRam(script_name)

    let serversAndRam = getServersAndRam(ns)
    // sort servers_and_ram so that it tries the larges servers first
    serversAndRam.sort((a, b) => (b[1] - a[1]))

    // ns.tprint(serversAndRam[0], serversAndRam.slice(-1))
    for (let i = 0; i < serversAndRam.length; i++) {
        // ns.print(serversAndRam[i])
        let serverName = serversAndRam[i][0]
        let serverRam = serversAndRam[i][1]

        let maxThreads = Math.floor(serverRam / scriptRam)
        let handledThreads = Math.min(maxThreads, threads)
        // disThreads i.e distributed threads
        threads -= handledThreads

        // ns.print(maxThreads, " ", handledThreads, " ", threads)

        if (handledThreads == 0) {
            continue
        }

        // ns.print(script_name, " ", serverName)

        ns.scp(script_name, serverName)
        ns.exec(script_name, serverName, handledThreads, ...args)

        if (threads == 0) {
            return
        }
    }

    serversAndRam = getServersAndRam(ns)
    // sort servers_and_ram so that it tries the larges servers first
    serversAndRam.sort((a, b) => (b[1] - a[1]))

    console.log("---------")
    ns.tprint("test", servers, servers.length)
    for (let i = 0; i < servers.length; i++) {
        let serverName = serversAndRam[i][0]

        console.log(serversAndRam[0], serversAndRam[1], serverName != ns.getHostname(), ns.hasRootAccess(serverName))
        ns.tprint(serversAndRam[0], serversAndRam[1], serverName != ns.getHostname(), ns.hasRootAccess(serverName))
    }

    throw new Error("not enough ram on servers")
}


import { WGHData, BatchData } from "HybridShotgunBatcher/Dashboard/DataClasses";
import { getServers } from "Other/ScanServers";


/** 
 * @param {NS} ns 
 * @returns a Batch dataClass instance
*/
export async function startBatch(ns,
    target,
    threads,
    servers,
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
        threads.weaken,
        target,
        toWStart,
        Date.now() + toExec + wTime)

    distributeThreads(ns,
        "HybridShotgunBatcher/ThreadScripts/Grow.js",
        threads.grow,
        target,
        toGStart,
        Date.now() + toExec + gTime)

    distributeThreads(ns,
        "HybridShotgunBatcher/ThreadScripts/Hack.js",
        threads.hack,
        target,
        toHStart,
        Date.now() + toExec + hTime)


    // data things
    const wData = new WGHData(
        "weaken",
        wTime,
        threads.weaken,
        toWStart - toWStart,
    )

    const gData = new WGHData(
        "grow",
        gTime,
        threads.grow,
        toGStart - toWStart,
    )

    const hData = new WGHData(
        "hack",
        hTime,
        threads.hack,
        toHStart - toWStart,
    )

    const batchData = new BatchData(
        wData,
        gData,
        hData
    )

    return batchData
}