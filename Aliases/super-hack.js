import { startAtack } from "Hacking/Hack.js"

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0]
    await startAtack(ns, target)
}