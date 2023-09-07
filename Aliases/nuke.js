import { getRoot } from "thread/Targeting"

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0]
    const succeeded = getRoot(ns, target)
    if (succeeded) {
        ns.tprintf("successfully nuked " + target)
    } else {
        ns.tprintf("failed to nuke " + target)
    }
}


export function autocomplete(data, args) {
    return data.servers
}