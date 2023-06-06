import { distributeThreads } from "Hacking/Hack.js"


/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")

    const target = ns.args[0]
    const w_threads = ns.args[1]
    const g_threads = ns.args[2]
    const h_threads = ns.args[3]

    const weakenTime = ns.getWeakenTime(target)
    const growTime = ns.getGrowTime(target)
    const hackTime = ns.getHackTime(target)
    
    // time from when weaken starts to when grow starts
    const delta_grow_start = weakenTime - growTime + 5

    // time from when grow starts to when hack starts
    const delta_hack_start = weakenTime - delta_grow_start - hackTime + 5

    ns.printf("distributed " + w_threads + " weaken threads")
    distributeThreads(ns, "Hacking/ThreadScripts/Weaken.js", w_threads, target)
    

    ns.printf("waiting " + (delta_grow_start / 1000).toFixed(2) + " seconds before starting grow")
    await ns.sleep(delta_grow_start)

    // ensure that the grow time hasn't changed 
    if (growTime != ns.getGrowTime(target)) {
        ns.printf("the grow time changed, aborted WGH secuence (only weaken got called)")

        // if it has stop
        return
    }

    ns.printf("distributed " + g_threads + " grow threads")
    distributeThreads(ns, "Hacking/ThreadScripts/Grow.js", g_threads, target)

    ns.printf("waiting " + (delta_hack_start / 1000).toFixed(2) + " seconds before starting grow")
    await ns.sleep(delta_hack_start)

    // ensure that the hack time hasn't changed 
    if (hackTime != ns.getHackTime(target)) {
        ns.printf("the hack time changed, aborted WGH secuence (only weaken and grow got called)")
        sec 
        // if it has stop
        return
    }

    ns.printf("distributed " + h_threads + " hack threads")
    distributeThreads(ns, "Hacking/ThreadScripts/Hack.js", h_threads, target)
}
