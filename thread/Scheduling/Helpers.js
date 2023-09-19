import { nextValWrite } from "thread/Other"
import { DeltaBatchExec, DeltaThreadExec } from "thread/Setings"
import { TargetData } from "thread/Targeting"

export function extendListTo(list, newLen, defaultValFunc) {
    const extraNeededElements = newLen - list.length

    for (let i = 0; i < extraNeededElements; i++) {
        list.push(defaultValFunc())
    }

    return list
}


/**
 * @param {NS} ns 
 * @param {*} ms 
 * @param {*} vals 
 */
async function limitNextWrite(ns, ms, vals) {
    const port = ns.getPortHandle(ns.pid)

    port.peek()
    
    const p1 = nextValWrite(ns,
        ns.pid,
        [...vals, "resolve"]
    )

    const p2 = ns.asleep(ms)

    const retVal = await Promise.race([
        p1, p2
    ])

    if (retVal == true) {
        const port = ns.getPortHandle(ns.pid)
        port.write("resolve")
    }

    port.peek()
    return retVal
}


/**
 * @param {NS} ns 
 * @param {Number} ms 
 * @param {TargetData} targetData 
 * @param {Number} minMs 
 * @returns 
 */
export async function safeSleepTo(ns, ms, targetData, minMs = 0) {
    /**
     * sleeps (up to) {ms} ms, guaranteeing that we will be 
     * at minSec when it resolves 
     */

    let now = performance.now()
    const minFinishTime = now + minMs
    const finishTime = now + ms

    if (typeof targetData.fixedStatus == "number") {
        if (minFinishTime >= targetData.fixedStatus) {
            targetData.security = minSec
        }
    }



    while (true) {
        await limitNextWrite(
            ns,
            finishTime - performance.now(),
            [
                "hack worker finished",
                "grow worker finished",
                "weaken worker finished",
            ]
        )

        while (true) {
            const sec = ns.getServerSecurityLevel(targetData.target)

            // console.log({
            //     sec: sec,
            //     expected: targetData.security,
            //     future: targetData.secAftFix,
            //     toChange: targetData.fixComplete - performance.now()
            // })

            if (performance.now() >= targetData.fixComplete) {
                targetData.security = targetData.secAftFix
            }

            if (sec <= targetData.security) {
                // we have complected all of the threads of the batch

                if (performance.now() > minFinishTime) {
                    // console.log("finish")
                    ns.print("finish")

                    return true
                }

                // console.log("wait", minFinishTime -  performance.now())
                break
            }

            // console.log(
            //     Object.assign({}, targetData),
            //     "expectedSec/sec",
            //     targetData.security,
            //     targetData.secAftFix,
            //     sec,
            //     targetData.fixComplete - performance.now(),
            //     targetData.fixComplete)

            // const s = performance.now()

            // wait for sec decrease

            const maxCycles = Math.ceil(
                Math.max(
                    DeltaBatchExec * 100,
                    10000
                ) / 1000    
            )
            
            let cycles = 0

            while (true) {
                if (cycles == maxCycles) {
                    // gave up on waiting for a fix

                    console.log("gave up on waiting for fix")

                    console.log({
                        sec: ns.getServerSecurityLevel(targetData.target),
                        expected: targetData.security,
                        future: targetData.secAftFix,
                        toChange: targetData.fixComplete - performance.now()
                    })

                    // reset the stored sec to force another fix batch
                    targetData.security = ns.getServerSecurityLevel(targetData.target)
                    targetData.secAftFix = targetData.security

                    return false
                }

                const retVal = await limitNextWrite(
                    ns,
                    1000,
                    [
                        "hack worker finished",
                        "grow worker finished",
                        "weaken worker finished",
                    ]
                )
                
                if (retVal == "weaken worker finished") {
                    break
                }

                if (retVal == true) {
                    console.log("waited for 1 sec for fix")
                }

                cycles++
            }

            // const e = performance.now()
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
