import { typeToFuncMap } from "CodingContracts/Main";


import { solve, getContracts } from "CodingContracts/Main";



/** @param {NS} ns */
export function main(ns) {
    const contractsPerType = 1000

    ns.disableLog("ALL")
    for (const contractType in typeToFuncMap) {
        
        for (let i = 0; i < contractsPerType; i++) {

            ns.codingcontract.createDummyContract(contractType)

            for (const [file, server] of getContracts(ns)) {
                if (server != "home") {
                    continue
                }

                // console.log(JSON.stringify([file, server]))

                const reward = solve(ns, file, "home")

                console.log({
                    "server": server,
                    "file": file,
                    "reward": reward
                })
            }
        }
    }

    console.log(`successfully solved ${contractsPerType} contract(s) of each type`)
}
