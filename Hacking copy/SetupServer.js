/** @param {NS} ns */
async function fixSecurity(ns, target, availableRam) {
    // fixes the security as mutch as possible 
    // returns true if the process to fix it will fully fix it or if it's already fixed

    const fromMin = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)

    if (fromMin != 0) {
        const optimalWeakenThreads = Math.ceil(fromMin / ns.weakenAnalyze(1))

        const maxWeakenThreads = Math.floor(availableRam / RamUsage["weaken"])

        const weakenThreads = Math.min(optimalWeakenThreads, maxWeakenThreads)

        const threads = new Threads(0, 0, weakenThreads)

        scheduleWGH(ns, target, threads)
        ns.printf("fixing security with " + weakenThreads + " threads")
        ns.printf("    fromMin: " + fromMin)
        ns.printf("    optimalWeakenThreads: " + optimalWeakenThreads)
        ns.printf("    maxWeakenThreads: " + maxWeakenThreads)
        ns.printf("    availableRam: " + availableRam)

        const optimal = (optimalWeakenThreads <= maxWeakenThreads)

        if (!optimal) {
            // if it´s not optimal don't allow for fixMoney at the same time
            await ns.sleep(ns.getWeakenTime(target) + WGHMargin + 5)
            return false
        }

        await ns.sleep(10) // make the effects of the function have time to take affect before the next
        return true
    }

    return true
}

/** @param {NS} ns */
async function fixMoney(ns, target, availableRam) {
    if (ns.getServerMoneyAvailable(target) != ns.getServerMaxMoney(target)) {
        // check if it has to be fixed

        function growPToRam(x) {
            threads.grow = Math.ceil(ns.growthAnalyze(target, x))

            let secInc = ns.growthAnalyzeSecurity(threads.grow)

            threads.weaken = secInc / ns.weakenAnalyze(1)
            threads.weaken = Math.ceil(threads.weaken)

            return threads.ramUsage()
        }

        // calculate start max threads
        const moneyLeftP = ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target)
        const maxMul = 1 / moneyLeftP

        let threads = new Threads()

        // nothing is set to the result since it alredy sets the properties of "threads"
        estimateX(ns, growPToRam, availableRam, 1, maxMul, 0, 0.1)

        // defined before rounding the threads
        const delta = ns.growthAnalyze(target, maxMul) + 1 - threads.grow

        scheduleWGH(ns, target, threads)

        ns.printf("fixing money with " + threads.grow + " growThreads and " + threads.weaken + " correcting weakenThreads")

        if (delta < 0.5) {
            // the grow is maximal
            await ns.sleep(10) // make the effects of the function have time to take affect before the next
            return true
        }

        await ns.sleep(ns.getWeakenTime(target) + WGHMargin + 5)
        return false
    }

    return true
}


export async function fixServer(ns, target) {
    let servers = getServers(ns)
    // fix the server money and security
    while (true) {
        await ns.sleep(100)

        let avalibleRam = getAvalibleRamWGH(ns, ...servers)
        if (avalibleRam == 0) {
            continue
        }

        if (! await fixSecurity(ns, target, avalibleRam)) {
            continue
        }

        avalibleRam = getAvalibleRamWGH(ns, ...servers)
        if (avalibleRam == 0) {
            continue
        }

        if (! await fixMoney(ns, target, avalibleRam)) {
            continue
        }

        break
    }
}