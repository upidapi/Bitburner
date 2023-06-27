import { getServers } from "Other/ScanServers";

import { trianglePathSum } from "CodingContracts/TrianglePathSum";
import { spiralizeMatrix } from "CodingContracts/SpiralizeMatrix";
import { toHam, hamToInt } from "CodingContracts/HammingCodes";
import { traderI, traderII, traderIII, traderIV } from "CodingContracts/AlgorithmicStockTrader";
import { genIp } from "CodingContracts/IpGen";
import { colourNodes } from "CodingContracts/2ColourGraph";
import { largestPrime } from "CodingContracts/LargestPrime";
import { findMaxSubSum } from "CodingContracts/MaxSubSum";
import { waysToSumI, waysToSumII } from "CodingContracts/TotalWaysToSum";
import { canJump, getMinJumps } from "CodingContracts/ArrayJumping";
import { mergeIntervals } from "CodingContracts/MergeOverlappingIntervals";
import { getSimpleUniquePaths, getUniquePaths } from "CodingContracts/UniqueGridPaths";
import { getShortestPath } from "CodingContracts/ShortestPath";
import { findValidMath } from "CodingContracts/FindMathExpressions";
import { getSanitizedPar } from "CodingContracts/SanitizeParentheses";
import { compressRLE } from "CodingContracts/CompressionRLE";
import { compressLZ, decompressLZ } from "CodingContracts/CompressionLZ";
import { ceasarCipher, vCipher } from "CodingContracts/Cipher";

const typeToFuncMap = {
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


// 24 / 27 done
const allTypes = [
    "Find Largest Prime Factor",  // done
    "Subarray with Maximum Sum",  // done
    "Total Ways to Sum",  // done
    "Total Ways to Sum II",  // done
    "Spiralize Matrix",  // done
    "Array Jumping Game",  // done
    "Array Jumping Game II",  // done
    "Merge Overlapping Intervals", // done
    "Generate IP Addresses",  // done
    "Algorithmic Stock Trader I",  // done
    "Algorithmic Stock Trader II",  // done
    "Algorithmic Stock Trader III",  // done
    "Algorithmic Stock Trader IV",  // done
    "Minimum Path Sum in a Triangle",  // done
    "Unique Paths in a Grid I",  // done
    "Unique Paths in a Grid II",  // done
    "Shortest Path in a Grid",  // done
    "Sanitize Parentheses in Expression",  // done
    "Find All Valid Math Expressions",  // done
    "HammingCodes: Integer to Encoded Binary",  // done
    "HammingCodes: Encoded Binary to Integer",  // done
    "Proper 2-Coloring of a Graph",  // done
    "Compression I: RLE Compression",  // done
    "Compression II: LZ Decompression",  // done
    "Compression III: LZ Compression",  // done
    "Encryption I: Caesar Cipher",  // done
    "Encryption II: Vigenère Cipher"  // done
]

/** @param {NS} ns */
function solve(ns, fileName, host) {
    const data = ns.codingcontract.getData(fileName, host)

    const contractType = ns.codingcontract.getContractType(fileName, host)
    const contractSolver = typeToFuncMap[contractType]

    if (contractSolver == undefined) {
        ns.print(`no solver found for "${fileName}" on "${host}" with the type "${contractType}" \n`)
        return "NO SOLVER FOUND"
    }

    // console.log(contractType, fileName, host)

    const answer = contractSolver(data)

    // console.log(answer)
    const reward = ns.codingcontract.attempt(answer, fileName, host)

    if (reward == "") {
        // console.log(contractType, fileName, host)
        // console.log(data)

        // fail
        ns.print(
            `failed ${contractType}` + "\n" +
            `  from "${fileName}" on "${host}"` + "\n" +
            `  data: ${data}` + "\n" +
            `  expected answer: ${answer}` + "\n"
        )

        return "FAIL"

    } else {
        // succeed 
        ns.print(
            `completed ${contractType}` + "\n" +
            `  from "${fileName}" on "${host}"` + "\n" +
            `  ${reward}` + "\n"
        )

        return "SUCCESS"
    }
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")
    ns.tail()
    ns.clearLog()

    const servers = getServers(ns)

    let contracts = []
    for (let server of servers) {

        for (let file of ns.ls(server)) {
            if (file.endsWith(".cct")) {
                contracts.push([file, server])
            }
        }
    }

    if (contracts.length == 0) {
        ns.print(
            `no contracts found \n` +
            "\n"
            )
        return
    }

    ns.print(`found ${contracts.length} contracts \n`)

    ns.print(
        "" + `\n` +
        "---------------------" + `\n` +
        "" + `\n`)

    let success = 0
    let fail = 0
    let noSolver = 0

    for (let [contract, server] of contracts) {
        let status = solve(ns, contract, server)
        if (status == "FAIL") {
            fail++
        } else if (status == "SUCCESS") {
            success++
        } else if (status == "NO SOLVER FOUND") {
            noSolver++
        }
    }

    ns.print(
        "" + `\n` +
        "---------------------" + `\n` +
        "" + `\n`)

    ns.print(
        `found ${contracts.length} contracts`
    )

    if (fail == 0 && noSolver == 0) {
        ns.print(
            "all contracts successfully solved \n \n"
        )
    } else (
        ns.print(
            `${success}/${contracts.length} solved` + "\n" +
            `${fail}/${contracts.length} failed` + "\n" +
            `${noSolver}/${contracts.length} no solver found`
        )
    )
}
