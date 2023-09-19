import { estimateX } from "Helpers/EstimateX"
import { getMinSecGrowTime, getMinSecHackTime, getMinSecWeakenTime } from "Helpers/MyFormulas"
import { distributeThreads } from "HybridShotgunBatcher/Helpers"
import { getLowSecHoleStart, goToNextSecHole, getNextSecHole, inLowSecHole, getNextLowSecEnd } from "HybridShotgunBatcher/SecHoles"
import { StartMargin, WGHMargin, execMargin, hostRamMargin, lowSecHoleTime, minDeltaBatchExec } from "HybridShotgunBatcher/Settings"
import { getServers } from "Other/ScanServers"

class Batch {
    constructor(hack, grow, weaken) {
        this.hack = hack
        this.grow = grow
        this.weaken = weaken
    }

    RamUsage = {
        "hack": 1.70, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
        "grow": 1.75, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
        "weaken": 1.75 // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
    }

    RelativeTime = {
        "hack": 1,
        "grow": 3.2,
        "weaken": 4
    }

    RamUsage = {
        "hack": 1.70, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
        "grow": 1.75, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
        "weaken": 1.75 // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
    }

    hRam() {
        return this.hack * this.RamUsage.hack
    }

    gRam() {
        return this.grow * this.RamUsage.grow
    }

    wRam() {
        return this.weaken * this.RamUsage.weaken
    }

    ramUsage() {
        return (
            this.hRam() +
            this.gRam() +
            this.wRam()
        )
    }
}


function extendListTo(list, newLen, defaultValFunc) {
    const extraNeededElements = newLen - list.length

    for (let i = 0; i < extraNeededElements; i++) {
        list.push(defaultValFunc())
    }

    return list
}

class ScheduleData {
    /**
     * @param {Number} execTime 
     * @param {String} type one of the following "hack", "grow", "weaken"
     * @param {TargetData} targetData
     */
    constructor(execTime, type, targetData) {
        this.execTime = execTime
        // this.target = target
        this.type = type
        // this.batch = batch
        this.targetData = targetData
    }

    copy() {
        return ScheduleData(
            this.execTime,
            this.type,
            this.targetData,
        )
    }
}


export function getBestMoneyBatch(ns, target, availableRam) {
    function hackThreadsToRam(hackThreads) {
        // exec order: ghw
        threads.hack = Math.floor(hackThreads)

        const moneyStolenD = ns.hackAnalyze(target) * threads.hack
        const neededMoneyIncD = 1 / (1 - moneyStolenD)

        threads.grow = ns.growthAnalyze(target, neededMoneyIncD)
        threads.grow = Math.ceil(threads.grow)

        const secInc =
            ns.hackAnalyzeSecurity(threads.hack) +
            ns.growthAnalyzeSecurity(threads.grow)

        threads.weaken = secInc / ns.weakenAnalyze(1)
        threads.weaken = Math.ceil(threads.weaken)

        return threads.ramUsage()
    }

    const hackPart = ns.hackAnalyze(target)
    if (hackPart == 0) {
        return new Batch()
    }

    const hackForHalf = 0.5 / hackPart
    let threads = new Batch()

    estimateX(ns, hackThreadsToRam, availableRam, 0, hackForHalf, 0, 0, "min")

    return threads
}

/**
 * @param {NS} ns 
 * @param {String} target 
 * @returns {Threads}
 * 
 * Gets the batch that will get the most money (the optimal batch) for a given target.
 * Without considering the ram usage.
 * */

export function getOptimalMoneyBatch(ns, target) {
    return getBestMoneyBatch(ns, target, Infinity)
}


class TargetData {
    constructor(ns, target) {
        this.target = target
        this.execTime = performance.now()
        this.fixedStatus = 0
        this.batch = getOptimalMoneyBatch(ns, target)
        this.baseSecurity = ns.getServerSecurityLevel(target)
        this.baseMoney = ns.getServerMoneyAvailable(target)
    }
}


/**
 * @param {NS} ns 
 * @returns {Array<TargetData>}
 */
function getTargetsData(ns) {
    const servers = getServers(ns)

    let targetsData = {}
    for (const target of servers) {
        targetsData[target] = new TargetData(ns, target)
    }

    return targetsData
}


const maxHolesLookAhead = 1


class BatchScheduler {
    constructor() {
        this.secHoleStart = getLowSecHoleStart()

        // the ram usage for the sec holes starting at the one we´re in
        // i.e the first element is the ram usage for the current lowSecHole
        this.secHoleRamUsage = []
        this.secHoleThreadStarts = []
    }

    /**
     * return the amount of lowSecHoles that would be before {time} but after 
     * {this.secHoleStart}
     * @param {Number} time 
     * @returns 
     */
    holesTo(time) {
        const timeToTime = time - this.secHoleStart
        const holesToTime = Math.ceil(timeToTime / execMargin)

        return holesToTime
    }

    /**
     * the ram is allocated for all sec holes before the execTime and 
     * after the startTime (including the secHole that the startTime is in)
     */
    allocRam(startTime, execTime, ramAmount, allocList = null) {
        let customAllocList = true
        if (allocList == null) {
            customAllocList = false
            allocList = this.secHoleRamUsage
        }

        const holesToFirst = this.holesTo(startTime) - 1
        const holesToLast = this.holesTo(execTime)

        // add new low sec holes to store the ram usage in
        allocList = extendListTo(allocList, holesToLast + 1, () => 0)

        for (let i = holesToFirst; i <= holesToLast; i++) {
            allocList[i] += ramAmount
        }

        if (!customAllocList) {
            this.secHoleRamUsage = allocList
        } else {
            return allocList
        }
    }

    /**
     * @param {NS} ns 
     * @param {TargetData} targetData 
     */
    allocBatchRam(ns, targetData, allocList = null) {
        /**   
         * now W G    H  execTime
         *  v  v v    v     v 
         *  |--I-----------|
         *  |----I--------|
         *  |---------I--|
         *  |-|          |-|
         *  Msec      2 * WGHMargin
         *               |--|
         *            3 * WGHMargin
         * (Msec i.e additionalMsec)
         */

        const target = targetData.target
        const execTime = targetData.execTime
        const batch = targetData.batch

        // console.log(batch)

        const wRam = batch.wRam()
        const gRam = batch.gRam()
        const hRam = batch.hRam()

        const wStart = this.getStartTime(ns, target, execTime, "weaken", targetData.baseSecurity) 
        const gStart = this.getStartTime(ns, target, execTime, "grow", targetData.baseSecurity) 
        const hStart = this.getStartTime(ns, target, execTime, "hack", targetData.baseSecurity) 

        if (allocList == null) {
            this.allocRam(wStart, execTime, wRam)
            this.allocRam(gStart, execTime, gRam)
            this.allocRam(hStart, execTime, hRam)
        } else {
            allocList = []
            allocList = this.allocRam(wStart, execTime, wRam, allocList)
            allocList = this.allocRam(gStart, execTime, gRam, allocList)
            allocList = this.allocRam(hStart, execTime, hRam, allocList)

            return allocList
        }
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     */
    deAllocBatchRam(ns, scheduleData) {
        let startTime
        let ram

        const batch = scheduleData.targetData.batch
        const security = scheduleData.targetData.baseSecurity

        switch (scheduleData.type) {
            case "hack":
                startTime = this.getThreadStartTime(ns, scheduleData, security)
                ram = batch.hRam()

                this.allocRam(startTime, scheduleData.execTime, -ram)
            case "grow":
                startTime = this.getThreadStartTime(ns, scheduleData, security)
                ram = batch.gRam()

                this.allocRam(startTime, scheduleData.execTime, -ram)

            case "weaken":
                startTime = this.getThreadStartTime(ns, scheduleData, security)
                ram = batch.wRam()

                this.allocRam(startTime, scheduleData.execTime, -ram)
        }
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     * @returns the last time that a thread can start (the most optimal) 
     */
    getStartTime(ns, target, execTime, type, security) {

        // exec order: ghw
        if (type == "weaken") {
            const wTime = getMinSecWeakenTime(ns, target, security)

            return execTime - wTime - WGHMargin * 1

        } else if (type == "grow") {
            const gTime = getMinSecGrowTime(ns, target, security)

            return execTime - gTime - WGHMargin * 3


        } else if (type == "hack") {
            const hTime = getMinSecHackTime(ns, target, security)

            return execTime - hTime - WGHMargin * 2

        } else {
            throw new Error(
                `invalid scheduleData.type \n` +
                `    type is "${type}" \n` +
                `    valid types: "hack", "grow", "waken"`)
        }
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     * @returns the last time that a thread can start (the most optimal) 
     */
    getThreadStartTime(ns, scheduleData, security) {
        const execTime = scheduleData.execTime
        const type = scheduleData.type
        const target = scheduleData.targetData.target
        // exec order: ghw
        return this.getStartTime(ns, target, execTime, type, security)
    }


    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     */
    scheduleThreadStartHole(ns, scheduleData) {
        const startTime = this.getThreadStartTime(ns, scheduleData, scheduleData.targetData.baseSecurity)

        const startHoleEndTime = getNextLowSecEnd(startTime) - execMargin
        const curHoleEndTime = this.secHoleStart + lowSecHoleTime

        const holesToStart = (startHoleEndTime - curHoleEndTime) / execMargin

        this.secHoleThreadStarts = extendListTo(this.secHoleThreadStarts, holesToStart + 1, () => [])

        if (holesToStart < 0) {
            throw new Error(
                `Can't start threads in a surpassed lowSecHole. \n` +
                `Tried to start it at hole ${holesToStart}`)
        }

        this.secHoleThreadStarts[holesToStart].push(scheduleData)

        return holesToStart
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     */
    startThreads(ns, scheduleData) {
        // console.log(scheduleData)

        const type = scheduleData.type
        const target = scheduleData.targetData.target
        const threads = scheduleData.targetData.batch[type]

        const typeToScript = {
            "weaken": "HybridShotgunBatcher/ThreadScripts/Weaken.js",
            "grow": "HybridShotgunBatcher/ThreadScripts/Grow.js",
            "hack": "HybridShotgunBatcher/ThreadScripts/Hack.js",
        }

        const script = typeToScript[type]

        const security = ns.getServerSecurityLevel(target)
        const startTime = this.getThreadStartTime(ns, scheduleData, security)
        const toStart = startTime - performance.now()

        if (toStart < 0) {
            throw new Error([
                "can't start threads in the past",
                `    startTime: ${startTime}`,
                `    toStart: ${toStart}`,
                `    now: ${performance.now()}`,
                `    toStart: ${toStart}`,
            ].join("\n"))
        }

        // if (script == undefined) {
        //     throw new Error(
        //         `invalid scheduleData.type \n` +
        //         `    type is "${type}" \n` +
        //         `    valid types: "hack", "grow", "waken"`)
        // }

        distributeThreads(ns,
            script,
            threads,
            target,
            toStart,
            scheduleData.execTime,
            security,
            scheduleData.targetData.baseSecurity)

        return true
    }

    /**
     * @param {NS} ns 
     * @param {ScheduleData} scheduleData 
     */
    attemptThreadStart(ns, scheduleData) {
        const target = scheduleData.targetData.target

        const security = ns.getServerSecurityLevel(target)
        const startTime = this.getThreadStartTime(ns, scheduleData, security)
        const toStart = startTime - performance.now()

        // console.log(startTime, toStart, performance.now(), getLowSecHoleStart(), getLowSecHoleEnd())

        const maxExec = (getNextLowSecEnd() - performance.now()) + execMargin * maxHolesLookAhead

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

        if (toStart < 0) {
            // we can't start a batch in the past

            // const target = scheduleData.targetData.target

            throw new Error(
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
            )

        } else if (toStart <= maxExec) {
            this.startThreads(ns, scheduleData)

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
            this.attemptThreadStart(ns, scheduleData)

        } else {
            // schedule it for later
            this.scheduleThreadStartHole(ns, scheduleData)
        }
    }

    removeOldSecHoleData(ns) {
        // remove the allocation data / start data 
        // from the lowSecHole that is now before performance.now()

        const curSecHoleStart = getLowSecHoleStart()
        const nFromOldToNewHole = this.holesTo(curSecHoleStart)

        // if a batch is cancelled remove the allocated ram that wont be used
        for (let i = 0; i < nFromOldToNewHole; i++) {
            const unscheduledThreads = this.secHoleThreadStarts[i] ?? []

            for (const scheduleData of unscheduledThreads) {
                this.deAllocBatchRam(ns, scheduleData)
            }

        }

        this.secHoleRamUsage = this.secHoleRamUsage.slice(nFromOldToNewHole)
        this.secHoleThreadStarts = this.secHoleThreadStarts.slice(nFromOldToNewHole)

        this.secHoleStart = curSecHoleStart
    }

    /**
     * @param {TargetData} targetData 
     */
    scheduleBatch(ns, targetData) {
        this.allocBatchRam(ns, targetData)

        const scheduleData = new ScheduleData(
            targetData.execTime,
            "weaken",
            targetData,
        )

        this.scheduleThreadStartHole(ns, scheduleData)
    }

    /**
     * @param {NS} ns 
     */
    async run(ns) {
        for (let i = 0; i < maxHolesLookAhead; i++) {
            for (const scheduleData of this.secHoleThreadStarts[i]) {
                this.attemptThreadStart(ns, scheduleData)
            }
        }

        await goToNextSecHole(ns)

        this.removeOldSecHoleData(ns)
    }

}

/**
 * @param {NS} ns 
 * @returns 
 */
function getTotalHsbRam(ns) {
    const hostName = ns.getHostname()
    const allServers = getServers(ns)

    const availableServers = allServers.filter(
        (x) => {
            if (ns.getServerMaxRam(x) == 0) {
                return false
            }

            if (x == ns.getHostname()) {
                return false
            }

            if (!ns.hasRootAccess(x)) {
                return false
            }

            return true
        }
    )

    const serverRam = availableServers.reduce(
        (partialSum, serverName) => {
            // remove 2 gb from each server

            // if we don't do this the available ram might spread out on several servers 
            // ex (server 1) ram: 1, (server 2) ram: 1, (server 3) ram: 1
            // this would result in a total available ram of 3.
            // that would make it believe it has space for another hack thread (1.6 gb of ram)
            // but no server has enough ram fo it 
            // resulting in the process crashing

            // therefor we remove ram from the available ram

            // we also add a 1% margin for possible allocations from other sources
            const serverARam = Math.max(0, ns.getServerMaxRam(serverName) - 2) * 0.99

            return partialSum + serverARam

        }, 0  // initial value
    )

    // check if the amount of ram on the servers is lees than the ram on home
    // if so add home as a possibility for WGH thread distribution 
    const hostTotalAvailableRam = Math.max(0, ns.getServerMaxRam(hostName) - hostRamMargin) * 0.99

    if (serverRam < hostTotalAvailableRam) {
        const maxRam = serverRam + hostTotalAvailableRam

        return maxRam
    }

    return serverRam
}

/**
 * returns the amount of batches that can be started 
 * @param {NS} ns 
 * @param {BatchScheduler} batchScheduler 
 * @param {*} target 
 * @param {*} targetData 
 */
function getMaxBatchesForRam(ns, batchScheduler, targetData) {
    // WARNING the amount of batches is only accurate if 
    // 1. All of the batches start within the same start hole, i.e the 
    // aSec - sleepCorrector shouldn't be > execMargin.
    // 2. All of tha batches finish after the same secHoleEnd and
    // before the same secHoleStart.
    const batchHoleRamUsage = batchScheduler.allocBatchRam(ns, targetData, [])

    const availableRam = getTotalHsbRam(ns)

    let maxBatches = Infinity

    for (let i = 0; i < batchHoleRamUsage.length; i++) {
        const holeUsedRam = batchHoleRamUsage[i] ?? 0
        const holeAvailableRam = availableRam - holeUsedRam

        const holeMaxBatches = holeAvailableRam / holeUsedRam
        maxBatches = Math.min(maxBatches, holeMaxBatches)
    }

    return maxBatches
}


/**
 * ensures that the batch won't collide with a lowSecHole nor try
 * to start in the past 
 * @param {NS} ns 
 * @param {TargetData} targetData 
 */
function ensureValidExec(ns, targetData) {
    const target = targetData.target

    // The firstStartTime should be at the end of a lowSecHole.
    // The firstExecTime shouldn't collide with another batch,
    // but it can collide with a lowSecTime

    // we can't launch a batch in "the past"
    const firstStartTime = getNextLowSecEnd()
    const batchTime = getMinSecWeakenTime(ns, target, targetData.baseSecurity) + WGHMargin + StartMargin
    const firstExecForTime = firstStartTime + batchTime
    targetData.execTime = Math.max(targetData.execTime, firstExecForTime)

    // check if the batch collides with a lowSecHole
    if (inLowSecHole(targetData.execTime - minDeltaBatchExec) ||  // start in lowSec
        inLowSecHole(targetData.execTime) ||  // end in lowSec
        getNextSecHole(targetData.execTime - minDeltaBatchExec) < targetData.execTime) { // lowSec in between start and end 

        // then we can't start a batch at execTime
        // this is the next valid exec time that won't collide
        targetData.execTime = getNextLowSecEnd(targetData.execTime) + minDeltaBatchExec
    }
}


/**
 * @param {NS} ns 
 * @param {BatchScheduler} batchScheduler 
 * @param {Number} maxRam 
 * @param {TargetData} targetData 
 * @returns 
 */
function enoughRam(ns, batchScheduler, maxRam, targetData) {
    const batchHoleRamUsage = batchScheduler.allocBatchRam(
        ns,
        targetData,
        batchScheduler.secHoleRamUsage)

    for (const ramUsage of batchHoleRamUsage) {
        if (maxRam < ramUsage) {
            return false
        }
    }

    return true
}

/**
 * ensures that there's available ram for the batch
 * If it's not valid then it will push the execTime up to a point where 
 * there's is enough available ram for the batch
 * @param {NS} ns 
 * @param {BatchScheduler} batchScheduler 
 * @param {TargetData} targetData 
 * @returns {Boolean} whether or not the execTime had to be pushed
 */
function ensureAvailableRam(ns, batchScheduler, maxRam, targetData) {
    if (enoughRam(ns, batchScheduler, maxRam, targetData)) {
        return true
    }

    const target = targetData.target
    const execTime = targetData.execTime

    const wStart = this.getStartTime(ns, target, execTime, "weaken", targetData.baseSecurity) 
    const gStart = this.getStartTime(ns, target, execTime, "grow", targetData.baseSecurity) 
    const hStart = this.getStartTime(ns, target, execTime, "hack", targetData.baseSecurity) 

    // the aSec at the minimal
    const wASec = getNextLowSecEnd(wStart) - wStart
    const gASec = getNextLowSecEnd(gStart) - gStart
    const hASec = getNextLowSecEnd(hStart) - hStart

    targetData.execTime += Math.min(wASec, gASec, hASec)

    return false
}


function shed(ns, batchScheduler, targetData) {
    const availableRam = getTotalHsbRam(ns)

    const firstStartTime = getNextLowSecEnd()
    const lastStartTime = firstStartTime + maxHolesLookAhead * execMargin

    // only one target
    const batchTime = ns.getWeakenTime(targetData.target) + WGHMargin + StartMargin

    let startTime
    while (true) {
        startTime = targetData.execTime - batchTime
        if (startTime > lastStartTime) {
            break
        }

        ensureValidExec(ns, targetData)

        startTime = targetData.execTime - batchTime
        if (startTime > lastStartTime) {
            break
        }


        if (!ensureAvailableRam(ns, batchScheduler, availableRam, targetData)) {
            // revalidate the execTime 
            continue
        }

        // we don't have to check if we can stop here since it will reLoop 
        // if the execTime changed 

        batchScheduler.scheduleBatch(ns, targetData)

        targetData.execTime += minDeltaBatchExec
    }

}


/**
 * Gets the max amount of batches that start at the firstStartTime (+ up to ExecMargin)
 * And end before the lowSecHole after targetData.execTime
 * @param {NS} ns 
 * @param {String} target 
 * @param {*} targetData 
 * @param {Number} firstStartTime 
 * @returns 
 */
function getMaxBatchesForTime(ns, targetData, firstStartTime) {
    const target = targetData.target

    // The firstStartTime should be at the end of a lowSecHole.
    // The firstExecTime shouldn't collide with another batch,
    // but it can collide with a lowSecTime

    // we can't launch a batch in the past
    const batchTime = getMinSecWeakenTime(ns, target, targetData.baseSecurity) + WGHMargin + StartMargin
    const firstExecForTime = firstStartTime + batchTime
    let execTime = Math.max(targetData.execTime, firstExecForTime)

    // check if the batch collides with a lowSecHole
    if (inLowSecHole(execTime - minDeltaBatchExec) ||  // start in lowSec
        inLowSecHole(execTime) ||  // end in lowSec
        getNextSecHole(execTime - minDeltaBatchExec) < execTime) { // lowSec in between start and end 

        // then we can't start a batch at execTime
        // this is the next valid exec time that won't collide
        execTime = getNextLowSecEnd(execTime) + minDeltaBatchExec
    }

    // the last exec time if we start it right before the next lowSecHole starts
    const maxExecForStart = firstStartTime + execMargin + batchTime

    // the execTime would end right before the lowSecHole begins
    const maxExecForEnd = getNextSecHole(execTime)
        // if execTime is already at the end it would round up to the next hole
        // therefore remove that extra time
        % execMargin

    const maxExecTime = Math.min(maxExecForStart, maxExecForEnd)

    const maxBatches = Math.floor(maxExecTime - execTime) + 1

    targetData.execTime = execTime

    return maxBatches
}

/**
 * schedules new batches that will start at x, firstStartTime <= x <= firstStartTime + execMargin
 * 
 * @param {NS} ns 
 * @param {BatchScheduler} batchScheduler 
 * @param {TargetData} targetData 
 * @param {Number} firstStartTime 
 * @returns if it started any batches
 */
function idk(ns, batchScheduler, targetData, firstStartTime) {
    // All of the batches in nBefSecHole can be started sequentially with 
    // a constant spacer. The same is true for nAftSecHole. (but not together)

    // amount of batches that can be started that will all have their exec time 
    // before an arbitrary lowSecHole
    const nBefSecHole = Math.min(
        getMaxBatchesForRam(ns, batchScheduler, targetData),
        getMaxBatchesForTime(ns, targetData, firstStartTime)
    )

    for (let i = 0; i < nBefSecHole; i++) {
        batchScheduler.scheduleBatch(ns, targetData)

        targetData.execTime += minDeltaBatchExec
    }

    // amount of batches that can be started that will all have their exec time 
    // after that same arbitrary lowSecHole
    const nAftSecHole = Math.min(
        getMaxBatchesForRam(ns, batchScheduler, targetData),
        getMaxBatchesForTime(ns, targetData, firstStartTime)
    )

    for (let i = 0; i < nAftSecHole; i++) {
        batchScheduler.scheduleBatch(ns, targetData)

        targetData.execTime += minDeltaBatchExec
    }

    return nBefSecHole + nAftSecHole == 0 ? false : true
}

/**
 * @param {NS} ns 
 * @param {Object<TargetData>} targetsData 
 * @returns {Array<String>} the target prio from best to worst
 */
function getTargetPriority(ns, targetsData) {
    const targetInfo = []

    for (const target in targetsData) {
        const targetData = targetsData[target]

        const batch = targetData.batch

        const moneyPerMs = getMoneyPerMs(ns, target, batch)
        const moneyPerMsPerRam = moneyPerMs / batch.ramUsage()

        targetInfo.push([target, moneyPerMsPerRam])
    }

    // sort the targetInfo in descending moneyPerMsPerRam order
    const targetPriority = targetInfo
        .sort((a, b) => b[1] - a[1])  // best one first
        .map(x => x[0])  // remove unnecessary data

    return targetPriority
}

/**
 * 
 * @param {NS} ns 
 * @param {Object<TargetData>} targetsData 
 * @param {BatchScheduler} batchScheduler
 */
function somethingSchedule(ns, targetsData, batchScheduler) {
    /*
    we only schedule batches that start before the next lowSecHoleEnd
    this it to avoid schedule latency, i.e when you get out of the 
    lowSecHole due to the calculations taking more time than there is 
    time in the lowSecHole 
    */

    const firstStart = getNextLowSecEnd()

    const targetPrio = ["n00dles"]  // getTargetPriority(ns, targetsData)

    for (const target of targetPrio) {
        const targetData = targetsData[target]

        const minBatchTime = getMinSecWeakenTime(ns, target, targetData.baseSecurity) + WGHMargin + StartMargin

        /*
        To fill the ram for the target we have to completely occupy the 
        ram space up to the execTime of a batch that would be started 
        this instant.

        We do this to ensure that it will always have the ram needed for 
        the target reserved. As soon as the next batch completes there 
        will be ram reserved for a new batch 

        Unless the target priority changes there will always be ram to 
        replace the batch when it completes.

        we have to start batches up to {maxStartTime} for that to be that
        case.
        */
        const maxStartTime = performance.now() + minBatchTime + execMargin * maxHolesLookAhead

        let startTime = firstStart
        while (true) {
            idk(ns, batchScheduler, targetData, startTime)

            if (startTime > maxStartTime) {
                break
            }

            startTime += execMargin
        }
    }
}

/**
 * @param {NS} ns 
 */
async function test(ns) {
    const batchScheduler = new BatchScheduler()
    const targetsData = getTargetsData(ns)

    console.log(targetsData)
    while (true) {
        await goToNextSecHole(ns)

        batchScheduler.removeOldSecHoleData(ns)

        for (let i = 0; i < maxHolesLookAhead; i++) {
            const secHoleThreads = batchScheduler.secHoleThreadStarts[i] ?? []
            for (const scheduleData of secHoleThreads) {
                this.attemptThreadStart(ns, scheduleData)
            }
        }

        // somethingSchedule(ns, targetsData, batchScheduler)

        console.log(JSON.stringify(batchScheduler.secHoleRamUsage))
        console.log(JSON.stringify(batchScheduler.secHoleThreadStarts))
    }
}

/**
 * @param {NS} ns 
 */
export async function main(ns) {
    const batchScheduler = new BatchScheduler()
    const targetsData = getTargetsData(ns)

    // shed(ns, batchScheduler, targetsData["n00dles"])

    // const x = targetsData["n00dles"]
    // x.execTime = performance.now() + 5000
    const start = performance.now()

    let scheduleData

    scheduleData = new ScheduleData(
        start + 5000,
        "weaken",
        targetsData["n00dles"]
    )
    batchScheduler.scheduleThreadStartHole(ns, scheduleData)
    
    // scheduleData = new ScheduleData(
    //     start + 5006,
    //     "weaken",
    //     targetsData["n00dles"]
    // )
    // batchScheduler.scheduleThreadStartHole(ns, scheduleData)
    
    // scheduleData = new ScheduleData(
    //     start + 5012,
    //     "weaken",
    //     targetsData["n00dles"]
    // )
    // batchScheduler.scheduleThreadStartHole(ns, scheduleData)
    
    // scheduleData = new ScheduleData(
    //     start + 4999,
    //     "hack",
    //     targetsData["n00dles"]
    // )
    // batchScheduler.scheduleThreadStartHole(ns, scheduleData)

    // scheduleData = new ScheduleData(
    //     start + 4998,
    //     "grow",
    //     targetsData["n00dles"]
    // )
    // batchScheduler.scheduleThreadStartHole(ns, scheduleData)


    // x.execTime += minDeltaBatchExec

    // batchScheduler.scheduleBatch(ns, x)
    // x.execTime += minDeltaBatchExec

    // batchScheduler.scheduleBatch(ns, x)
    // x.execTime += minDeltaBatchExec

    // batchScheduler.scheduleBatch(ns, x)
    // x.execTime += minDeltaBatchExec

    // console.log(batchScheduler.secHoleRamUsage)

    // console.log(targetsData)
    while (true) {
        await goToNextSecHole(ns)

        batchScheduler.removeOldSecHoleData(ns)

        console.log([...batchScheduler.secHoleThreadStarts])

        for (const target in targetsData) {
            targetsData[target].baseSecurity = ns.getServerSecurityLevel(target)
        }

        for (let i = 0; i < maxHolesLookAhead; i++) {
            const secHoleThreads = batchScheduler.secHoleThreadStarts[i]

            if (secHoleThreads == undefined) {
                continue
            }

            batchScheduler.secHoleThreadStarts[i] = []

            for (const scheduleData of secHoleThreads) {
                batchScheduler.attemptThreadStart(ns, scheduleData)
            }
        }

        // console.log(batchScheduler.secHoleRamUsage)
        console.log([...batchScheduler.secHoleThreadStarts])

        // console.log(batchScheduler.secHoleRamUsage.copy())
        // console.log(batchScheduler.secHoleThreadStarts.copy())
    }
}
