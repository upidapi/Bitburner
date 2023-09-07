import { getMinSecWeakenTime } from "Helpers/MyFormulas"
import { timeFunction } from "Helpers/Timing"
import { getBestMoneyBatch } from "HybridShotgunBatcher/Batch"
import { StartMargin, sleepMargin } from "HybridShotgunBatcher/Settings"
import { purchaseMaxServers } from "Other/PurchaseServers"
import { getServers } from "Other/ScanServers"
import { Batch, getHsbRamData, nextValWrite } from "thread/Other"
import { BatchStartMargin, DeltaBatchExec, DeltaShotgunExec, RamWaitTime, SleepAccuracy, SpeedStart, smallNum, DeltaThreadExec, ThreadStartMargin } from "thread/Setings"
import { TargetData, getBestFixBatch, getBestTarget, getOptimalFixBatch, getTargetsData } from "thread/Targeting"
import { compileWorker, startWorker } from "thread/Worker"


/**
 * @param {NS} ns 
 * @param {String} curMode 
 * @param {Number} effectiveBatchStartTime 
 * @param {SpeedScheduler} speedScheduler 
 * @param {EffectiveScheduler} effectiveScheduler 
 */
async function update(ns,
    curMode,
    effectiveBatchStartTime,
    speedScheduler,
    effectiveScheduler
) {
    const bestTargetData = getBestTarget(ns, speedScheduler.targetsData)

    await purchaseMaxServers(ns);
    
    const [totalRam, hsbServersData, availableRam] = getHsbRamData(ns)

    const maxEffectiveBatchesRam = totalRam / bestTargetData.batch.averageRamUsage()

    const effectiveBatchTime = getMinSecWeakenTime(ns, bestTargetData.target) + DeltaShotgunExec + StartMargin
    const maxEffectiveBatchesTime = (effectiveBatchTime / effectiveBatchStartTime) * 0.5  // margin of error  

    if (maxEffectiveBatchesRam > maxEffectiveBatchesTime) {
        // the effective batcher will run into problems

        speedScheduler.hsbServersData = hsbServersData
        speedScheduler.availableRam = availableRam
        speedScheduler.bestTargetData = bestTargetData

        console.log(`speed - ${bestTargetData.target}`)
        const mode = "speed"
        if (curMode != mode) {
            for (const serverData of speedScheduler.hsbServersData) {
                const server = serverData.server
                ns.kill("WorkerScript.js", server)
            }
        }

        return mode
    } else {
        // using the effective batches is fine

        console.log(`effective - ${bestTargetData.target}`)
        const mode = "effective"
        if (curMode != mode) {
            effectiveScheduler.reset()
        }

        effectiveScheduler.bestTargetData = bestTargetData

        return mode
    }
}


/**
 * @param {NS} ns 
 */
async function setup(ns) {
    ns.disableLog("ALL")

    await compileWorker(ns)

    const speedScheduler = new SpeedScheduler(ns)
    const effectiveScheduler = new EffectiveScheduler(ns)
    effectiveScheduler.targetsData = speedScheduler.targetsData

    const effectiveBatchStartTime = await effectiveScheduler.calcBatchTime()
    console.log(`effective batch time: ${effectiveBatchStartTime}`)

    // margins
    // effectiveScheduler.batchTime = effectiveBatchStartTime * 100
    effectiveScheduler.batchTime = 200

    return [speedScheduler, effectiveScheduler, effectiveBatchStartTime]
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

    const targetsData = getTargetsData(ns)
    effectiveScheduler.targetsData = targetsData
    speedScheduler.targetsData = targetsData

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
    effectiveBatchStartTime,
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
                effectiveBatchStartTime,
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
 */
export async function main(ns) {
    const [
        speedScheduler,
        effectiveScheduler,
        effectiveBatchStartTime,
    ] = await setup(ns)

    while (true) {
        try {
            await reset(ns, speedScheduler, effectiveScheduler)

            await controller(
                ns,
                speedScheduler,
                effectiveScheduler,
                effectiveBatchStartTime,
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

// TODO add calculations for hack %

// TODO separate ThreadStartMargin and DeltaThreadExec
// btw ThreadStartMargin = DeltaBatchExec / 3