/**
 * full hack
 * needs a lot of ram (32bg min)
 * and at least accses to two servers 
 */


import { getServers } from "Other/ScanServers.js"
import { estimateX } from "Helpers/EstimateX.js"
import { bigFormatNum } from "Helpers/Formatting.js"
// // import getAvalibleRam from "helpers.js"

var servers = []


/** @param {NS} ns */
export function distributeThreads(ns, script_name, threads, ...args) {
    // distrubutes the script over multiple servers to get a total threads "threads"
    if (threads == 0) {
        return
    }

    const scriptRam = ns.getScriptRam(script_name)

    let serversAndRam = servers.map(server => [server, ns.getServerMaxRam(server) - ns.getServerUsedRam(server)])
    // sort servers_and_ram so that it tries the larges servers first
    serversAndRam.sort((a, b) => (b[1] - a[1]))

    for (let i = 0; i < servers.length; i++) {
        let serverName = serversAndRam[i][0]
        let serverRam = serversAndRam[i][1]

        if (serverName == ns.getHostname()) {
            continue
        }

        if (!ns.hasRootAccess(serverName)) {
            continue
        }

        let maxThreads = Math.floor(serverRam / scriptRam)
        let disThreads = Math.min(maxThreads, threads)
        // disThreads i.e distrubuted threads
        threads -= disThreads

        if (disThreads == 0) {
            continue
        }

        ns.scp(script_name, serverName)
        ns.exec(script_name, serverName, disThreads, ...args)

        if (threads == 0) {
            return
        }
    }

    throw new Error("not enough ram on servers")
}

const w_g_h_margin = 5


// const high_sec_margin = 5

// // stores the end times of the high_sec_times 
// /**
//  * - 
//  * | start margin (5 ms)
//  * -
//  * | high sec time (10 ms)
//  * -
//  * | end margin (5 ms)
//  * - <= this is the stored time 
//  */
// var high_sec_times = []

// function check_high_sec_overlap(weaken_time, grow_time, hack_time) {
//   // not used

//   // check if any of the w_g_h start in a time of high_sec
//   const c_time = Date.now()
//   const high_sec_time_frame = 2 * w_g_h_margin + 2 * high_sec_margin

//   var new_high_sec_time = [weaken_time, grow_time, hack_time]
//   for (let i; i < high_sec_times.length; i++) {
//     var high_sec_time = high_sec_times[i]

//     // if its before the current time, remove it from high_sec_times
//     if (high_sec_time > c_time) {
//       new_high_sec_time.push()
//     }

//     var rel_time = high_sec_time - c_time - weaken_time

//     // check if any of the calls are inside the margins

//     // the w_g_h_margin is added since they are called with that spacing

//     any_indide_margins = ((rel_time) <= high_sec_time_frame) ||
//       ((rel_time + grow_time + w_g_h_margin) <= high_sec_time_frame) ||
//       ((rel_time + hack_time + w_g_h_margin * 2) <= high_sec_time_frame)

//     if (any_indide_margins) {
//       return false
//     }
//   }

//   return true
// }


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


/** 
 * @param {NS} ns 
 * @param {Threads} threads
 * @param {Str} target
 * */
function scheduleWGH(ns, target, threads) {
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
    let weakenTime = ns.getWeakenTime(target)

    var ramToBeReserved = 0
    ramToBeReserved += threads.grow * RamUsage.grow
    ramToBeReserved += threads.hack * RamUsage.hack

    // margin
    reservedRam.push([Date.now() + weakenTime + w_g_h_margin * 2 + 5, ramToBeReserved])

    ns.run("Hacking/AsyncScheduleWGH.js", 1,
        target,
        threads.weaken,
        threads.grow,
        threads.hack
    )
}


class Threads {
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


// const growMargin = 1.05
// const weakenMargin = 1.05
// no multiplicative marging
const growMargin = 1
const weakenMargin = 1


/** @param {NS} ns */
async function fixSecurity(ns, target, availableRam) {
    // fixes the security as mutch as possible 
    // returns true if the process to fix it will fully fix it or if it's already fixed

    const fromMin = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)

    if (fromMin != 0) {
        const optimalWeakenThreads = Math.ceil(fromMin / ns.weakenAnalyze(1))

        const maxWeakenThreads = Math.floor(availableRam / RamUsage["weaken"])

        const weakenThreads = Math.min(optimalWeakenThreads, maxWeakenThreads)

        const threads = new Threads(0, 0, weakenThreads)

        scheduleWGH(ns, target, threads)
        ns.printf("fixing security with " + weakenThreads + " threads")

        const optimal = (optimalWeakenThreads <= maxWeakenThreads)

        if (!optimal) {
            // if it´s not optimal don't allow for fixMoney at the same time
            await ns.sleep(ns.getWeakenTime(target) + w_g_h_margin + 5)
            return false
        }

        await ns.sleep(10) // make the effects of the function have time to take affect before the next
        return true
    }

    return true
}

/** @param {NS} ns */
async function fixMoney(ns, target, availableRam) {
    if (ns.getServerMoneyAvailable(target) != ns.getServerMaxMoney(target)) {
        // check if it has to be fixed

        function growPToRam(x) {
            threads.grow = Math.ceil(ns.growthAnalyze(target, x))

            let secInc = ns.growthAnalyzeSecurity(threads.grow)

            threads.weaken = secInc / ns.weakenAnalyze(1)
            threads.weaken = Math.ceil(threads.weaken)

            return threads.ramUsage()
        }

        // calculate start max threads
        const moneyLeftP = ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target)
        const maxMul = 1 / moneyLeftP

        let threads = new Threads()

        // nothing is set to the result since it alredy sets the properties of "threads"
        estimateX(ns, growPToRam, availableRam, 1, maxMul, 0, 0.1)

        // defined before rounding the threads
        const delta = ns.growthAnalyze(target, maxMul) + 1 - threads.grow

        scheduleWGH(ns, target, threads)

        ns.printf("fixing money with " + threads.grow + " growThreads and " + threads.weaken + " correcting weakenThreads")

        if (delta < 0.5) {
            // the grow is maximal
            await ns.sleep(10) // make the effects of the function have time to take affect before the next
            return true
        }

        await ns.sleep(ns.getWeakenTime(target) + w_g_h_margin + 5)
        return false
    }

    return true
}

/** @param {NS} ns */
export function getMaxHackThreads(ns, target, avalibleRam) {
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
        return [new Threads(), 1]
    }

    const hackForHalf = 0.5 / hackPart
    let threads = new Threads()
    // const ramForHalf = hackThreadsToRam(hackForHalf)

    // nothing is set to the result since it alredy sets the properties of "threads"

    // if the margin is less than 4 (larger than -4) can leed to it 
    // getting stuck due to the rounding of threads in hackThreadsToRam()
    estimateX(ns, hackThreadsToRam, avalibleRam, 0, hackForHalf, -4, 0)

    threads.hack = Math.floor(threads.hack)

    if (threads.ramUsage() == 0) {
        return [threads, 1]
    }

    const mul = Math.floor(avalibleRam / threads.ramUsage())

    return [threads, mul]
}

/** @param {NS} ns */
async function hackServer(ns, target, avalibleRam) {
    // hack
    // calculate start max threads
    const returnVal = getMaxHackThreads(ns, target, avalibleRam)
    const threads = returnVal[0]

    if (threads.ramUsage() == 0) {
        return
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
        ns.printf("started multi thread " + i + " waiting " + Math.floor(deltaExecHack / 1000) + " til next")
        await ns.sleep(deltaExecHack)
    }

    await ns.sleep(5)
    // might whant to somehow indicate if it has reatched max speed
}


/** @param {NS} ns */
export function getAvalibleRamWGH(ns, ...servers) {
    let totAvalibleRam = 0

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

        totAvalibleRam += avalibeRamWithMargins
    }

    return totAvalibleRam - getReservedRam()
}


/** @param {NS} ns */
export async function startAtack(ns, target) {
    ns.disableLog("ALL")

    reservedRam = []

    servers = getServers(ns)

    // fix the server money and security
    while (true) {
        let avalibleRam = getAvalibleRamWGH(ns, ...servers)
        if (! await fixSecurity(ns, target, avalibleRam)) {
            continue
        }

        avalibleRam = getAvalibleRamWGH(ns, ...servers)
        if (! await fixMoney(ns, target, avalibleRam)) {
            continue
        }

        avalibleRam = getAvalibleRamWGH(ns, ...servers)
        await hackServer(ns, target, avalibleRam)

        await ns.sleep(100)
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
