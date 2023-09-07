import { compileWorker, startWorker } from "thread/Worker"


/**
 * @param {NS} ns 
 */
async function setup(ns) {
    await compileWorker(ns)

    ns.getPortHandle(ns.pid).clear()
}


function printServerInfo(ns, server, prefix="") {
    let sec = ns.getServerSecurityLevel(server)
    let money = ns.getServerMoneyAvailable(server)
    console.log(`${prefix} sec: ${sec} money: ${money}`)
}


/**
 * @param {NS} ns 
 */
export async function main(ns) {
    // const [totalRam, hsbServersData] = getHsbRamData(ns)

    await setup(ns)

    const target = "n00dles"

    let wTime = ns.getWeakenTime(target)
    const fExec = performance.now() + 100000 + wTime

    // printServerInfo(ns, target, "1-")

    const serversData = [
        {
            "server": "home",
            "ram": 1000000,
            "usedRam": 0,
        }
    ]

    // const s = performance.now()
    for (let i = 0; i < 10; i++) {
        // console.log(i)
        await startWorker(ns, serversData, target, "weaken", 1, fExec)
    }
    // console.log(performance.now() - s)
    // await startWorker(ns, serversData, target, "hack", 1, fExec + 0.0001)

    // await nextValWrite(ns,
    //     ns.pid,
    //     [
    //         "weaken worker finished"
    //     ],
    //     [
    //         "hack worker finished",
    //         "grow worker finished",
    //     ]
    // )

    // printServerInfo(ns, target, "2-")

    // await nextValWrite(ns,
    //     ns.pid,
    //     [
    //         "hack worker finished"
    //     ],
    //     [
    //         "hack worker finished",
    //         "grow worker finished",
    //     ]
    // )
    
    // printServerInfo(ns, target, "3-")

}