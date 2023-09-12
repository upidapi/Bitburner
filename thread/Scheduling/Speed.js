import { getMinSecWeakenTime } from "Helpers/MyFormulas"
import { nextValWrite } from "thread/Other"
import { safeSleepTo } from "thread/Scheduling/Helpers"
import { BatchStartMargin, DeltaBatchExec, DeltaShotgunExec, DeltaThreadExec, RamWaitTime, SleepAccuracy, SpeedStart } from "thread/Setings"
import { TargetData, getBestFixBatch, getBestTarget, getOptimalFixBatch } from "thread/Targeting"
import { startWorker } from "thread/Worker"


export const DeltaSleep = 50


/**
 * pros:
 * - fast
 * - very stable
 * 
 * cons: 
 * - relatively ram inefficient
 * - no sub batching
 * - shotgun based 
 */
export class SpeedScheduler {
    constructor(ns) {
        this.ns = ns

        this.targetsData = []

        this.availableRam = 0
        this.totalRam = 0
        this.hsbServersData = []

        // valid times to start new shotguns
        this.lastSleep = 0
    }

    async startWorker(
        batchWorkers,
        type,
        threads,
        execTime
    ) {
        try {
            batchWorkers.concat(
                await startWorker(
                    this.ns,
                    this.hsbServersData,
                    this.bestTargetData.target,
                    type,
                    threads,
                    execTime
                )
            )

        } 
        catch (error) {
            // if the worker fails cancel all started workers in batch
            for (const pData of batchWorkers) {
                // console.log(pData)
                if (!ns.kill(
                    JSON.parse(pData[0]),
                    pData[1]
                )) {
                    // failed to kill worker
                    throw new Error(
                        "couldn't find worker:\n" +
                        `pid: ${pData[0]}\n` +
                        `target: ${pData[1]}\n`
                    )
                }
            }

            console.log("batch failed")
            console.log(error)

            return false
        }

        return true
    }

    /**
     * @param {TargetData} targetData 
     */
    async startFullBatch(targetData, batch = null) {
        // const s = performance.now()

        batch = batch ?? targetData.batch
        const wRam = batch.wRam()
        const gRam = batch.gRam()
        const hRam = batch.hRam()

        const batchRam = wRam + gRam + hRam
        if (batchRam > this.availableRam) {
            // not enough ram

            return false
        }

        const execTime = targetData.execTime

        // the workers that we've already started
        const batchWorkers = []

        const gThreads = targetData.batch.grow
        if (gThreads != 0) {
            if (!this.startWorker(
                batchWorkers,
                "grow",
                gThreads,
                execTime - DeltaThreadExec * 2
            )) {
                return
            }

            this.availableRam -= gRam
        }

        const hThreads = targetData.batch.hack
        if (hThreads != 0) {
            if (!this.startWorker(
                batchWorkers,
                "hack",
                hThreads,
                execTime - DeltaThreadExec * 1
            )) {
                return
            }

            this.availableRam -= hRam
        }

        const wThreads = targetData.batch.weaken
        if (wThreads != 0) {
            if (!this.startWorker(
                batchWorkers,
                "weaken",
                wThreads,
                execTime - DeltaThreadExec * 0
            )) {
                return
            }

            this.availableRam -= wRam

        } else {
            // starting a batch with 0 threads will most likely cause problems 
            console.log("tried to start batch with 0 weaken threads", targetData, targetData.batch)
            throw new Error("tried to start batch with 0 weaken threads", JSON.stringify(targetData.batch))
        }
        // console.log(performance.now() - s)

        return true
    }

    async startTo(lastStart) {
        const ns = this.ns

        const targetData = this.bestTargetData
        const target = targetData.target

        let startedBatch = false
        while (true) {

            const now = performance.now()

            const wTime = ns.getWeakenTime(target)

            // console.log(wTime)

            const minExec = now + wTime + BatchStartMargin + DeltaBatchExec
            // const maxExec = now + wTime + DeltaShotgunExec * 2 + BatchStartMargin
            const maxExec = lastStart + wTime + BatchStartMargin + DeltaBatchExec

            targetData.execTime = Math.max(minExec,
                targetData.execTime + DeltaBatchExec)

            // maybe add DeltaBatchExec to targetData.execTime

            if (targetData.execTime <= maxExec) {
                if (!await this.startFullBatch(this.bestTargetData)) {
                    continue
                }

                startedBatch = true
            } else {
                break
            }
        }

        return startedBatch
    }

    // async startBatches() {
    //     const ns = this.ns

    //     const now = performance.now()
    //     await safeSleepTo(ns, 5, this.bestTargetData, 5)

    //     // console.log(DeltaShotgunExec + now - performance.now(), now - performance.now())
    //     await this.startTo(DeltaShotgunExec + now)

    //     // console.log(1)

    //     const moneyPart = ns.getServerMoneyAvailable(this.bestTargetData.target)
    //         / ns.getServerMaxMoney(this.bestTargetData.target) * 100

    //     // console.log(`
    //     // ram: ${1 - this.availableRam / this.totalRam}
    //     // sec: ${ns.getServerSecurityLevel(this.bestTargetData.target)} / ${ns.getServerMinSecurityLevel(this.bestTargetData.target)}
    //     // money: ${moneyPart.toFixed(1)} %
    //     // `)
    // }

    // async startBatches() {
    //     const ns = this.ns

    //     let startTime

    //     console.log(0)
    //     while (this.batchExecs.length) {
    //         startTime = this.batchExecs.shift()

    //         if (performance.now() < startTime) {
    //             break
    //         }
    //     }

    //     // no batchExec(s) exist
    //     // probably due to a lack of ram
    //     if (startTime == undefined) {
    //         // there is no batches so we don't have to start any threads

    //         if (await this.startTo(RamWaitTime + DeltaShotgunExec + performance.now())) {
    //             return
    //         }

    //         await safeSleepTo(ns, RamWaitTime, this.bestTargetData, RamWaitTime)

    //         return
    //     }

    //     console.log(1)
    //     const toStart = startTime - performance.now()

    //     const toSleep = toStart - SleepAccuracy
    //     if (toSleep > 0) {
    //         // schedule new batches up to startTime

    //         if (await this.startTo(SleepAccuracy + performance.now())) {
    //             return
    //         }

    //         await safeSleepTo(ns, 1, this.bestTargetData, 1)

    //         return
    //     }

    //     console.log(2)
    //     // we've found a valid batch finish to go to
    //     if (await this.startTo(toStart + DeltaShotgunExec + performance.now())) {
    //         return
    //     }

    //     // TODO possibly remove the next line, i don't know why it's there
    //     // it's probably there to ensure that we don't iterate over 
    //     // the batches one by one. 
    //     // this could cause problems it if captures the batchExec
    //     await safeSleepTo(ns, 0, this.bestTargetData, 0)

    //     console.log(3)

    //     // await safeSleepTo(ns, Infinity, this.bestTargetData, toStart)
    // }

    isFixed(target) {
        const ns = this.ns

        const curSec = ns.getServerSecurityLevel(target)
        const minSec = ns.getServerMinSecurityLevel(target)

        if (curSec != minSec) {
            // not yet fixed

            return false
        }

        return true
    }

    async fixIfNeeded() {
        const ns = this.ns

        const targetData = this.bestTargetData

        // console.log(Object.assign({}, targetData))

        const target = targetData.target

        if (this.isFixed(target)) {
            return true
        }

        if (SpeedStart) {
            if (targetData.secAftFix == ns.getServerMinSecurityLevel(target)) {
                return true
            }
        }

        // console.log(targetData.fixComplete, targetData.fixComplete + BatchStartMargin - performance.now())
        // if (targetData.fixComplete + BatchStartMargin > performance.now()) {
        //     return false
        // }

        while (true) {
            // if (targetData.fixComplete + SleepAccuracy < performance.now()) {
            //     return false
            // }

            const optimalFixBatch = getOptimalFixBatch(ns, target)

            let fixBatch = undefined
            while (true) {
                fixBatch = getBestFixBatch(ns, target, this.availableRam)

                if (fixBatch.weaken == 0) {
                    // not enough ram for anything

                    await safeSleepTo(ns, 0, this.bestTargetData, 0)
                }

                // enough ram for something
                break
            }

            const now = performance.now()

            const wTime = ns.getWeakenTime(target)
            const minExec = now + wTime + BatchStartMargin
            targetData.execTime = Math.max(
                minExec,
                targetData.execTime + DeltaBatchExec
            )

            await this.startFullBatch(targetData, fixBatch)

            targetData.fixComplete = targetData.execTime
            // console.log(targetData.fixComplete)

            targetData.testAttr = "hello"

            // if speed start is on we won't wait for the last batch 
            // to complete 
            if (SpeedStart) {
                if (optimalFixBatch.weaken == fixBatch.weaken &&
                    optimalFixBatch.grow == fixBatch.grow &&
                    optimalFixBatch.hack == fixBatch.hack) {

                    console.log("scheduled full fix batch")
                    // best fix batch is optimal

                    // the sec is set by the safeSleepTo()
                    // targetData.security = ns.getServerMinSecurityLevel(target)

                    targetData.secAftFix = ns.getServerMinSecurityLevel(target)
                    return
                }
            }

            console.log("scheduled sub fix batch")

            const secDec =
                ns.weakenAnalyze(optimalFixBatch.weaken)
                - ns.growthAnalyzeSecurity(optimalFixBatch.grow)

            targetData.secAftFix = targetData.security - secDec
            targetData.security = targetData.secAftFix

            // by manually decreasing the sec we force the safeSleepTo to wait 
            // for the sec to go down to the val we set
            await safeSleepTo(ns, 0, this.bestTargetData, targetData.execTime - performance.now())


            if (!this.isFixed(target)) {
                continue
            }

            return
        }
    }

    async update() {
        const ns = this.ns;
        await purchaseMaxServers(ns);

        [_, this.hsbServersData, this.availableRam] = getHsbRamData(ns)
        // const [totalRam, hsbServersData] = getHsbRamData(ns)
        // this.totalRam = totalRam
        // this.hsbServersData = hsbServersData

        // for (const targetData of this.targetsData) {
        //     if (targetData.target == "n00dles") {
        //         this.bestTargetData = targetData
        //         break
        //     }
        // }

        this.bestTargetData = getBestTarget(ns, this.targetsData)

        console.log(this.bestTargetData)
    }

    // getMaxConcurrentBatches() {
    //     const startPerMs = 1 / DeltaBatchExec
    //     const batchTime =
    //         getMinSecWeakenTime(ns, this.bestTargetData.target)
    //         + DeltaBatchExec
    //         + BatchStartMargin * 2

    //     const maxConcurrentBatches = startPerMs * batchTime
    //     return maxConcurrentBatches
    // }


    reset() {
        this.lastSleep = 0

        this.availableRam = 0
        this.totalRam = 0
        this.hsbServersData = []
    }

    async frame() {
        const ns = this.ns

        // console.log(DeltaShotgunExec + now - performance.now(), now - performance.now())

        // console.log(0)
        if (!await this.fixIfNeeded()) {
            return
        }

        // we set "now" before the sleep to avoid lag  
        // let now = performance.now()

        await safeSleepTo(ns, 5, this.bestTargetData, 5)
        await this.startTo(DeltaShotgunExec + performance.now())

        // console.log(2)
        // await this.startBatches()

        // console.log(3)
        let now = performance.now()
        if (now - this.lastSleep >= DeltaSleep) {
            this.lastSleep = now
            // console.log("update")

            await safeSleepTo(this.ns, 100, this.bestTargetData, 100)
        }
    }
}