import { estimateX } from "Helpers/EstimateX.js"


/** @param {NS} ns */
export async function main(ns) {
    const myServers = ns.getPurchasedServers()
    let moneyAvalible = ns.getServerMoneyAvailable("home")

    const maxRam = ns.getPurchasedServerMaxRam()
    const logMaxRam = Math.log2(maxRam)

    while (true) {
        let i = 1
        while (true) {
            if (i > logMaxRam) {
                i--
                break
            }

            if (ns.getPurchasedServerCost(Math.pow(2, i)) > moneyAvalible) {
                i--
                break
            }

            i++
        }

        if (i == 0) {
            // cant buy any servers
            break
        }

        const ram = Math.pow(2, i)
        const cost = ns.getPurchasedServerCost(ram)

        // can buy more servers
        if (myServers.length < ns.getPurchasedServerLimit()) {
            ns.purchaseServer("pserver-2^" + i, ram)        
            moneyAvalible -= cost
            
        } else {
            let smallest = myServers[0]
            for (let j = 1; j < myServers.length; j++) {
                const pServerName = myServers[j]

                if (ns.getServerMaxRam(pServerName) < ns.getServerMaxRam(smallest)) {
                    smallest = pServerName
                }
            }

            if (ram > ns.getServerMaxRam(smallest)) {
                ns.purchaseServer("pserver-2^" + i, ram)        
                moneyAvalible -= cost

            } else {
                break
            }
        }
    }
    
}
