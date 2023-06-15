/**
 * thease files are for "multithreading"
 */

/** @param {NS} ns */
export async function main(ns) {
  const target = ns.args[0]
  const additionalMsec = ns.args[1]

  await ns.grow(target, { additionalMsec: additionalMsec })
  ns.tprintf("G " + ns.args[2])
}