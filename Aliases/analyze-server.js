import { formatNum } from "Helpers/Formatting"
import { getMinSecWeakenTime } from "Helpers/MyFormulas"

/** @param {NS} ns */
export async function main(ns) {
    const serverName = ns.args[0]
    const server = ns.getServer(serverName)

    const usedRam = formatNum(server.ramUsed)
    const totalRam = formatNum(server.maxRam)
    const ramP = (server.ramUsed / server.maxRam * 100).toFixed(1)

    const money = formatNum(server.moneyAvailable)
    const totalMoney = formatNum(server.moneyMax)
    const moneyP = (server.moneyAvailable / server.moneyMax * 100).toFixed(1)

    const sec = server.hackDifficulty
    const minSec = server.minDifficulty

    const wTime = ns.getWeakenTime(serverName).toFixed(0)
    const minWTime = getMinSecWeakenTime(ns, serverName).toFixed(0)

    ns.tprintf(
        `${serverName}: \n` + 
        `  ram: ${ramP}%% ${usedRam}/${totalRam} \n` + 
        `  money: ${moneyP}%% ${money}/${totalMoney} \n` + 
        `  sec: ${sec}/${minSec} \n` + 
        `  wTime: ${wTime}/${minWTime} \n` + 
        `  root: ${ns.hasRootAccess(serverName)}\n`
    )
}


export function autocomplete(data, _) {
    return data.servers
}