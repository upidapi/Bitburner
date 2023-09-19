import { getMinSecWeakenTime } from "Helpers/MyFormulas"
import { getHsbRamData } from "thread/Other"
import { ScheduleData, extendListTo, safeSleepTo } from "thread/Scheduling/Helpers"
import { BatchStartMargin, DeltaBatchExec, DeltaShotgunExec, DeltaThreadExec, SleepAccuracy, SpeedStart, ThreadStartMargin, smallNum } from "thread/Setings"
import { getBestFixBatch, getBestMoneyBatch, getOptimalFixBatch } from "thread/Targeting"
import { startWorker } from "thread/Worker"

export const BatchTime = 500

/**
 * pros:
 * - ram efficiency
 * - sub batching
 * - jit based
 * 
 * cons: 
 * - slow
 *   - can't go below 1ms per thread
 * - instable
 */
export class EffectiveScheduler {
    /**
     * @param {NS} ns 
     */
    constructor(ns) {
        this.ns = ns

        this.targetsData = []
        this.bestTargetData = null

        this.hsbServersData = []
        this.hsbRam = 0

        this.subBatchExec = 0
        this.lastShotgunStart = 0

        // the ram usage for the following shotguns starting at the one we´re in
        // i.e the first element is the ram usage for the current lowSecHole

        // this one has margins to avoid over allocations from early starts and 
        // delayed ends
        this.shotgunRamUsage = []

        // this one is the actual ram usage whiteout any margins. Used to calc
        // the current ram usage for batching 
        this.shotgunTrueRamUsage = []

        this.shotgunThreadStarts = []

        // valid times to start new shotguns
        this.batchExecs = []

        this.removeOldSecHoleData()
    }

    /**
     * return the amount of lowSecHoles that would be before {time} but after 
     * {this.secHoleStart}
     * @param {Number} time 
     * @returns 
     */
    shotgunsTo(time) {
        const timeToTime = time - this.lastShotgunStart
        const shotgunsToTime = Math.ceil(timeToTime / DeltaShotgunExec)

        return shotgunsToTime
    }

    /**
     * the ram is allocated for all shotguns before the execTime and 
     * after the startTime (including the shotguns that the startTime is in)
     */
    allocRam(allocList, startTime, execTime, ramAmount) {
        const holesToFirst = this.shotgunsTo(startTime) - 1
        const holesToLast = this.shotgunsTo(execTime)

        // add new low sec holes to store the ram usage in
        allocList = extendListTo(allocList, holesToLast + 1, () => 0)

        for (let i = holesToFirst; i <= holesToLast; i++) {
            allocList[i] += ramAmount
        }

        return allocList
    }

    allocThread(startTime, execTime, ram) {
        this.shotgunRamUsage = this.allocRam(
            this.shotgunRamUsage,
            startTime - SleepAccuracy,
            execTime + SleepAccuracy,
            ram
        )

        this.shotgunTrueRamUsage = this.allocRam(
            this.shotgunTrueRamUsage,
            startTime,
            execTime,
            ram
        )
    }

    /**
     * @param {NS} ns 
     * @param {TargetData} targetData 
     */
    allocBatchRam(targetData) {
        /**   
         * now W G    H  execTime
         *  v  v v    v     v 
         *  |--I-----------|
         *  |----I--------|
         *  |---------I--|
         *  |-|          |-|
         *  Msec      2 * DeltaBatchExec
         *               |--|
         *            3 * DeltaBatchExec
         * (Msec i.e additionalMsec)
         */

        const target = targetData.target
        const execTime = targetData.execTime
        const batch = targetData.batch

        const wRam = batch.wRam()
        const gRam = batch.gRam()
        const hRam = batch.hRam()

        const wStart = this.getStartTime(target, execTime, "weaken")
        const gStart = this.getStartTime(target, execTime, "grow")
        const hStart = this.getStartTime(target, execTime, "hack")

        this.allocThread(wStart, execTime, wRam)
        this.allocThread(gStart, execTime, gRam)
        this.allocThread(hStart, execTime, hRam)
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     */
    deAllocBatchRam(scheduleData) {

        const batch = scheduleData.targetData.batch
        const execTime = scheduleData.execTime
        const target = scheduleData.target

        let startTime
        let ram

        // console.log("-1", [...this.shotgunRamUsage])

        startTime = this.getStartTime(target, execTime, "hack")
        ram = batch.hRam()
        this.allocThread(startTime, execTime, -ram)

        if (scheduleData.type == "hack") {
            return
        }

        // console.log("-2", [...this.shotgunRamUsage])

        startTime = this.getStartTime(target, execTime, "grow")
        ram = batch.gRam()
        this.allocThread(startTime, execTime, -ram)

        if (scheduleData.type == "grow") {
            return
        }

        // console.log("-3", [...this.shotgunRamUsage])

        startTime = this.getStartTime(target, execTime, "weaken")
        ram = batch.wRam()
        this.allocThread(startTime, execTime, -ram)

        // console.log("-4", [...this.shotgunRamUsage])

        if (scheduleData.type == "weaken") {
            return
        }

        throw new Error(`invalid scheduleData.type: ${scheduleData.type}`)
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     * @returns the last time that a thread can start (the most optimal) 
     */
    getStartTime(target, execTime, type) {
        const ns = this.ns

        const hTime = ns.getHackTime(target)

        // exec order: ghw
        const startToExec = {
            "weaken":
                ThreadStartMargin * 0 + hTime * 4,
            "grow":
                ThreadStartMargin * 2 + hTime * 3.2,
            "hack":
                ThreadStartMargin * 1 + hTime * 1,
        }[type]

        return execTime - startToExec
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     * @returns the last time that a thread can start (the most optimal) 
     */
    getThreadStartTime(scheduleData) {
        const execTime = scheduleData.execTime
        const type = scheduleData.type
        const target = scheduleData.targetData.target
        // exec order: ghw
        return this.getStartTime(target, execTime, type)
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     */
    scheduleThreadStartHole(scheduleData) {
        const startTime = this.getThreadStartTime(scheduleData)

        // console.log(startTime, startTime - performance.now(), this.lastShotgunStart - performance.now(), this.shotgunsTo(startTime))
        const shotgunsToStart = this.shotgunsTo(startTime) - 1

        // console.log(shotgunsToStart)

        if (shotgunsToStart < 0) {
            throw new Error(
                `Can't start threads in a surpassed lowSecHole. \n` +
                `Tried to start it at hole ${shotgunsToStart}`)
        }

        this.shotgunThreadStarts = extendListTo(this.shotgunThreadStarts, shotgunsToStart + 1, () => [])
        this.shotgunThreadStarts[shotgunsToStart].push(scheduleData)

        // return shotgunsToStart
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     */
    async startThreads(scheduleData, compiling = false) {
        const ns = this.ns

        // console.log(scheduleData)

        const type = scheduleData.type

        const typeOffset = {
            "weaken": DeltaThreadExec * 0,
            "grow": DeltaThreadExec * 2,
            "hack": DeltaThreadExec * 1,
        }[type]

        // const startTime = this.getThreadStartTime(ns, scheduleData)
        // const toStart = startTime - performance.now()

        // if (toStart < 0) {
        //     throw new Error([
        //         "can't start threads in the past",
        //         `    startTime: ${startTime}`,
        //         `    toStart: ${toStart}`,
        //         `    now: ${performance.now()}`,
        //         `    toStart: ${toStart}`,
        //     ].join("\n"))
        // }

        // console.log(scheduleData)

        let psData = []
        try {
            psData = await startWorker(ns,
                this.hsbServersData,
                scheduleData.targetData.target,
                type,
                scheduleData.targetData.batch[type],
                scheduleData.execTime - typeOffset
            )
        } catch (error) {
            console.log("failed to start batch")
            console.log(error)
            return false
        }

        if (compiling) {
            for (const pData of psData) {
                // console.log(pData)
                if (!ns.kill(
                    JSON.parse(pData[0]),
                    pData[1]
                )) {
                    throw new Error(
                        "couldn't find worker:\n" +
                        `pid: ${pData[0]}\n` +
                        `target: ${pData[1]}\n`
                    )
                }
            }
        }

        return true
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     */
    async attemptThreadStart(scheduleData, maxStart, compiling = false) {
        const ns = this.ns

        const target = scheduleData.targetData.target

        const startTime = this.getThreadStartTime(scheduleData)
        const toStart = startTime - performance.now()

        // console.log(startTime, toStart, performance.now(), getLowSecHoleStart(), getLowSecHoleEnd())

        maxStart = maxStart ?? this.lastShotgunStart + DeltaShotgunExec

        // console.log(
        //     `data:\n` +
        //     `    security: ${ns.getServerSecurityLevel(target)}\n` +
        //     `    min sec: ${ns.getServerMinSecurityLevel(target)}\n` +
        //     `    money: ${ns.getServerMoneyAvailable(target)}\n` +
        //     `    max money: ${ns.getServerMaxMoney(target)}\n` +
        //     `    target: ${target}\n` +
        //     `    stage: ${scheduleData.type}\n` +
        //     `    execTime: ${scheduleData.execTime}\n` +
        //     `    startTime: ${startTime}\n` +
        //     `    toStart: ${startTime - performance.now()}\n`
        // )

        // console.log(toStart)
        if (toStart < 0) {
            // we can't start a batch in the past

            // const target = scheduleData.targetData.target

            console.log(Error(
                `can't start batch in the past\n` +
                `    security: ${ns.getServerSecurityLevel(target)}\n` +
                `    min sec: ${ns.getServerMinSecurityLevel(target)}\n` +
                `    money: ${ns.getServerMoneyAvailable(target)}\n` +
                `    max money: ${ns.getServerMaxMoney(target)}\n` +
                `    target: ${target}\n` +
                `    stage: ${scheduleData.type}\n` +
                `    execTime: ${scheduleData.execTime}\n` +
                `    startTime: ${startTime}\n` +
                `    toStart: ${startTime - performance.now()}\n`
            ))

        } else if (startTime <= maxStart) {
            if (!await this.startThreads(scheduleData, compiling)) {
                return
            }

            const type = scheduleData.type

            if (type == "hack") {
                // we've started all the threads of the batch
                return

            } else if (type == "grow") {
                scheduleData.type = "hack"

            } else if (type == "weaken") {
                scheduleData.type = "grow"
            }

            // incase that we should start the next part of the batch now
            await this.attemptThreadStart(scheduleData, maxStart, compiling)

        } else {

            // schedule it for later
            this.scheduleThreadStartHole(scheduleData)
        }
    }

    /**
     * @param {TargetData} targetData 
     */
    scheduleBatch(targetData) {
        // console.log("-a", [...this.shotgunRamUsage])

        const ramUsageBefore = [...this.shotgunRamUsage]
        const trueRamUsageBefore = [...this.shotgunTrueRamUsage]

        this.allocBatchRam(targetData)

        // console.log("-b", [...this.shotgunRamUsage])

        const scheduleData = new ScheduleData(
            targetData.execTime,
            "weaken",
            targetData,
        )

        // this.deAllocBatchRam(scheduleData)

        // console.log("-c", [...this.shotgunRamUsage])

        // throw new Error()

        // console.log([...this.shotgunRamUsage])

        for (const shotgunRam of this.shotgunRamUsage) {
            if (shotgunRam > this.hsbRam) {
                // this.deAllocBatchRam(scheduleData)

                // console.log("-a", [...this.shotgunRamUsage], this.hsbRam)

                this.shotgunRamUsage = ramUsageBefore
                this.shotgunTrueRamUsage = trueRamUsageBefore

                // console.log(scheduleData)

                // console.log("-b", [...this.shotgunRamUsage], this.hsbRam)

                return false
            }
        }

        this.batchExecs.push(targetData.execTime)
        this.scheduleThreadStartHole(scheduleData)

        return true
    }

    removeOldSecHoleData() {
        // remove the allocation data / start data 
        // from the lowSecHole that is now before performance.now()

        const toCurShotgun = this.shotgunsTo(performance.now())

        // if a batch is cancelled remove the allocated ram that wont be used
        for (let i = 0; i < toCurShotgun; i++) {
            const unscheduledThreads = this.shotgunThreadStarts[i] ?? []

            for (const scheduleData of unscheduledThreads) {
                this.deAllocBatchRam(scheduleData)
                console.log("missed start of scheduleData", scheduleData)
            }

        }

        this.shotgunRamUsage = this.shotgunRamUsage.slice(toCurShotgun)
        this.shotgunTrueRamUsage = this.shotgunTrueRamUsage.slice(toCurShotgun)
        this.shotgunThreadStarts = this.shotgunThreadStarts.slice(toCurShotgun)

        this.lastShotgunStart += DeltaShotgunExec * toCurShotgun
    }

    async startThreadsTo(time, compiling = false) {
        const shotgunsToTime = this.shotgunsTo(time)

        // const curBatchRamUsage = this.shotgunThreadStarts[shotgunsToTime - 1]
        for (let i = 0; i < shotgunsToTime; i++) {
            const threads = this.shotgunThreadStarts[i]

            if (threads == undefined) {
                break
            }

            for (const scheduleData of threads) {
                const s = performance.now()

                await this.attemptThreadStart(scheduleData, time, compiling)

                const e = performance.now()
                console.log(e - s)
            }

            this.shotgunThreadStarts[i] = []
        }
    }

    async goToNextStart() {
        const ns = this.ns

        const toNextShotgun =
            this.lastShotgunStart
            + DeltaShotgunExec
            - performance.now()

        if (toNextShotgun > 0) {
            await safeSleepTo(ns, 0, this.bestTargetData, 1)
        }

        // this.lastShotgunStart = performance.now()
    }

    getStaticRamAvailable(startTime, endTime) {
        // we can assume that the exec time of the targetData is fixed

        // we don't want to try a negative index  
        const holesToFirst = Math.max(0, this.shotgunsTo(startTime) - 1)
        const holesToLast = this.shotgunsTo(endTime)

        // console.log(holesToFirst, holesToLast, [...this.shotgunRamUsage], this.hsbRam)

        let availableSubBatchRam = this.hsbRam
        for (let i = holesToFirst; i <= holesToLast; i++) {
            const ramUsage = this.shotgunRamUsage[i] ?? 0

            availableSubBatchRam = Math.min(
                availableSubBatchRam,
                this.hsbRam - ramUsage
            )

            // console.log(availableSubBatchRam, this.shotgunRamUsage[i])
        }

        return availableSubBatchRam
    }

    /**
     * @param {TargetData} targetData 
     */
    scheduleSubBatch(targetData) {
        const ns = this.ns

        // we can assume that the exec time of the targetData is fixed

        const now = performance.now()
        if (this.subBatchExec + SleepAccuracy > now) {
            // don't start multiple sub batches at once since they are less 
            // effective than normal ones
            return
        }

        const execTime = targetData.execTime

        const availableSubBatchRam = this.getStaticRamAvailable(
            this.getStartTime(
                targetData.target,
                execTime,
                "weaken"
            ) - SleepAccuracy,
            execTime + SleepAccuracy
        )

        const subBatch = getBestMoneyBatch(ns, targetData.target, availableSubBatchRam)
        if (subBatch.weaken == 0) {
            return
        }

        const subBatchTargetData = targetData.copy(ns)
        subBatchTargetData.batch = subBatch

        // console.log({
        //     "hsbRam": this.hsbRam,
        //     "subBatchTargetData": subBatchTargetData,
        //     "availableSubBatchRam": availableSubBatchRam,
        //     "ramUsage": subBatch.ramUsage()
        // })

        this.subBatchExec = execTime
        // console.log(
        //     this.getStartTime(
        //         targetData.target,
        //         execTime,
        //         "weaken"
        //     ),
        //     execTime)

        if (!this.scheduleBatch(subBatchTargetData)) {
            throw new Error("failed to start subBatch")
        }

        console.log("scheduled sub batch")
    }


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

    /**
     * @returns {Bool} if it's ok to start batches 
     */
    scheduleFixIfNeeded() {
        // the this.bestTargetData.execTime is assumed to be fixed

        const ns = this.ns

        const targetData = this.bestTargetData
        const target = targetData.target

        // if (targetData.fixedStatus == "fixed") {
        //     return true
        // }

        if (this.isFixed(target)) {
            return true
        }

        // don't start multiple simultaneous fix batches 
        if (targetData.fixComplete + SleepAccuracy > performance.now()) {
            return false
        }

        const optimalFixBatch = getOptimalFixBatch(ns, target)

        const availableRam = this.getStaticRamAvailable(
            this.getStartTime(
                targetData.target,
                targetData.execTime,
                "weaken"
            ) - SleepAccuracy,
            targetData.execTime + SleepAccuracy
        )

        // console.log(availableRam)

        const fixBatchTargetData = targetData.copy(ns)
        const bestFixBatch = getBestFixBatch(ns, target, availableRam)
        fixBatchTargetData.batch = bestFixBatch

        console.log({
            optimal: optimalFixBatch,
            best: bestFixBatch
        })

        // TODO fix bug where the sec is not decreased as much as expected

        if (bestFixBatch.weaken == 0) {
            // not enough ram for anything

            return false
        }
        // enough ram for something

        // console.log([...this.shotgunRamUsage], this.hsbRam)

        if (!this.scheduleBatch(fixBatchTargetData)) {
            throw new Error("failed to start fix batch")
        }

        // console.log(
        //     "start",
        //     Object.assign({}, targetData),
        //     targetData.fixedStatus,
        //     targetData.fixedStatus == "fixed")

        targetData.fixComplete = fixBatchTargetData.execTime

        console.log({
            complete: targetData.fixComplete,
            now: performance.now(),
            wTime: ns.getWeakenTime(target)
        })

        const minSec = ns.getServerMinSecurityLevel(target)

        const secDec =
            ns.weakenAnalyze(bestFixBatch.weaken)
            - ns.growthAnalyzeSecurity(bestFixBatch.grow)

        targetData.secAftFix = Math.max(
            targetData.security - secDec,
            minSec
        )

        // console.log([...this.shotgunRamUsage], this.hsbRam)

        // if speed start is on we won't wait for the last batch 
        // to complete 
        if (optimalFixBatch.weaken == bestFixBatch.weaken &&
            optimalFixBatch.grow == bestFixBatch.grow &&
            optimalFixBatch.hack == bestFixBatch.hack) {

            console.log("scheduled full fix")

            if (SpeedStart) {
                // best fix batch is optimal
                console.log("since SpeedStart is on it will start batching now")
                return true

            } else {
                // todo add a fix status for when the fix is not enough to fully prep the server
                // probably by adding a .fixComplete
                // to compliment the .fixStatus 

                return false
            }

        } else {

            console.log("scheduled sub fix")
            return false
        }
    }

    scheduleNewBatches() {
        const ns = this.ns

        const targetData = this.bestTargetData
        const target = this.bestTargetData.target

        const wTime = ns.getWeakenTime(target)

        // console.log(this.lastShotgunStart - performance.now(), 
        // this.shotgunsTo(this.lastShotgunStart + DeltaBatchExec))

        const firstExec = this.lastShotgunStart + wTime + smallNum + DeltaShotgunExec
        // console.log(this.lastShotgunStart - now, targetData.execTime - now, firstExec - now)

        targetData.execTime = Math.max(
            targetData.execTime + DeltaBatchExec,
            firstExec
        )

        // console.log(this.shotgunRamUsage)

        if (!this.scheduleFixIfNeeded()) {
            return
        }

        // console.log(this.shotgunRamUsage)

        const lastExec =
            this.lastShotgunStart +
            wTime +
            Math.max(
                SleepAccuracy * 2,
                DeltaShotgunExec * 2
            );


        while (true) {
            // console.log([...this.shotgunRamUsage])

            if (targetData.execTime > lastExec) {
                break
            }

            if (!this.scheduleBatch(targetData)) {
                // not enough ram for another batch

                this.scheduleSubBatch(targetData)
                break
            }

            // console.log("scheduled full batch")
            targetData.execTime += BatchTime
        }

        return true
    }

    async calcBatchTime() {
        const ns = this.ns
        const targetData = new TargetData(ns, "n00dles")

        this.hsbRam = 1000

        targetData.batch = new Batch(1, 1, 1)
        targetData.execTime = performance.now() + ns.getWeakenTime("n00dles") + 10000

        const batchTime = await timeFunction(async () => {
            const hsbServersData = this.hsbServersData.map(
                (val) => Object.assign({}, val)
            )

            this.scheduleBatch(targetData)
            await this.startThreadsTo(Infinity, true)

            this.shotgunRamUsage = []
            this.shotgunTrueRamUsage = []
            this.hsbServersData = hsbServersData
        }, 100)

        this.reset()

        return batchTime
    }

    reset() {
        this.shotgunRamUsage = []
        this.shotgunTrueRamUsage = []

        this.shotgunThreadStarts = []
        this.batchExecs = []

        this.hsbRam = 0

        this.subBatchExec = 0
    }

    updateRamData() {
        const ns = this.ns

        const [totalRam, hsbServersData, availableRam] = getHsbRamData(ns)

        this.hsbServersData = hsbServersData

        // since the shotgunTrueRamUsage[0] is the current hole 
        // we're in there is a large chance that at least a batch
        // completed in the shotgun which would make the 
        // shotgunTrueRamUsage inaccurate
        const usingForBatching = Math.min(
            this.shotgunTrueRamUsage[0] ?? 0,
            this.shotgunTrueRamUsage[1] ?? 0,
        )

        const hsbRam = availableRam + usingForBatching

        // the "* 99.9" is for float inaccuracies  
        if (totalRam * 99.9 < hsbRam) {
            // safety check, technically this shouldn't happen but
            // i can't figure out how to solve it

            // this can still cause problems since the totalRam could
            // be too much when you're running other scripts on the 
            // side

            // TODO fix this problem
            // TODO add more error data
            ns.print({
                "hsbServersData": hsbServersData,
                "hsbRam": this.hsbRam,
                "availableRam": availableRam,
                "total": totalRam
            })

            console.log(totalRam, hsbRam, totalRam < hsbRam)
            console.log({
                "shotgunTrueRamUsage": [...this.shotgunTrueRamUsage],
                "shotgunRamUsage": [...this.shotgunRamUsage],
                "hsbServersData": hsbServersData,
                "hsbRam": hsbRam,
                "availableRam": availableRam,
                "total": totalRam
            })

            // return

            this.hsbRam = totalRam
        }

        this.hsbRam = hsbRam
    }

    shouldRun(totalRam) {
        const ns = this.ns

        const bestTargetData = this.bestTargetData

        const maxForRam = totalRam / bestTargetData.batch.averageRamUsage()

        const effectiveBatchTime =
            getMinSecWeakenTime(ns, bestTargetData.target)
            + DeltaShotgunExec
            + BatchStartMargin

        const maxForTime = (effectiveBatchTime / BatchTime) * 0.5  // margin of error  

        return maxForRam < maxForTime
    }

    async frame() {
        const s = performance.now()
        await this.goToNextStart()
        const e = performance.now()
        // console.log(e - s)

        // console.log([...this.shotgunThreadStarts])

        this.removeOldSecHoleData()

        this.updateRamData()

        await this.startThreadsTo(this.lastShotgunStart + SleepAccuracy)

        this.scheduleNewBatches()

        if (performance.now() > this.lastShotgunStart + SleepAccuracy) {
            // took to much time
            // switch modes

            // throw new Error("took to much time")
            console.log("took to much time")
        }

        await this.startThreadsTo(this.lastShotgunStart + SleepAccuracy)

        if (performance.now() > this.lastShotgunStart + SleepAccuracy) {
            // took to much time
            // switch modes

            // throw new Error("took to much time")
            console.log("took to much time")
        }
    }
}
