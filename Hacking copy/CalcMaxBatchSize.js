import { Threads } from "Hacking copy/Helpers"

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
    estimateX(ns, hackThreadsToRam, avalibleRam, 0, hackForHalf, -10, 0)

    threads.hack = Math.floor(threads.hack)

    if (threads.ramUsage() == 0) {
        return [threads, 1, false]
    }

    const mul = Math.floor(avalibleRam / threads.ramUsage())

    const isOptimalThreads = hackForHalf - threads.hack <= 1

    return [threads, mul, isOptimalThreads]
}