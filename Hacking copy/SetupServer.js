import { Threads, getAvalibleRam } from "Hacking copy/Helpers"
import { estimateX } from "Helpers/EstimateX"

/** @param {NS} ns */
export async function getRoot(ns, target) {
    if (ns.hasRootAccess(target)) {
      return true
    }
  
    const homePrograms = ns.ls("home")
    const portOpeners = []
  
    function addPossible(file_name, func) {
      if (homePrograms.indexOf(file_name) >= 0) {
        portOpeners.push(func)
      }
    }
  
    addPossible("BruteSSH.exe", ns.brutessh)
    addPossible("FTPCrack.exe", ns.ftpcrack)
    addPossible("relaySMTP.exe", ns.relaysmtp)
    addPossible("HTTPWorm.exe", ns.httpworm)
    addPossible("SQLInject.exe", ns.sqlinject)
  
    const portsReq = ns.getServerNumPortsRequired(target)
  
    if (portOpeners.length < portsReq) {
      return false
    }
  
    // iterate over all needed programs to get root
    for (let i = 0; i < portsReq; i++) {
      portOpeners[i](target)
    }
  
    ns.nuke(target)
  
    return true
  }
  
  /** @param {NS} ns */
  export async function main(ns) {
    const serverName = ns.args[0]
  
    return getRoot(ns, serverName)
  }

/** @param {NS} ns */
export async function fixSecurity(ns, target, availableRam) {
    // fixes the security as mutch as possible 
    // returns true if the process to fix it will fully fix it or if it's already fixed

    if (availableRam == 0) {
        return false
    }

    const fromMin = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)

    if (fromMin != 0) {
        const optimalWeakenThreads = Math.ceil(fromMin / ns.weakenAnalyze(1))

        const maxWeakenThreads = Math.floor(availableRam / RamUsage["weaken"])

        const weakenThreads = Math.min(optimalWeakenThreads, maxWeakenThreads)

        const threads = new Threads(0, 0, weakenThreads)

        scheduleWGH(ns, target, threads)
        ns.printf("fixing security with " + weakenThreads + " threads")
        ns.printf("    fromMin: " + fromMin)
        ns.printf("    optimalWeakenThreads: " + optimalWeakenThreads)
        ns.printf("    maxWeakenThreads: " + maxWeakenThreads)
        ns.printf("    availableRam: " + availableRam)

        const optimal = (optimalWeakenThreads <= maxWeakenThreads)

        if (!optimal) {
            // if it´s not optimal don't allow for fixMoney at the same time
            await ns.sleep(ns.getWeakenTime(target) + WGHMargin + 5)
            return false
        }

        await ns.sleep(10) // make the effects of the function have time to take affect before the next
        return true
    }

    return true
}

/** @param {NS} ns */
export async function fixMoney(ns, target, availableRam) {
    if (availableRam == 0) {
        return false
    }

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

        await ns.sleep(ns.getWeakenTime(target) + WGHMargin + 5)
        return false
    }

    return true
}

import { getServers } from "Other/ScanServers"
import { getAvalibleRam } from "Hacking copy/Helpers"

/** @param {NS} ns */
export async function fixServer(ns, target) {
    await getRoot(ns, target)

    let servers = getServers(ns)
    // fix the server money and security
    while (true) {
        await ns.sleep(100)

        let avalibleRam = getAvalibleRam(ns, ...servers)

        if (! await fixSecurity(ns, target, avalibleRam)) {
            continue
        }

        avalibleRam = getAvalibleRam(ns, ...servers)

        if (! await fixMoney(ns, target, avalibleRam)) {
            continue
        }

        break
    }
}