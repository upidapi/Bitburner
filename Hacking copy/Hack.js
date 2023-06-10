/**
 * full hack
 * needs a lot of ram (32bg min)
 * and at least accses to two servers 
 */


import { getServers } from "Other/ScanServers.js"
import { estimateX } from "Helpers/EstimateX.js"
import { bigFormatNum } from "Helpers/Formatting.js"
// // import getAvalibleRam from "helpers.js"


/** @param {NS} ns */
export function distributeThreads(ns, servers, script_name, threads, ...args) {
    // distrubutes the script over multiple servers to get a total threads "threads"
    if (threads == 0) {
        return
    }

    const scriptRam = ns.getScriptRam(script_name)

    let serversAndRam = servers.map(server => [server, ns.getServerMaxRam(server) - ns.getServerUsedRam(server)])
    // sort servers_and_ram so that it tries the larges servers first
    serversAndRam.sort((a, b) => (b[1] - a[1]))

    // ns.tprint(serversAndRam[0], serversAndRam.slice(-1))
    for (let i = 0; i <servers .length; i++) {
        let serverName = serversAndRam[i][0]
        let serverRam = serversAndRam[i][1]

        if (serverName == ns.getHostname()) {
            continue
        }

        if (!ns.hasRootAccess(serverName)) {
            continue
        }

        let maxThreads = Math.floor(serverRam / scriptRam)
        let handledThreads = Math.min(maxThreads, threads)
        // disThreads i.e distrubuted threads
        threads -= handledThreads

        if (handledThreads == 0) {
            continue
        }

        ns.scp(script_name, serverName)
        ns.exec(script_name, serverName, handledThreads, ...args)

        if (threads == 0) {
            return
        }
    }

    serversAndRam = servers.map(server => [server, ns.getServerMaxRam(server) - ns.getServerUsedRam(server)])
    // sort servers_and_ram so that it tries the larges servers first
    serversAndRam.sort((a, b) => (b[1] - a[1]))

    console.log("---------")
    ns.tprint("test", servers, servers.length)
    for (let i = 0; i < servers.length; i++) {
        console.log(serversAndRam[0], serversAndRam[1], serverName != ns.getHostname(), ns.hasRootAccess(serverName))
        ns.tprint(serversAndRam[0], serversAndRam[1], serverName != ns.getHostname(), ns.hasRootAccess(serverName))
    }

    throw new Error("not enough ram on servers")
}

const WGHMargin = 2


const RamUsage = {
    "hack": 1.70, // ns.getScriptRam("Hacking/ThreadScripts/ThreadHack.js")
    "grow": 1.75, // ns.getScriptRam("Hacking/ThreadScripts/ThreadHack.js")
    "weaken": 1.75 // ns.getScriptRam("Hacking/ThreadScripts/ThreadHack.js")
}

// ram is only reserved in scheduleWGH, it's reserved for an async section
// it can therefor not be unreserved normally
// insted the reserved ram amounts are stored here along with theit expiration date
// when that time is reatched it will be automatically unreserved (removed from this list)
var reservedRam = []

function getReservedRam() {
    let unexpierdReservedRam = []
    let totReservedRam = 0

    for (let i = 0; i < reservedRam.length; i++) {
        const item = reservedRam[i]
        const expirationTime = item[0]

        if (expirationTime < Date.now()) {
            // has expierd
            continue
        }

        unexpierdReservedRam.push(item)

        totReservedRam += item[1]
    }

    return totReservedRam
}

/** @param {NS} ns */
export function getThreadingServers(ns) {
    const hoastName = ns.getHostname()

    const allServers = getServers(ns)
    const avalibleServers = []

    for (let i = 0; i < allServers.length; i++) {
        const serverName = allServers[i]

        if (!ns.hasRootAccess(serverName)) {
            continue
        }

        if (serverName == hoastName) {
            // due to stability reasones the script realy shuld not spawn "wgh threads" on the server it's on
            continue
        }

        const avalibeRam = ns.getServerMaxRam(serverName) - ns.getServerUsedRam(serverName) - 2
        if (avalibeRam <= 0) {
            continue
        }

        avalibleServers.push(serverName)
    }

    return avalibleServers
}

/** @param {NS} ns */
export function getAvalibleRamWGH(ns) {
    const servers = getThreadingServers(ns)

    let serverAvalibleRam = 0

    const hoasName = ns.getHostname()
    for (let i = 0; i < servers.length; i++) {
        let server_name = servers[i]

        if (!ns.hasRootAccess(server_name)) {
            continue
        }

        if (server_name == hoasName) {
            // due to stability reasones the script realy shuld not spawn "wgh threads" on the server it's on
            continue
        }

        let avalibeRam = ns.getServerMaxRam(server_name) - ns.getServerUsedRam(server_name)

        // remove 2 gb from each server

        // if we don't do this the avalible ram might spread out on several servers 
        // ex (server 1) ram: 1, (server 2) ram: 1, (server 3) ram: 1
        // this would result in a total avalible ram of 3.
        // that would make it beleave it has space for another hack thread (1.6 gb of ram)
        // but no server has enough ram fo it 
        // resulting in the proces chrashing

        // threrfor we remove ram from the avalible ram
        let avalibeRamWithMargins = Math.max(0, avalibeRam - 2)

        serverAvalibleRam += avalibeRamWithMargins
    }

    const totAvalibleRam = serverAvalibleRam - getReservedRam()
    // due to the reserved ram safty the total used ram might be "more" than the total avalibe
    return Math.max(0, totAvalibleRam)
}

var usedRam = []

/** @param {NS} ns */
async function waitTilMoreRamAvalible(ns) {

    const sortedUsedRam = usedRam.sort((a, b) => {
        return a[0] - b[0]
    })

    for (let i = 0; i < sortedUsedRam.length; i++) {
        const expirationTime = sortedUsedRam[i][0]

        if (expirationTime < Date.now()) {
            // has expierd
            continue
        }

        await ns.sleep(expirationTime - Date.now() + 5)
        return true
    }

    return false
}


/** 
 * @param {NS} ns 
 * @param {Threads} threads
 * @param {Str} target
 * */
export function scheduleWGH(ns, target, threads) {
    // calles the hack, grow, weaken such that it avoids the time inc from hack and grow

    /** 
     * specifically it calls hack, grow, weaken in an order and time such that
     * the time penalty for the increased security can be side stepped
     */


    /** the hack, grow, weaken have difernent exec times
     * weaken => 4x
     * grow => 3.2x
     * hack => 1x
     */
    const weakenTime = ns.getWeakenTime(target)
    const growTime = ns.getGrowTime(target)
    const hackTime = ns.getHackTime(target)

    // time from when weaken starts to when grow starts
    const delta_grow_start = weakenTime - growTime + 5

    // time from when grow starts to when hack starts
    const delta_hack_start = weakenTime - delta_grow_start - hackTime + 5

    var ramToBeReserved = 0
    ramToBeReserved += threads.weaken * RamUsage.weaken
    ramToBeReserved += threads.grow * RamUsage.grow
    ramToBeReserved += threads.hack * RamUsage.hack

    // margin
    reservedRam.push([Date.now() + delta_grow_start + 5, threads.grow * RamUsage.grow])
    reservedRam.push([Date.now() + delta_grow_start + delta_hack_start + 5, threads.hack * RamUsage.hack])

    usedRam.push([Date.now() + weakenTime + 5, ramToBeReserved])

    ns.run("Hacking/AsyncScheduleWGH.js", 1,
        target,
        threads.weaken,
        threads.grow,
        threads.hack
    )
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

    floor() {
        this.hack = Math.floor(this.hack)
        this.grow = Math.floor(this.grow)
        this.weaken = Math.floor(this.weaken)
    }
}

/** @param {NS} ns */
export function getMaxHackThreads(ns, target, avalibleRam) {
    // returns maxThreads, maxCycles, isOptimalThreads
    // maxThreads := how many threads of each you can have per cycle
    // maxCycles := how many paralell cycles can be run at once
    // isOptimalThreads := is the amount of threads you can have per cycle limited by the server money


    function hackThreadsToRam(hackThreads) {
        threads.hack = hackThreads

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

    // hack
    // calculate start max threads
    const hackPart = ns.hackAnalyze(target)
    if (hackPart == 0) {
        return [new Threads(), 1, false]
    }

    const hackForHalf = 0.5 / hackPart
    let threads = new Threads()
    // const ramForHalf = hackThreadsToRam(hackForHalf)

    // nothing is set to the result since it alredy sets the properties of "threads"

    // if the margin is less than 4 (larger than -4) can leed to it 
    // getting stuck due to the rounding of threads in hackThreadsToRam()
    const usedRamPerCycle = estimateX(ns, hackThreadsToRam, avalibleRam, 0, hackForHalf, -10, 0)

    threads.hack = Math.floor(threads.hack)

    if (threads.ramUsage() == 0) {
        return [threads, 1, false]
    }

    const mul = Math.floor(avalibleRam / threads.ramUsage())

    const isOptimalThreads = hackForHalf - threads.hack <= 1

    return [threads, mul, isOptimalThreads]
}

/** @param {NS} ns */
async function hackServer(ns, target, avalibleRam) {
    // hack
    // calculate start max threads
    const returnVal = getMaxHackThreads(ns, target, avalibleRam)
    const threads = returnVal[0]

    if (threads.ramUsage() == 0) {
        return false
    }

    const nMultiThreads = returnVal[1]

    const threadExecTime = ns.getWeakenTime(target)
    const maxMultiThreads = Math.ceil(threadExecTime / 10) // don't start threads faster than "10 per sec" (100ms inbetween)
    const multiThreads = Math.min(maxMultiThreads, nMultiThreads)
    const deltaExecHack = threadExecTime / multiThreads

    const expextedMoney = ns.getServerMaxMoney(target) * ns.hackAnalyze(target) * threads.hack * multiThreads
    ns.printf("hacking server with:")
    ns.printf("    " + threads.hack + " hack threads")
    ns.printf("    " + threads.grow + " money correcing threads")
    ns.printf("    " + threads.weaken + " security correcting threads")
    ns.printf("    times " + multiThreads + " instaces")
    ns.printf("    expected gain: $" + bigFormatNum(expextedMoney))


    for (let i = 0; i < multiThreads; i++) {
        scheduleWGH(ns, target, threads)
        ns.printf("started multi thread " + i + " waiting " + Math.floor(deltaExecHack / 1000) + " seconds til next")
        await ns.sleep(deltaExecHack)
    }

    await ns.sleep(5)
    // might whant to somehow indicate if it has reatched max speed
}

/** @param {NS} ns */
export async function startAtack(ns, target) {
    ns.disableLog("ALL")

    reservedRam = []

    let servers = getServers(ns)
    // fix the server money and security
    while (true) {
        await ns.sleep(100)

        let avalibleRam = getAvalibleRamWGH(ns, ...servers)
        if (avalibleRam == 0) {
            continue
        }

        if (! await fixSecurity(ns, target, avalibleRam)) {
            continue
        }

        avalibleRam = getAvalibleRamWGH(ns, ...servers)
        if (avalibleRam == 0) {
            continue
        }

        if (! await fixMoney(ns, target, avalibleRam)) {
            continue
        }

        break
    }

    while (true) {
        ns.getServer
        const avalibleRam = getAvalibleRamWGH(ns, ...servers)
        if (avalibleRam == 0) {
            continue
        }

        const returnVal = getMaxHackThreads(ns, target, avalibleRam)
        const threads = returnVal[0]

        if (threads.ramUsage() == 0) {
            waitTilMoreRamAvalible(ns)
            continue
        }

        const isOptimalThreads = returnVal[2]
        if (!isOptimalThreads) {
            // dont alow multiple cycles at the same time if the last one wasn't max
            if (await waitTilMoreRamAvalible(ns)) {
                // try to wait til there is more avalible ram
                continue
            }
            // if there no more ram that will be freed continue on anyways
        }

        lastMaxHack = isOptimalThreads

        scheduleWGH(ns, target, threads)

        if (isOptimalThreads) {
            await ns.sleep(200)
        } else {
            ns.printf("started imperfect cycle:")
            ns.printf("    " + threads.hack + " hack threads")
            ns.printf("    " + threads.grow + " money correcing threads")
            ns.printf("    " + threads.weaken + " security correcting threads")
            // await ns.sleep(ns.getWeakenTime(target))
            await ns.sleep(200)
        }
    }
}

// run Hacking/Hack.js n00dles

/** @param {NS} ns */
function killAll(ns, ...servers) {
    // expected to be run on the same server as Hack.js

    const hoastName = ns.getHostname()
    for (let i = 0; i < servers.length; i++) {
        const server_name = servers[i]

        ns.scriptKill("Hacking/ThreadScripts/Grow.js", server_name)
        ns.scriptKill("Hacking/ThreadScripts/Hack.js", server_name)
        ns.scriptKill("Hacking/ThreadScripts/Weaken.js", server_name)
    }

    ns.scriptKill("Hacking/AsyncScheduleWGH.js", hoastName)
    ns.exit()
}

/** @param {NS} ns */
export async function main(ns) {
    // ns.enableLog("sleep")
    const target = ns.args[0]

    await startAtack(ns, target)
}