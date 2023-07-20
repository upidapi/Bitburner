import { getServers } from "Other/ScanServers";

import { trianglePathSum } from "CodingContracts/Solvers/TrianglePathSum";
import { spiralizeMatrix } from "CodingContracts/Solvers/SpiralizeMatrix";
import { toHam, hamToInt } from "CodingContracts/Solvers/HammingCodes";
import { traderI, traderII, traderIII, traderIV } from "CodingContracts/Solvers/AlgorithmicStockTrader";
import { genIp } from "CodingContracts/Solvers/IpGen";
import { colourNodes } from "CodingContracts/Solvers/2ColourGraph";
import { largestPrime } from "CodingContracts/Solvers/LargestPrime";
import { findMaxSubSum } from "CodingContracts/Solvers/MaxSubSum";
import { waysToSumI, waysToSumII } from "CodingContracts/Solvers/TotalWaysToSum";
import { canJump, getMinJumps } from "CodingContracts/Solvers/ArrayJumping";
import { mergeIntervals } from "CodingContracts/Solvers/MergeOverlappingIntervals";
import { getSimpleUniquePaths, getUniquePaths } from "CodingContracts/Solvers/UniqueGridPaths";
import { getShortestPath } from "CodingContracts/Solvers/ShortestPath";
import { findValidMath } from "CodingContracts/Solvers/FindMathExpressions";
import { getSanitizedPar } from "CodingContracts/Solvers/SanitizeParentheses";
import { compressRLE } from "CodingContracts/Solvers/CompressionRLE";
import { compressLZ, decompressLZ } from "CodingContracts/Solvers/CompressionLZ";
import { ceasarCipher, vCipher } from "CodingContracts/Solvers/Cipher";

export const typeToFuncMap = {
    "Minimum Path Sum in a Triangle": trianglePathSum,
    "Spiralize Matrix": spiralizeMatrix,
    "HammingCodes: Integer to Encoded Binary": toHam,
    "HammingCodes: Encoded Binary to Integer": hamToInt,
    "Algorithmic Stock Trader I": traderI,
    "Algorithmic Stock Trader II": traderII,
    "Algorithmic Stock Trader III": traderIII,
    "Algorithmic Stock Trader IV": traderIV,
    "Generate IP Addresses": genIp,
    "Proper 2-Coloring of a Graph": colourNodes,
    "Find Largest Prime Factor": largestPrime,
    "Subarray with Maximum Sum": findMaxSubSum,
    "Total Ways to Sum": waysToSumI,
    "Total Ways to Sum II": waysToSumII,
    "Array Jumping Game": canJump,
    "Array Jumping Game II": getMinJumps,
    "Merge Overlapping Intervals": mergeIntervals,
    "Unique Paths in a Grid I": getSimpleUniquePaths,
    "Unique Paths in a Grid II": getUniquePaths,
    "Shortest Path in a Grid": getShortestPath,
    "Sanitize Parentheses in Expression": getSanitizedPar,
    "Find All Valid Math Expressions": findValidMath,
    "Compression I: RLE Compression": compressRLE,
    "Compression II: LZ Decompression": decompressLZ,
    "Compression III: LZ Compression": compressLZ,
    "Encryption I: Caesar Cipher": ceasarCipher,
    "Encryption II: Vigenère Cipher": vCipher,
}

import { deFormatGameNum } from "Helpers/Formatting";

function getRewardData(reward) {
    // all of the rewards starts with this
    reward = reward.slice("Gained ".length)

    /** 
     * money reward
     * 
     * constructor => `Gained ${numeralWrapper.formatMoney(moneyGain)}`
     * example => Gained $750.000m
     * */
    if (reward.startsWith("$")) {
        let moneyReward = deFormatGameNum(reward.slice("$".length))

        return {
            "type": "money",
            "amount": moneyReward
        }
    }

    let search

    /** 
     * faction reputation reward
     * 
     * constructor => `Gained ${repGain} faction reputation for ${reward.name}`
     * example => Gained 2500 faction reputation for Sector-12
     * */
    search = /[0-9]*(?= faction reputation for )/.exec(reward)
    if (search != null && search.length == 1) {
        let fRepGain = parseInt(search[0])

        let rawFactionStart = (search[0] + " faction reputation for ").length
        let faction = reward.slice(rawFactionStart)

        return {
            "type": "faction reputation",
            "amount": fRepGain,
            "factions": [faction]
        }
    }

    /** 
     * multiple faction reputation reward
     * 
     * constructor => `Gained ${gainPerFaction} reputation for each of the following factions: ${factions.join(", ")}`
     * example => Gained 7500 reputation for each of the following factions: Sector-12, CyberSec
     * */
    search = /[0-9]*(?= reputation for each of the following factions: )/.exec(reward)
    if (search != null && search.length == 1) {
        let fRepGain = parseInt(search[0])

        let rawFactionsStart = (search[0] + " reputation for each of the following factions: ").length
        let factions = reward.slice(rawFactionsStart).split(", ")

        return {
            "type": "faction reputation",
            "amount": fRepGain,
            "factions": [factions]
        }
    }

    /** 
     * company reputation reward
     * 
     * constructor => `Gained ${repGain} company reputation for ${reward.name}`
     * example => i haven't got one yet
     * */
    search = /[0-9]*(?= company reputation for )/.exec(reward)
    if (search != null && search.length == 1) {
        let cRepGain = parseInt(search[0])

        let rawCompanyStart = (search[0] + " company reputation for ").length
        let company = reward.slice(rawCompanyStart)

        return {
            "type": "company reputation",
            "amount": cRepGain,
            "company": company
        }
    }

}



/** @param {NS} ns */
export function solve(ns, fileName, host) {
    const data = ns.codingcontract.getData(fileName, host)

    const contractType = ns.codingcontract.getContractType(fileName, host)
    const contractSolver = typeToFuncMap[contractType]

    if (contractSolver == undefined) {
        // no solver found
        throw new Error(`no solver found for type "${contractType}"`)
    }

    const answer = contractSolver(data)

    console.log(answer, data)

    const reward = ns.codingcontract.attempt(answer, fileName, host)

    if (reward == "") {
        // fail
        throw new Error(
            `failed ${contractType}` + "\n" +
            `  from "${fileName}" on "${host}"` + "\n" +
            `  data: ${data}` + "\n" +
            `  attempted answer: ${answer}` + "\n"
        )

    }

    // succeed 
    return reward
}


export function getContracts(ns) {
    const servers = getServers(ns)

    let contracts = []
    for (let server of servers) {

        for (let file of ns.ls(server)) {
            if (file.endsWith(".cct")) {
                contracts.push([file, server])
            }
        }
    }

    return contracts
}


import { formatNum } from "Helpers/Formatting";


/** @param {NS} ns */
export function solveContracts(ns, logToTerminal = false) {
    ns.disableLog("ALL")

    let contracts = getContracts(ns)

    if (contracts.length == 0) {
        ns.print(
            "\n" +
            `no contracts found \n` +
            "\n")

        if (logToTerminal == true) {
            ns.tprintf(
                "\n" +
                `no contracts found \n` +
                "\n")
        }

        return
    }

    let rewards = {
        "money": 0,
        // faction name, tot rep gain
        "faction reputation": {},
        // company name, tot rep gain
        "company reputation": {},
    }

    for (let [contract, server] of contracts) {
        let contractReward = solve(ns, contract, server)

        let rewardData = getRewardData(contractReward)

        if (rewardData.type == "money") {
            rewards.money += rewardData.amount
        }

        if (rewardData.type == "faction reputation") {
            for (let faction of rewardData.factions) {
                if (rewards["faction reputation"][faction] == undefined) {
                    rewards["faction reputation"][faction] = 0
                }

                rewards["faction reputation"][faction] += rewardData.amount
            }
        }

        if (rewardData.type == "company reputation") {
            if (rewards["company reputation"][rewardData.company] == undefined) {
                rewards["company reputation"][rewardData.company] = 0
            }

            rewards["company reputation"][rewardData.company] += rewardData.amount
        }
    }

    let resultList = [
        `found and solved ${contracts.length} contracts`,
        "",
        "----rewards----",
        `money: ${formatNum(rewards.money)}`,
    ]

    resultList.push(
        "",
        "faction reputation gain:")

    for (let faction in rewards["faction reputation"]) {
        resultList.push(`  ${faction}: ${rewards["faction reputation"][faction]}`)
    }

    resultList.push(
        "",
        "company reputation gain:")

    for (let company in rewards["company reputation"]) {
        resultList.push(`  ${company}: ${rewards["company reputation"][company]}`)
    }

    resultList.push("\n")

    let resultStr = resultList.join("\n")

    ns.print(resultStr)

    if (logToTerminal == true) {
        ns.tprintf(resultStr)
    }
}




/** @param {NS} ns */
export async function main(ns) {
    solveContracts(ns, JSON.parse(ns.args[0]))
}
