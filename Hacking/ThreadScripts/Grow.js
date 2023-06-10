/**
 * thease files are for "multithreading"
 */

/** @param {NS} ns */
export async function main(ns) {
    await ns.grow(ns.args[0])
    ns.tprintf("b")
  }