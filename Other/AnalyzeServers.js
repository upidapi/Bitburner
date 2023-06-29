import {
    getServersDepth,
    getServers
} from "Other/ScanServers.js"

import { getMaxHackThreads } from "HybridShotgunBatcher/CalcMaxBatchSize"
import { formatNum } from "Helpers/Formatting"

import { getRoot } from "HybridShotgunBatcher/SetupServer"

import { getMinSecWeakenTime } from "Helpers/MyFormulas.js"
import { getMaxAvailableRam } from "HybridShotgunBatcher/Helpers"

/** @param {NS} ns */
export async function depthScanAnalyze(ns) {
    const servers_and_depth = getServersDepth(ns, "home")

    let toPrint = ""

    for (let i = 0; i < servers_and_depth.length; i++) {
        const server_name = servers_and_depth[i][0]
        const depth = servers_and_depth[i][1]

        function print(text) {
            toPrint += text + "\n"
        }

        function raw_padd_print(...text) {
            const padding = Array(depth + 1).join("----")
            const p_text = [padding, ...text].join("")
            print(p_text)
        }

        function padd_print(...text) {
            raw_padd_print("--", ...text)
        }

        await getRoot(ns, server_name)

        raw_padd_print("> ", server_name)

        padd_print("Root Access: ", ns.hasRootAccess(server_name))
        padd_print("lvl req: ", ns.getServerRequiredHackingLevel(server_name))

        padd_print(
            "money: $",
            formatNum(ns.getServerMoneyAvailable(server_name)),
            " / $",
            formatNum(ns.getServerMaxMoney(server_name)))

        padd_print(
            "sec lvl: ",
            ns.getServerSecurityLevel(server_name),
            " (min: ",
            ns.getServerMinSecurityLevel(server_name),
            ")",
        )

        padd_print("growth: ", ns.getServerGrowth(server_name))

        padd_print("ram: ", ns.getServerMaxRam(server_name), "GB")

        print(" ")
    }

    ns.tprintf(toPrint)
}


/** @param {NS} ns */
export function calcEstimatedMoney(ns, serverName, availableRam) {
    // get the estimated $ / hr from server

    const returnVal = getMaxHackThreads(ns, serverName, availableRam)

    const threads = returnVal[0]
    const nThreads = returnVal[1]

    // if the thread is full, how may of these are we using?
    // if it's not full this will always be 1

    const hackThreads = threads.hack * nThreads

    // const a = (100 - ns.getServerSecurityLevel(serverName)) / 100
    const hackChance = (100 - ns.getServerMinSecurityLevel(serverName)) / 100

    const pMoneyHacked = ns.hackAnalyze(serverName) * hackChance

    const money_per_cycle = hackThreads * pMoneyHacked * ns.getServerMaxMoney(serverName)

    const cycle_time = getMinSecWeakenTime(ns, serverName)

    const money_per_ms = money_per_cycle / cycle_time
    const money_per_hr = money_per_ms * 1000 * 60 * 60

    return [serverName, money_per_hr]
}

/** @param {NS} ns */
export async function scanAnalyzeServers(ns) {
    const servers = getServers(ns, "home")

    let availableRam = getMaxAvailableRam(ns)
    // ns.tprint(availableRam)

    let serversData = servers.map((server_name) => { return calcEstimatedMoney(ns, server_name, availableRam) })

    serversData = serversData.sort((a, b) => { return a[1] - b[1] })

    function terminalPrint(...text) {
        const p_text = text.join("")
        ns.tprintf(p_text)
    }

    function terminalDataPrint(...text) {
        const p_text = ["--", ...text].join("")
        ns.tprintf(p_text)
    }

    //todo implement this
    for (let i = 0; i < serversData.length; i++) {
        let serverName = serversData[i][0]
        let serverEstimatedMoney = serversData[i][1]

        await getRoot(ns, serverName)

        terminalPrint(serverName)

        terminalDataPrint("Root Access: ", ns.hasRootAccess(serverName))
        terminalDataPrint("lvl req: ", ns.getServerRequiredHackingLevel(serverName))

        terminalDataPrint("estimated money/hr: ", formatNum(serverEstimatedMoney))

        terminalDataPrint(
            "money: $",
            formatNum(ns.getServerMoneyAvailable(serverName)),
            " / $",
            formatNum(ns.getServerMaxMoney(serverName)))

        terminalDataPrint(
            "sec lvl: ",
            ns.getServerSecurityLevel(serverName),
            " (min: ",
            ns.getServerMinSecurityLevel(serverName),
            ")",
        )

        terminalDataPrint("growth: ", ns.getServerGrowth(serverName))

        terminalDataPrint("ram: ", ns.getServerMaxRam(serverName), "GB")

        terminalPrint(" ")
    }
}
