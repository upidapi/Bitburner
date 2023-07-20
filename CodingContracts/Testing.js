import { typeToFuncMap } from "CodingContracts/Main";


import { solve, getContracts } from "CodingContracts/Main";



/** @param {NS} ns */
export function main(ns) {
    for (const contractType in typeToFuncMap) {
        
        for (let i = 0; i < 10; i++) {

            ns.codingcontract.createDummyContract(contractType)

            for (const [file, server] of getContracts(ns)) {
                if (server != "home") {
                    continue
                }

                console.log(JSON.stringify([file, server]))

                solve(ns, file, "home")
            }
        }
    }
}
