import { purchaseMaxServers } from "Other/PurchaseServers"
import { getServers } from "Other/ScanServers"
import { getHsbRamData } from "thread/Other"
import { EffectiveScheduler } from "thread/Scheduling/Effective"
import { SpeedScheduler } from "thread/Scheduling/Speed"
import { getBestTarget, getTargetsData } from "thread/Targeting"
import { compileWorker } from "thread/Worker"


/**
 * @param {NS} ns 
 */
async function setup(ns) {
    ns.disableLog("ALL")

    await compileWorker(ns)

    const speedScheduler = new SpeedScheduler(ns)
    const effectiveScheduler = new EffectiveScheduler(ns)

    return [speedScheduler, effectiveScheduler]
}


/**
 * @param {NS} ns 
 * @param {String} curMode 
 * @param {SpeedScheduler} speedScheduler 
 * @param {EffectiveScheduler} effectiveScheduler 
 */
async function update(ns,
    curMode,
    speedScheduler,
    effectiveScheduler
) {
    await purchaseMaxServers(ns);

    const targetData = getTargetsData(ns)
    effectiveScheduler.targetsData = targetData
    speedScheduler.targetsData = targetData

    const bestTargetData = getBestTarget(ns, targetData)
    effectiveScheduler.bestTargetData = bestTargetData
    speedScheduler.bestTargetData = bestTargetData

    // we don't update the effectiveScheduler's ram data since it updates itself
    const [totalRam, hsbServersData, availableRam] = getHsbRamData(ns)
    speedScheduler.hsbServersData = hsbServersData
    speedScheduler.totalRam = totalRam
    speedScheduler.availableRam = availableRam

    if (effectiveScheduler.shouldRun(totalRam)) {
        // using the effective batches is fine

        console.log(`effective - ${bestTargetData.target}`)

        if (curMode != "effective") {
            effectiveScheduler.reset()
        }

        effectiveScheduler.bestTargetData = bestTargetData

        return "effective"
    } else {
        // the effective batcher will run into problems

        console.log(`speed - ${bestTargetData.target}`)

        if (curMode != "speed") {
            for (const serverData of speedScheduler.hsbServersData) {
                const server = serverData.server
                ns.kill("WorkerScript.js", server)
            }
        }

        return "speed"
    }
}


/**
 * @param {NS} ns 
 * @param {SpeedScheduler} speedScheduler 
 * @param {EffectiveScheduler} effectiveScheduler 
 */
async function controller(
    ns,
    speedScheduler,
    effectiveScheduler,
) {
    const deltaUpdate = 10000

    let mode = null

    let lastUpdate = -deltaUpdate
    while (true) {
        const now = performance.now()
        if (now - lastUpdate >= deltaUpdate) {
            lastUpdate = now
            // console.log("update")

            mode = await update(ns,
                mode,
                speedScheduler,
                effectiveScheduler
            )
        }

        if (mode == "speed") {
            await speedScheduler.frame()

        } else if (mode == "effective") {
            await effectiveScheduler.frame()

        } else {
            throw new Error(`invalid mode ${mode}`)
        }
    }
}


/**
 * @param {NS} ns 
 * @param {SpeedScheduler} speedScheduler 
 * @param {EffectiveScheduler} effectiveScheduler 
 */
async function reset(
    ns,
    speedScheduler,
    effectiveScheduler,
) {
    getServers(ns).forEach((server) => {
        ns.scriptKill("thread/Worker.js", server)
    })

    await ns.sleep(1000)

    ns.getPortHandle(ns.pid).clear()

    effectiveScheduler.reset()
    speedScheduler.reset()
}


/**
 * @param {NS} ns 
 */
export async function main(ns) {
    const [
        speedScheduler,
        effectiveScheduler,
    ] = await setup(ns)

    while (true) {
        try {
            await reset(ns, speedScheduler, effectiveScheduler)

            await controller(
                ns,
                speedScheduler,
                effectiveScheduler,
            )
        } catch (error) {
            console.log(error)

            if (error.errorMessage == "") {
                throw error
            }

            break
        }
    }
}