import { getHsbRamData, nextValWrite } from "thread/Other"


const workerScriptName = "thread/WorkerScript.js"


/**
 * 
 * @param {NS} ns 
 * @param {Array<{"server": String, "ram": Number, "usedRam": Number}>} serversData 
 * @param {String} target 
 * @param {"hack" | "grow" | "weaken"} type 
 * @param {Number} threads 
 * @param {Number} batchExecTime 
 * @returns {Promise<boolean>} success status
 */
export async function startWorker(
    ns,
    serversData,
    target,
    type,
    threads,
    batchExecTime) {

    // throw new Error("can't start thing with 0 threads")

    const portNum = ns.pid

    // the base script cost (1.6gb) + cost of action (hack: 0.10, grow: 0.15, weaken: 0.15)
    const ramPerThread = {
        "hack": 1.70,
        "grow": 1.75,
        "weaken": 1.75,
    }[type]

    const duration = {
        "hack": ns.getHackTime,
        "grow": ns.getGrowTime,
        "weaken": ns.getWeakenTime,
    }[type](target)

    const hostName = ns.getHostname()

    serversData.sort((a, b) => {
        if (a.server == hostName) {
            return -Infinity
        }

        if (b.server == hostName) {
            return Infinity
        }

        const ramDiff = (b.ram - b.usedRam) - (a.ram - a.usedRam)

        return ramDiff
    })

    const pIds = []

    for (const serverData of serversData) {
        if (threads == 0) {
            return pIds
        }

        const aRam = serverData.ram - serverData.usedRam
        const serverName = serverData.server

        const maxThreads = Math.floor(aRam / ramPerThread)
        const handledThreads = Math.min(maxThreads, threads)

        // console.log(aRam, serverName, handledThreads, threads)

        if (handledThreads == 0) {
            continue
        }

        serverData.usedRam += handledThreads * ramPerThread
        threads -= handledThreads

        ns.scp(workerScriptName, serverName)

        // ns.tprintf("a - " + type)
        const pid = ns.exec(
            workerScriptName,
            serverName,
            {
                "ramOverride": ramPerThread,
                "threads": handledThreads
            },
            false,
            target,
            type,
            handledThreads,
            duration,
            batchExecTime,
            portNum
        )

        pIds.push([pid, serverName])

        const successStatus = await nextValWrite(
            ns,
            portNum,
            [
                "started worker",
                "worker failed"
            ]
        )

        if (successStatus == "started worker") {
            // return true

        } else if (successStatus == "worker failed") {
            const now = performance.now()
            throw new Error(
                `failed to start worker, can't start worker in the past\n` +
                `    successStatus: "${successStatus}"\n` +
                `    target: "${target}"\n` +
                `    type: "${type}"\n` +
                `    threads: "${threads}"\n` +
                `    duration: "${duration}"\n` +
                `    execTime: "${batchExecTime}"\n` +
                `    toExecTime: "${batchExecTime - now}"\n` +
                `    now: "${now}"\n` +
                `    startTime: "${batchExecTime - duration}"\n` +
                `    toStart: "${batchExecTime - duration - now}"\n`
            )

            // return false
        } else {
            throw new Error(`invalid worker successStatus ("${successStatus}")`)
        }
    }

    if (threads == 0) {
        return pIds
    }

    console.log(getHsbRamData(ns))
    throw new Error(
        `not enough ram\n` +
        `    target: "${target}"\n` +
        `    type: "${type}"\n` +
        `    threads: ${threads}\n`
    )

    
}


/**
 * @param {NS} ns
 */
export async function compileWorker(ns) {
    /**
     * If the worker (this script) isn't compiled. i.e we 
     * haven't run the script this game or we've edited the 
     * code in this file. 
     * 
     * Then the worker (this script) wont start since the compile
     * process is run asynchronously and the script will 
     * therefor not start when we call "ns.run".
     * 
     * the compile will only start once we await "ns.sleep()""
     * so when we instead await "port.nextWrite" it will 
     * get stuck.
     */

    const workerPid = ns.exec(
        workerScriptName,
        ns.getHostname(),
        1,
        true)

    while (true) {
        if (ns.isRunning(workerPid)) {
            await ns.sleep(0)
            continue
        }

        return
    }
}
