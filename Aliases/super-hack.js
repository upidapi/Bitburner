import { autocomplete } from "Aliases/path"

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0]
    ns.run("HybridShotgunBatcher/Controller.js", 1, target)
}


export function autocomplete(data, args) {
    return data.servers
}