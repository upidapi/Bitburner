import { execMargin, lowSecHoleTime, sleepMargin } from "Hacking copy/Controller"

export async function startShell(ns, target, shell, WGHExecTime) {
    await ns.run("Hacking copy/ShellController.js", 1,
        target,
        WGHExecTime,
        shell.weaken,
        shell.grow,
        shell.hack,
    )
}

function getLowSecHole(lowSecHoleStarts, lastTime) {
    // gets the lowSecHole closest to lastTime but not larger than it

    for (let i = lowSecHoleStarts.length - 1; i >= 0; i--) {
        const lowSecStart = lowSecHoleStarts[i]

        // check if lowSecHoleMid is in the window of the execMargin
        if (lowSecStart < lastTime - sleepMargin)
            return lowSecStart
    }
}

async function pSleep(ns, execTime) {
    const sleepTime = Math.max(0, execTime - execMargin)

    if (sleepTime > 0) {
        await ns.asleep(sleepTime)
    }
}


/** @param {NS} ns */
export async function test(ns,
    threads,
    script,
    execTime,
    lowSecHoleStarts) {

    /**
     * script has to be a ThreadScript
     */
    
    const wTime = ns.getWeakenTime()
    const gTime = ns.getGrowTime()
    const hTime = ns.getHackTime()
    
    const nextLowSecHole = getLowSecHole(lowSecHoleStarts, )
    const sleepTime = nextLowSecHole - Date.now()
    


}


/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")

    const servers = getThreadingServers(ns)

    const target = ns.args[0]
    const WGHExecTime = ns.args[1]
    const wThreads = ns.args[2]
    const gThreads = ns.args[3]
    const hThreads = ns.args[4]

    const wTime = ns.getWeakenTime()
    const gTime = ns.getGrowTime()
    const hTime = ns.getHackTime()

    const deltaWeakenStart




}