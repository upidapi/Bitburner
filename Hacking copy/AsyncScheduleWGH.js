import { distributeThreads } from "Hacking/Hack.js"
import { getThreadingServers } from "Hacking/Hack.js"
import {
    getMinSecHackTime,
    getMinSecGrowTime,
    getMinSecWeakenTime,
} from "Helpers/MyFormulas.js"

const WGHMargin = 2

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")

    const servers = getThreadingServers(ns)

    const target = ns.args[0]
    const w_threads = ns.args[1]
    const g_threads = ns.args[2]
    const h_threads = ns.args[3]

    const test = ns.args[4]

    // const weakenTime = getMinSecWeakenTime(ns, target)
    // const growTime = getMinSecGrowTime(ns, target)
    // const hackTime = getMinSecHackTime(ns, target)

    const weakenTime = ns.getWeakenTime(target)
    const growTime = ns.getGrowTime(target)
    const hackTime = ns.getHackTime(target)

    // time from when weaken starts to when grow starts
    const delta_grow_start = weakenTime - growTime + WGHMargin

    // time from when grow starts to when hack starts
    const delta_hack_start = weakenTime - delta_grow_start - hackTime + WGHMargin

    ns.printf("distributed " + w_threads + " weaken threads")
    distributeThreads(ns, servers, "Hacking/ThreadScripts/Weaken.js", w_threads, target)


    ns.printf("waiting " + (delta_grow_start / 1000).toFixed(2) + " seconds before starting grow")
    await ns.sleep(delta_grow_start)

    // ensure that the grow time hasn't changed 
    if (growTime != ns.getGrowTime(target)) {
        ns.printf("the grow time changed, aborted WGH secuence (only weaken got called)")
        ns.printf("grow time mismatch:")
        ns.printf("    expexted: " + growTime)
        ns.printf("    actual: " + ns.getGrowTime(target))
        // if it has stop
        return
    }

    // this check is not needed since the grow time changes if the security does 
    // // ensure that it's not in a hig security time
    // if (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target) > 0.1) {
    //     ns.printf("the security was to high (when called), aborted WGH secuence (only weaken got called)")

    //     return
    // }

    ns.printf("distributed " + g_threads + " grow threads")
    distributeThreads(ns, servers, "Hacking/ThreadScripts/Grow.js", g_threads, target)

    ns.printf("waiting " + (delta_hack_start / 1000).toFixed(2) + " seconds before starting hack")
    await ns.sleep(delta_hack_start)

    // ensure that the hack time hasn't changed 
    if (hackTime != ns.getHackTime(target)) {
        ns.printf("the hack time changed, aborted WGH secuence (only weaken and grow got called)")
        ns.printf("hack time mismatch:")
        ns.printf("    expexted: " + hackTime)
        ns.printf("    actual: " + ns.getHackTime(target))
        // if it has stop
        return
    }

    // // ensure that it's not in a hig security time
    // if (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target) > 0.1) {
    //     ns.printf("the security was to high (when called), aborted WGH secuence (only weaken and grow got called)")
    //     return
    // }

    ns.printf("distributed " + h_threads + " hack threads")
    distributeThreads(ns, servers, "Hacking/ThreadScripts/Hack.js", h_threads, target)
}
