import { safeSleepTo } from "thread/Helpers"
import { BatchStartMargin, DeltaBatchExec, DeltaShotgunExec, DeltaThreadExec, MaxWorkers, RamWaitTime, SleepAccuracy, SpeedStart } from "thread/Settings"
import { TargetData, getBestFixBatch, getBestTarget, getOptimalFixBatch, getOptimalMoneyBatch } from "thread/Targeting"
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
    /**
     * @param {NS} ns 
     */
    constructor(ns) {
        this.ns = ns

        this.targetsData = []

        this.availableRam = 0
        this.totalRam = 0
        this.hsbServersData = []

        // valid times to start new shotguns
        this.lastSleep = 0

        // used to limit the worker count to {MaxWorkers}
        this.batchExecs = []

        this.intLvl = 0
        this.hackLvl = 0
    }

    updateBatch() {
        // this is for accounting for potential changes in the conditions
        // if the conditions change the batch goes out of balance
        // this can result in there being no money on the server

        // conditions, for example: int lvl, hack lvl

        const ns = this.ns
        const player = ns.getPlayer()

        const curHackLvc = player.skills.hacking
        const curIntLvc = player.skills.intelligence

        if (curHackLvc == this.hackLvl &&
            curIntLvc == this.intLvl) {

            // no conditions changed

            return
        }

        this.hackLvl = curHackLvc
        this.intLvl = curIntLvc

        ns.print("conditions changed")

        const targetData = this.bestTargetData

        targetData.batch = getOptimalMoneyBatch(ns, targetData.target)
    }


    async startWorker(
        batchWorkers,
        type,
        threads,
        execTime
    ) {
        const ns = this.ns

        // basically the normal one but with error protection

        const [success, pIds] = await startWorker(
            this.ns,
            this.hsbServersData,
            this.bestTargetData.target,
            type,
            threads,
            execTime
        )

        batchWorkers.push(...pIds)

        if (!success) {
            console.log("batch failed")

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

            return false
        }

        return true
    }

    /**
     * @param {TargetData} targetData 
     */
    async startFullBatch(targetData, batch = null) {
        // const s = performance.now()

        const customBatch = batch ? true : false

        // console.log(`custom batch ${customBatch}`, batch)

        if (!customBatch) this.updateBatch()

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

        this.batchExecs.push(execTime)

        // the workers that we've already started
        const batchWorkers = []

        const gThreads = targetData.batch.grow
        if (gThreads != 0) {
            if (!await this.startWorker(
                batchWorkers,
                "grow",
                gThreads,
                execTime - DeltaThreadExec * 2
            )) {
                return false
            }

            this.availableRam -= gRam
        }

        if (!customBatch) this.updateBatch()

        const hThreads = targetData.batch.hack
        if (hThreads != 0) {
            if (!await this.startWorker(
                batchWorkers,
                "hack",
                hThreads,
                execTime - DeltaThreadExec * 1
            )) {
                return false
            }

            this.availableRam -= hRam
        }

        if (!customBatch) this.updateBatch()

        const wThreads = targetData.batch.weaken
        if (wThreads != 0) {
            if (!await this.startWorker(
                batchWorkers,
                "weaken",
                wThreads,
                execTime - DeltaThreadExec * 0
            )) {
                return false
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

        const lastExec = targetData.execTime

        let startedBatch = false
        while (true) {

            const now = performance.now()

            const wTime = ns.getWeakenTime(target)

            // console.log(wTime)

            const minExec = now + wTime + BatchStartMargin + DeltaBatchExec
            // const maxExec = now + wTime + DeltaShotgunExec * 2 + BatchStartMargin
            const maxExec = lastStart + wTime + BatchStartMargin + DeltaBatchExec

            targetData.execTime = Math.max(
                targetData.execTime + DeltaBatchExec,
                minExec,
            )

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

        // don't change the execTime if no batches were started
        if (!startedBatch) {
            targetData.execTime = lastExec
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
                targetData.execTime + DeltaBatchExec,
                minExec,
            )

            await this.startFullBatch(targetData, fixBatch)

            targetData.fixComplete = targetData.execTime
            // console.log(targetData.fixComplete)

            const minSec = ns.getServerMinSecurityLevel(target)

            const secDec =
                ns.weakenAnalyze(fixBatch.weaken)
                - ns.growthAnalyzeSecurity(fixBatch.grow)

            targetData.secAftFix = Math.max(
                targetData.security - secDec,
                minSec
            )

            // if speed start is on we won't wait for the last batch 
            // to complete 
            if (optimalFixBatch.weaken == fixBatch.weaken &&
                optimalFixBatch.grow == fixBatch.grow &&
                optimalFixBatch.hack == fixBatch.hack) {

                console.log("scheduled full fix batch")
                // best fix batch is optimal

                // the sec is set by the safeSleepTo()
                // targetData.security = ns.getServerMinSecurityLevel(target)

                if (SpeedStart) {
                    console.log("started batching before the target is prepped since speed start is on")

                    return
                }
            }

            console.log("scheduled sub fix batch")

            // by manually decreasing the sec we force the safeSleepTo to wait 
            // for the sec to go down to the val we set
            await safeSleepTo(ns, 0, this.bestTargetData, targetData.execTime - performance.now())


            if (!this.isFixed(target)) {
                continue
            }

            console.log("started batching because target is prepped")
            
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

    workerLimiter() {
        const now = performance.now()

        for (let i = 0; i < this.batchExecs.length; i++) {
            const batchExec = this.batchExecs[i]

            if (now > batchExec) {
                this.batchExecs = this.batchExecs.slice(i)

                break
            }
        }

        const runningWorkers = this.batchExecs.length * 3
        if (runningWorkers > MaxWorkers) {
            return false
        }

        return true
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

        // if (!this.workerLimiter()) {
        //     console.log("limited workers")
        //     return
        // }

        this.updateBatch()

        await this.startTo(performance.now() + DeltaShotgunExec)

        // console.log(2)
        // await this.startBatches()

        // console.log(3)
        // let now = performance.now()
        // if (now - this.lastSleep >= DeltaSleep) {
        //     this.lastSleep = now
        //     // console.log("update")

        //     await safeSleepTo(this.ns, 100, this.bestTargetData, 100)
        // }
    }
}


// TODO things sometimes break when witching targets 