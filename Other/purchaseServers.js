/** @param {NS} ns */
export async function purchaseMaxServers(ns, moneyAvalible = null) {
    if (moneyAvalible == null) {
        moneyAvalible = ns.getServerMoneyAvailable("home")
    }

    const maxRam = ns.getPurchasedServerMaxRam()
    const logMaxRam = Math.log2(maxRam)

    while (true) {
        const myServers = ns.getPurchasedServers()

        let i = 1
        while (true) {
            // ns.tprint(i)
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

        // ns.tprint("--|", i)

        if (i == 0) {
            // cant buy any servers
            break
        }

        const ram = Math.pow(2, i)
        const cost = ns.getPurchasedServerCost(ram)

        // can buy more servers
        if (myServers.length < ns.getPurchasedServerLimit()) {
            moneyAvalible -= cost

        } else {
            let smallest = myServers[0]
            for (let j = 1; j < myServers.length; j++) {
                const pServerName = myServers[j]
                // ns.tprint(j, pServerName, " ", smallest)
                // ns.tprint("  ", ns.getServerMaxRam(pServerName))
                // ns.tprint("  ", ns.getServerMaxRam(smallest))
                

                if (ns.getServerMaxRam(pServerName) < ns.getServerMaxRam(smallest)) {
                    smallest = pServerName
                }
            }

            // ns.tprint(smallest)

            if (ram > ns.getServerMaxRam(smallest)) {
                ns.upgradePurchasedServer(smallest, ram)
                let j = 0
                let possibleName = "pserver-2^" + i
                while (true) {
                    if (!myServers.includes(possibleName)) {
                        ns.renamePurchasedServer(smallest, possibleName)
                        break
                    }

                    possibleName = "pserver-2^" + i + "-" + j
                    j++
                }

                ns.tprint(smallest, possibleName, ram)
                moneyAvalible -= cost

            } else {
                break
            }
        }
    }

}


/** @param {NS} ns */
export async function main(ns) {
    purchaseMaxServers(ns)
}