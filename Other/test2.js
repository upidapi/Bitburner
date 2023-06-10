/** @param {NS} ns */
export async function main(ns) {
    const start = ns.args[0]
    ns.tprint(Date.now() - start)
    // ns.tprint(start, " ", Date.now() - start)
}