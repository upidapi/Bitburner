import { nextValWrite } from "thread/Other"
import { safeSleepTo } from "thread/Scheduling/Helpers"
import { BatchStartMargin, DeltaBatchExec, DeltaShotgunExec, DeltaThreadExec, RamWaitTime, SleepAccuracy, SpeedStart } from "thread/Setings"
import { TargetData, getBestFixBatch, getOptimalFixBatch } from "thread/Targeting"
import { startWorker } from "thread/Worker"

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
        this.hsbServersData = 0

        // valid times to start new shotguns
        this.batchExecs = []
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

        } catch (error) {
            // if the worker fails cancel all started workers in batch
            for (const [worker, server] of batchWorkers) {
                if (!this.ns.kill(worker, server)) {
                    // failed to kill worker
                    
                    throw new Error("failed to cancel worker")
                }
            }

            console.log("batch failed")

            return false
        }

        return true
    }


    /**
     * @param {TargetData} targetData 
     */
    async startFullBatch(targetData) {
        // const s = performance.now()

        const batch = targetData.batch
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

            this.batchExecs.push(execTime)
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
                    break
                }

                startedBatch = true
            } else {
                break
            }
        }

        return startedBatch
    }

    async startBatches() {
        const ns = this.ns

        // console.log(0)
        await this.startTo(DeltaShotgunExec + performance.now())

        // console.log(1)
        await safeSleepTo(ns, 0, this.bestTargetData, 10)

        const moneyPart = ns.getServerMoneyAvailable(this.bestTargetData.target)
            / ns.getServerMaxMoney(this.bestTargetData.target) * 100

        console.log(`
        ram: ${this.availableRam / this.totalRam}
        sec: ${ns.getServerSecurityLevel(this.bestTargetData.target)} / ${ns.getServerMinSecurityLevel(this.bestTargetData.target)}
        money: ${moneyPart.toFixed(1)} %
        `)
    }

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

        const curMoney = ns.getServerMoneyAvailable(target)
        const maxMoney = ns.getServerMaxMoney(target)

        if (curMoney != maxMoney) {
            // not yet fixed

            return false
        }

        return true
    }

    async fixIfNeeded() {
        const ns = this.ns

        const targetData = this.bestTargetData
        const target = targetData.target

        if (targetData.fixedStatus == "fixed") {
            return
        }

        if (this.isFixed(target)) {
            targetData.fixedStatus = "fixed"
            return
        }

        if (typeof targetData.fixedStatus == "number") {
            while (true) {
                const optimalFixBatch = getOptimalFixBatch(ns, target)

                const fixBatchTargetData = new TargetData(ns, target)

                while (true) {
                    fixBatchTargetData.batch = getBestFixBatch(ns, target, this.availableRam)

                    if (fixBatchTargetData.batch.weaken == 0) {
                        // not enough ram for anything

                        await ns.sleep(RamWaitTime)
                        continue
                    }

                    // enough ram for something
                    break
                }

                const now = performance.now()

                const wTime = ns.getWeakenTime(target)
                const minExec = now + wTime + BatchStartMargin
                fixBatchTargetData.execTime = Math.max(minExec,
                    targetData.execTime + DeltaBatchExec)

                const oldSec = ns.getServerSecurityLevel(target)
                const oldMoney = ns.getServerMoneyAvailable(target)

                await this.startFullBatch(fixBatchTargetData)

                // if speed start is on we won't wait for the last batch 
                // to complete 
                if (SpeedStart) {
                    if (optimalFixBatch.weaken == fixBatchTargetData.batch.weaken &&
                        optimalFixBatch.grow == fixBatchTargetData.batch.grow &&
                        optimalFixBatch.hack == fixBatchTargetData.batch.hack) {

                        // best fix batch is optimal
                        targetData.fixedStatus = fixBatchTargetData.execTime
                        return
                    }
                }

                await nextValWrite(ns,
                    ns.pid,
                    ["weaken worker finished"],
                    fixBatchTargetData.execTime - now
                )

                //#region wait til the fix batch completes
                while (true) {
                    const curSec = ns.getServerSecurityLevel(target)
                    const curMoney = ns.getServerMoneyAvailable(target)

                    if (curSec < oldSec || curMoney > oldMoney) {
                        // batch launched

                        // the fix batch is always the fist batch launched on a
                        // target. Unless the target is already prepped. Then there
                        // won't be any fix batch
                        break
                    }

                    await nextValWrite(ns,
                        ns.pid,
                        ["weaken worker finished"]
                    )
                }
                //#endregion

                if (!this.isFixed(target)) {
                    continue
                }

                targetData.fixedStatus = "fixed"
                return
            }

        }

        throw new Error(`invalid fixedStatus (${targetData.fixedStatus})`)
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

    async run() {
        let lastUpdate = -10000
        while (true) {
            if (performance.now() - lastUpdate >= 10000) {
                console.log("update")
                await this.update()
                lastUpdate = performance.now()
            }

            // this.bestTargetData = getBestTarget(ns, this.targetsData)

            await this.fixIfNeeded()

            // console.log("starting")
            await this.startBatches()
        }
    }

    reset() {
        this.batchExecs = []

        this.availableRam = 0
        this.hsbServersData = []
    }

    async frame() {
        await this.fixIfNeeded()

        await this.startBatches()
    }
}