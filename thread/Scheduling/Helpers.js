import { nextValWrite } from "thread/Other"

export function extendListTo(list, newLen, defaultValFunc) {
    const extraNeededElements = newLen - list.length

    for (let i = 0; i < extraNeededElements; i++) {
        list.push(defaultValFunc())
    }

    return list
}


export async function safeSleepTo(ns, ms, targetData, minMs = 0) {
    /**
     * sleeps (up to) {ms} ms, guaranteeing that we will be 
     * at minSec when it resolves 
     */

    let now = performance.now()
    const minFinishTime = now + minMs
    const finishTime = now + ms

    while (true) {
        const retVal = await Promise.race([
            nextValWrite(ns,
                ns.pid,
                [
                    "hack worker finished",
                    "grow worker finished",
                    "weaken worker finished",
                ]
            ),
            ns.asleep(finishTime - performance.now())
        ])

        // console.log(retVal)

        // reached the finishTime whiteout any workers finishing 
        if (retVal == null) {
            return
        }

        while (true) {
            const expectedSec = targetData.security
            const sec = ns.getServerSecurityLevel(targetData.target)

            if (sec <= expectedSec) {
                // we have complected all of the threads of the batch

                if (performance.now() > minFinishTime) {
                    // console.log("finish")
                    return
                }

                // console.log("wait", minFinishTime -  performance.now())
                break
            }
            // console.log("expectedSec/sec", expectedSec, sec)

            // const s = performance.now()
            await nextValWrite(ns,
                ns.pid,
                [
                    "weaken worker finished",
                ]
            )
            const e = performance.now()
            // console.log(`captured worker, ${(e - s).toFixed(1)}`)
        }
    }
}


export class ScheduleData {
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
