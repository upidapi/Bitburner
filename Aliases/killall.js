import { getServers } from "Other/ScanServers.js";


/** @param {NS} ns */
export async function main(ns) {
    const servers = getServers(ns)

    for (let i = 0; i < servers.length; i++) {
        const server = servers[i]
        const scripts = ns.ps(server)
        ns.killall(server)
    }
}
