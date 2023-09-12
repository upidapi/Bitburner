/** @param {NS} ns */
function getServerName(ns, ramPow) {
    const myServers = ns.getPurchasedServers()

    let j = 0
    while (true) {
        const possibleName = "pserver-2^" + ramPow + "-" + j

        if (!myServers.includes(possibleName)) {
            return possibleName
        }

        j++
    }
}


/** @param {NS} ns */
export async function purchaseMaxServers(ns, logging = false, moneyAvailable = null) {
    if (moneyAvailable == null) {
        moneyAvailable = ns.getServerMoneyAvailable("home")
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

            if (ns.getPurchasedServerCost(Math.pow(2, i)) > moneyAvailable) {
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

        if (myServers.length < ns.getPurchasedServerLimit()) {
            // can buy new servers
            moneyAvailable -= cost

            const newServerName = getServerName(ns, i)

            ns.purchaseServer(newServerName, ram)

            ns.tprintf(`purchased server (${newServerName})`)

        } else {
            // must upgrade old servers

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

                const newServerName = getServerName(ns, i)
                ns.renamePurchasedServer(smallest, newServerName)

                if (logging) {
                    ns.print(`upgraded server (${smallest} => ${newServerName})`)
                }

                moneyAvailable -= cost

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