import { getMaxHackThreads } from "Hacking/Hack.js"

/** @param {NS} ns */
export async function main(ns) {
    const start = Date.now()
    for (let i = 0; i < 1000000; i++) {
        getMaxHackThreads(ns, "phantasy", Math.pow(10, 9))
    }
    ns.tprintf(Date.now() - start)
}



