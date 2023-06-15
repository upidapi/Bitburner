import { Threads } from "HybridShotgunBatcher/Helpers";
import { startBatch } from "HybridShotgunBatcher/Helpers";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")
    // const s = Date.now()
    // for (let i = 0; i < 10; i++) {
    //     scheduleWGH(ns, "n00dles", new Threads(5, 10, 20))
    //     await ns.sleep(15)
    // }
    // ns.tprint(Date.now() - s)

    // let s = Date.now()
    // for (let i = 0; i < 100; i++) {
    //     await ns.run("Other/test2.js", 1, Date.now())

    //     // ns.tprint(Date.now())
    //     ns.tprint("--", Date.now() - s)
    //     s = Date.now()
    //     // await ns.sleep(0)
    // }

    // let s = Date.now()
    // for (let j = 0; j < 100; j++) {
    //     let tot = 0
    //     let s = Date.now()
    //     for (let i = 0; i < 100; i++) {
    //         setTimeout(() => {
    //             const d = Date.now() - s
    //             tot += d
    //             ns.tprint(d)
    //             ns.hack()
    //             s = Date.now()
    //         }, j)

    //         // await sleep(j)
    //         // const d = Date.now() - s
    //         // tot += d
    //         // // ns.tprint(d)
    //         // s = Date.now()
    //     }
    //     ns.tprint(j, " ", tot / 100)
    // }

    // let tot = 0
    // for (let i = 0; i < 1000; i++) {
    //     let s = Date.now()

    //     await ns.sleep(0)
    //     let d = Date.now() - s
    //     // ns.tprint(d)
    //     tot += d
    // }
    // ns.tprint(tot / 1000)

    // let m = Date.now()
    // let tot = 0
    // for (let i = 0; i < 100; i++) {
    //     let s = Date.now()

    //     await pSleep(ns, 20)
    //     let d = Date.now() - s - 20
    //     ns.tprint(d, " ", i)
    //     tot += d
    // }
    // ns.tprint("--", tot, "--", Date.now() - m)

    // setTimeout(() => ns.tprint(1), 1)

    // await startBatch(ns, 
    //     "n00dles", 
    //     new Threads(1, 10, 100), 
    //     ["pserver-2^20"])

    while (true) {
        const s = Date.now()
        await ns.sleep(10)
        ns.print("result:")
        ns.print(`  dif   : ${Date.now() - s - 10}`)
        ns.print(`  start : ${s}`)
        ns.print(`  end   : ${Date.now()}`)
    }

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

