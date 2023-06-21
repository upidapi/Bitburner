async function sleep(ms) {
    await new Promise(r => setTimeout(r, ms));
}

class Clock {
    constructor(fps) {
        this.fps = fps
        this.lastTick = Date.now()
        this.deltaTick = null
    }

    async tick() {
        const msPerFrame = 1000 / this.fps
        const sinceLastTick = Date.now() - this.lastTick
        const toNextFrame = msPerFrame - sinceLastTick
        await sleep(toNextFrame)

        this.deltaTick = Date.now() - this.lastTick
        this.lastTick = Date.now()
    }

    getFps() {
        if (this.deltaTick === null) {
            return 0
        }

        const currentFps = 1000 / this.deltaTick
        return currentFps
    }
}

/**
 * draw
 */

/**
 * colours
 */


const colorMap = {
    "sleepCorrector": [0, 77, 255],
    "batchOffset": [0, 157, 255],
    "aSec": [0, 238, 255],

    "hack": [255, 112, 0],
    "grow": [255, 191, 0],
    "weaken": [255, 255, 0],

    "highSec": [255, 0, 0],
    "lowSec": [0, 255, 0],
}

import { WGHData, BatchData, ShotgunData, LogEntry } from "HybridShotgunBatcher/Dashboard/DataClasses";

class Drawer {
    constructor(p5, guiData) {
        this.p5 = p5
        this.guiData = guiData
    }

    drawTimeBox(y, height, startTime, endTime, colour) {
        // draws a rect from "startTime" to "endTime"
        const startPixel = this.guiData.timeToPos(startTime)
        const endPixel = this.guiData.timeToPos(endTime)
        const boxWidth = endPixel - startPixel

        this.p5.stroke(...colour)
        this.p5.fill(...colour)
        this.p5.rect(startPixel, y, boxWidth, height)

        return height
    }

    /**
     * @param {int} y 
     * @param {WGHData} instance 
     */
    drawWGH(y, startTime, instance) {
        // todo set the colours for the types
        const colour = colorMap[instance.WGHType]
        const aSecColour = colorMap["aSec"]

        // draw the aSec time
        this.drawTimeBox(y + this.guiData.baseHeight / 2,
            this.guiData.baseHeight,
            startTime,
            startTime + instance.aSec,
            aSecColour)

        // draw the actually W/H/G
        this.drawTimeBox(y + this.guiData.baseHeight / 2,
            this.guiData.baseHeight,
            startTime + instance.aSec,
            startTime + instance.aSec + instance.duration,
            colour)

        return this.guiData.baseHeight * 1.5
    }

    /**
     * @param {int} y 
     * @param {BatchData} instance 
     */
    drawBatch(y, startTime, batch) {
        const startY = y

        // if the threads are 0, ignore that part
        if (batch.hI.threads != 0) {
            // draw hack
            y += this.drawWGH(y, startTime, batch.hI)
        }

        if (batch.gI.threads != 0) {
            // draw grow
            y += this.drawWGH(y, startTime, batch.gI)
        }

        if (batch.wI.threads != 0) {
            // draw weaken
            y += this.drawWGH(y, startTime, batch.wI)
        }

        const batchHeight = y - startY

        return batchHeight + this.guiData.baseHeight / 2
    }

    /**
     * @param {number} y 
     * @param {number} startTime 
     * @param {BatchData} batch 
     */
    drawSimpleBatch(y, startTime, batch) {
        // todo implement this

        // throw new Error("drawSimpleBatch is unimplemented")

        // the following is just the code for "drawBatch"

        // draw low sec
        this.drawTimeBox(
            y,
            this.guiData.baseHeight,
            startTime,
            startTime + batch.hI.getTotalDuration(),
            colorMap.lowSec)

        // this part should be somewhere else
        // draw high sec
        this.drawTimeBox(
            y,
            this.guiData.baseHeight,
            startTime + batch.hI.getTotalDuration(),
            startTime + batch.wI.getTotalDuration(),
            colorMap.highSec)

        return this.guiData.baseHeight * 1.5
    }

    /**
     * @param {number} y 
     * @param {number} startTime 
     * @param {ShotgunData} shotgun 
     * @returns 
     */
    drawShotgun(y, startTime, shotgun) {
        const firstBatchStart = startTime + shotgun.sleepCorrector
        let shotgunHeight = 0

        let batchY = y
        for (let i = 0; i < shotgun.nBatches; i++) {
            // possibly start at 1

            const offset = i * shotgun.deltaBatch

            let totalBatchHeight

            if (this.guiData.detailLevel >= 3) {
                // draw batch
                totalBatchHeight = this.drawBatch(
                    batchY,
                    firstBatchStart + offset,
                    shotgun.batch)

            } else {
                // draw simple batch
                totalBatchHeight = this.drawSimpleBatch(
                    batchY,
                    firstBatchStart + offset,
                    shotgun.batch)
            }

            // draw batch offset
            this.drawTimeBox(
                batchY + this.guiData.baseHeight / 2,
                totalBatchHeight - this.guiData.baseHeight, // remove margins
                firstBatchStart,
                firstBatchStart + offset,
                colorMap.batchOffset)

            batchY += totalBatchHeight
            shotgunHeight += totalBatchHeight
        }

        // draw sleep corrector
        this.drawTimeBox(
            y + this.guiData.baseHeight / 2,
            shotgunHeight - this.guiData.baseHeight,
            startTime,
            startTime + shotgun.sleepCorrector,
            colorMap.sleepCorrector)

        return shotgunHeight
    }

    /**
     * @param {number} y 
     * @param {number} startTime 
     * @param {ShotgunData} shotgunData 
     * @returns 
     */
    drawSimpleShotgun(y, startTime, shotgunData) {
        const firstBatchStart = startTime + shotgunData.sleepCorrector

        // total weaken time
        const tWTime = shotgunData.batch.wI.getTotalDuration()
        const tHTime = shotgunData.batch.hI.getTotalDuration()

        const shotgunTotalOffset = (shotgunData.nBatches - 1) * shotgunData.deltaBatch

        const highSecTime = shotgunTotalOffset + tWTime - tHTime

        const highSecStart = firstBatchStart + tHTime
        const highSecEnd = highSecStart + highSecTime

        // draw simplified shotgun

        // draw low sec
        this.drawTimeBox(
            y,
            this.guiData.baseHeight,
            startTime,
            highSecStart,
            colorMap.lowSec)

        // this part should be somewhere else
        // draw high sec
        this.drawTimeBox(
            y,
            this.guiData.baseHeight,
            highSecStart,
            highSecEnd,
            colorMap.highSec)

        // draw sleep corrector
        this.drawTimeBox(
            y,
            this.guiData.baseHeight,
            startTime,
            startTime + shotgunData.sleepCorrector,
            colorMap.sleepCorrector)

        return this.guiData.baseHeight * 1.5
    }

    /**
     * @param {Array<LogEntry>} things 
     */
    drawAll(things) {
        let y = 0

        // console.log(things)
        for (let i = 0; i < things.length; i++) {
            const thing = things[i]
            const startTime = thing.startTime
            const data = thing.data

            let thingWidth

            if (data instanceof WGHData) {
                // always draw this 
                thingWidth = this.drawWGH(y, startTime, data)
            }

            if (data instanceof BatchData) {
                if (this.guiData.detailLevel >= 3) {
                    thingWidth = this.drawBatch(y, startTime, data)
                } else {
                    thingWidth = this.drawSimpleBatch(y, startTime, data)
                }
            }

            if (data instanceof ShotgunData) {
                if (this.guiData.detailLevel >= 2) {
                    thingWidth = this.drawShotgun(y, startTime, data)
                } else {
                    thingWidth = this.drawSimpleShotgun(y, startTime, data)
                }
            }

            // if (this.timeToPos(startTime) < 0) {
            //     // if so don't draw this thing
            //     y += thingWidth
            // }

            y += thingWidth

            if (y > this.guiData.height) {
                break
            }
        }
    }
}

import { strToLog } from "HybridShotgunBatcher/Dashboard/DataClasses";

function getNewLogs(portHandle) {
    let portData = []

    while (true) {
        const data = portHandle.read()

        if (data == "NULL PORT DATA") {
            break
        }

        const log = strToLog(data)
        portData.push(log)
    }

    return portData
}

import { getMinSecWeakenTime } from "Helpers/MyFormulas"
import { getP5 } from "HybridShotgunBatcher/Dashboard/p5Helpers"

class GuiData {
    constructor(ns, p5) {
        this.ns = ns
        this.p5 = p5

        this.sTime = 0
        this.eTime = 0

        this.width = 0
        this.height = 0

        // the base time
        // the time from where the "slowed down" time starts
        this.baseTime = 0

        this.resetBaseTime()

        // settings:

        // detail level
        // the amount of detail the graph is to be drawn with 
        // higher this.detailLevel => more detail
        // should be 1 - 3
        this.detailLevel = 3


        // the default min bar height 
        this.baseHeight = 2

        // speed 
        // how much slower the graph should move compared to the actual time
        this.speed = 1

        // timeFrame
        // the amount of time to be shown on the graph
        // this.timeFrame = wTime * 2

        // offset to now
        // the offset between the start of the graph and the actual time
        // in % of the timeFrame
        this.nowOffset = 1

        // milliseconds per pixel
        this.msPP = 1
    }

    resetBaseTime() {
        this.baseTime = Date.now()
    }

    update() {
        this.updateSize()
        this.updateTimeFrame()
    }

    updateSize() {
        this.width = this.p5.width
        this.height = this.p5.height
    }

    updateTimeFrame() {
        const difTime = Date.now() - this.baseTime

        const nowTime = this.baseTime + difTime * this.speed

        const timeFrame = this.msPP * this.width

        this.sTime = nowTime - timeFrame * this.nowOffset

        this.eTime = this.sTime + timeFrame

        // console.log(this.sTime - Date.now(), this.eTime - Date.now())
    }

    timeToPos(time) {
        const dTime = time - this.sTime
        const timeSpan = this.eTime - this.sTime

        const percent = dTime / timeSpan

        return Math.floor(this.width * percent)
    }
}

export function filterShown(guiData, things, option) {
    return things.filter(
        (x) => {
            const startTime = x.startTime
            const data = x.data

            if (option) {
                return guiData.timeToPos(startTime) >= 0
            } else {
                // console.log(data.getTotalDuration(), guiData.timeToPos(startTime + data.getTotalDuration()))
                return guiData.timeToPos(startTime + data.getTotalDuration()) >= 0
            }
        }
    )
}

// todo rename TimeLine
// todo switch everything to use the timeLIne

/** @param {NS} ns */
export async function main(ns) {
    const portNum = ns.args[0]
    const port = ns.getPortHandle(portNum)

    const target = ns.args[1]

    let things = []

    const p5 = await getP5(ns, ns.pid)
    const guiData = new GuiData(ns, p5)
    const drawer = new Drawer(p5, guiData)

    // const shotgun =
    //     new ShotgunData(
    //         new BatchData(
    //             new WGHData(
    //                 "weaken",
    //                 10000,
    //                 1,
    //                 0
    //             ),
    //             new WGHData(
    //                 "grow",
    //                 7000,
    //                 1,
    //                 2500
    //             ),
    //             new WGHData(
    //                 "hack",
    //                 4000,
    //                 1,
    //                 5000
    //             ),
    //         ),
    //         500,
    //         1500,
    //         3,
    //     )

    // let a = new LogEntry(
    //     Date.now(),
    //     shotgun,
    //     "ShotgunData"
    // )

    // port.write(a.toStr())

    // const b = new LogEntry(
    //     Date.now() + 4500,
    //     shotgun,
    //     "ShotgunData"
    // )

    // port.write(b.toStr())

    // const c = new LogEntry(
    //     Date.now() + 9000,
    //     shotgun,
    //     "ShotgunData"
    // )

    // port.write(c.toStr())


    p5.draw = () => {
        p5.fitCanvas()
        guiData.update()

        // get port data
        things = things.concat(getNewLogs(port))

        // todo draw the "now" line 
        p5.background(0)

        const toDraw = filterShown(guiData, things, true)

        drawer.drawAll(toDraw)
    }

    // keep it alive
    while (true) {
        await ns.sleep(0)
    }
}

