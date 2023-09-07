import { averageBatchASec } from "HybridShotgunBatcher/Settings"

import { calcMinHackChance } from "Helpers/MyFormulas"
import { Threads } from "HybridShotgunBatcher/Helpers"
import { getMinSecWeakenTime } from "Helpers/MyFormulas"

/**
 * @param {NS} ns 
 * @param {String} target 
 * @param {Threads} batch 
 * 
 * gets the (average) money per sec for a given batch and target
 */
export function getMoneyPerMs(ns, target, batch) {
    const gSecInc = ns.growthAnalyzeSecurity(batch.grow, target)
    const secWhenHack = ns.getServerMinSecurityLevel(target) + gSecInc

    const hackChance = calcMinHackChance(ns, target, secWhenHack)

    const hackPart = ns.hackAnalyze(target) * batch.hack

    const averageHackAmount = hackPart * hackChance * ns.getServerMaxMoney(target)

    const averageBatchTime = getMinSecWeakenTime(ns, target) + averageBatchASec

    const moneyPerMs = averageHackAmount / averageBatchTime

    return moneyPerMs
}   