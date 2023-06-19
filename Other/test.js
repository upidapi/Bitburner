import { getMinSecHackTime } from "Helpers/MyFormulas";

/** @param {NS} ns */
export async function main(ns) {
    ns.tprint(getMinSecHackTime(ns, "n00dles"))
    ns.tprint(ns.getHackTime("n00dles"))
}

async function pSleep(ns, ms) {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const margin = 10

    const finishTime = Date.now() + ms

    if (ms > margin) {
        const aSleep = Math.max(0, ms - margin)
        await sleep(aSleep)
    }

    while (true) {
        if ((finishTime - Date.now()) <= 0) {
            return
        }
    }
}

