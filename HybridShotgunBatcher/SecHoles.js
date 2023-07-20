import { execMargin, lowSecHoleTime, sleepMargin } from "HybridShotgunBatcher/Settings"

export function getNextSecHole(time = null) {
    time = time ?? Date.now()

    // gets the start time of the next sec hole
    // the nextHole is always larger than time

    const a = (time + sleepMargin) / execMargin
    const n = Math.floor(Math.floor(a + 1))
    const nextHole = execMargin * n - sleepMargin

    return nextHole
}

export async function goToNextSecHole(ns) {
    const secHoleStart = getNextSecHole(Date.now())
    await ns.sleep(secHoleStart - Date.now())
}

export function getLowSecHoleStart(time = null) {
    // the current lowSecHoleStart is the next lowSecHoleStart - the deltaSecHole
    // i.e getNextSecHole() - execMargin
    return getNextSecHole(time) - execMargin
}

export function getLowSecHoleEnd(time = null) {
    const lowSecHoleStart = getLowSecHoleStart(time)

    return lowSecHoleStart + lowSecHoleTime
}

export function getNextLowSecEnd(time = null) {
    if (time == null) {
        time = Date.now()
    }

    // console.log("a", getNextSecHole(time - lowSecHoleTime))
    return getNextSecHole(time - lowSecHoleTime) + lowSecHoleTime
}

export function inLowSecHole(time = null) {
    time = time ?? Date.now()

    if (getLowSecHoleStart(time) <= time && time < getLowSecHoleEnd(time)) {
        return true
    }

    return false
}
