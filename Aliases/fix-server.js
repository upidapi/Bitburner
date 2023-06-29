import { fixServer } from "HybridShotgunBatcher/SetupServer"

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0]
    await fixServer(ns, target)
}


export function autocomplete(data, args) {
    return data.servers
}