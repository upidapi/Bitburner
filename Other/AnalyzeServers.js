import {
  getServersDepth,
  getServers
} from "Other/ScanServers.js"

import { getMaxHackThreads, getAvalibleRamWGH } from "Hacking/Hack.js"
import { bigFormatNum } from "Helpers/Formatting"

import { getRoot } from "Hacking/GetRoot.js"

/** @param {NS} ns */
export async function depthScanAnalyze(ns) {
  const servers_and_depth = getServersDepth(ns, "home")

  for (let i = 0; i < servers_and_depth.length; i++) {
    const server_name = servers_and_depth[i][0]
    const depth = servers_and_depth[i][1]

    function raw_padd_print(...text) {
      const padding = Array(depth + 1).join("----")
      const p_text = [padding, ...text].join("")
      ns.tprintf(p_text)
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
      bigFormatNum(ns.getServerMoneyAvailable(server_name)),
      " / $",
      bigFormatNum(ns.getServerMaxMoney(server_name)))

    padd_print(
      "sec lvl: ",
      ns.getServerSecurityLevel(server_name),
      " (min: ",
      ns.getServerMinSecurityLevel(server_name),
      ")",
    )

    padd_print("growth: ", ns.getServerGrowth(server_name))

    padd_print("ram: ", ns.getServerMaxRam(server_name), "GB")

    ns.tprintf(" ")
  }
}


/** @param {NS} ns */
export function calcEstimatedMoney(ns, serverName, avalibleRam) {
  // get the estimated $ / hr from server
  
  const returnVal = getMaxHackThreads(ns, serverName, avalibleRam)

  const threads = returnVal[0]
  const nThreads = returnVal[1]

  // if the thread is full, how may of thease are we using?
  // if it's not full this will alwais be 1

  const hackThreads = threads.hack * nThreads

  const hack_chance = (100 - ns.getServerMinSecurityLevel(serverName))

  const max_money_per_cycle = hackThreads * ns.hackAnalyze(serverName) * ns.getServerMaxMoney(serverName)

  const money_per_cycle = hack_chance * max_money_per_cycle


  const cycle_time = ns.getWeakenTime(serverName)

  const money_per_ms = money_per_cycle / cycle_time
  const money_per_hr = money_per_ms * 1000 * 60 * 60

  return [serverName, money_per_hr]
}

/** @param {NS} ns */
export async function scanAnalyzeServers(ns) {
  const servers = getServers(ns, "home")

  let avalibleRam = getAvalibleRamWGH(ns, ...servers)

  let serversData = servers.map((server_name) => { return calcEstimatedMoney(ns, server_name, avalibleRam)})

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
    let serverEstimetedMoney = serversData[i][1]

    await getRoot(ns, serverName)

    terminalPrint(serverName)

    terminalDataPrint("Root Access: ", ns.hasRootAccess(serverName))
    terminalDataPrint("lvl req: ", ns.getServerRequiredHackingLevel(serverName))

    terminalDataPrint("estimeted money/hr: ", bigFormatNum(serverEstimetedMoney))

    terminalDataPrint(
      "money: $",
      bigFormatNum(ns.getServerMoneyAvailable(serverName)),
      " / $",
      bigFormatNum(ns.getServerMaxMoney(serverName)))

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