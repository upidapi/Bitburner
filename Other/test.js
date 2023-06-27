/** @param {NS} ns */
export async function main(ns) {
    let servers = ns.getPurchasedServers()
    ns.tprint(servers)
    console.log(servers)

    for (let server of servers) {
        if (server.startsWith("pserver-2^20")) {
            continue
        }

        ns.deleteServer(server)
    }

    servers = ns.getPurchasedServers()
    ns.tprint(servers)
    console.log(servers)
}