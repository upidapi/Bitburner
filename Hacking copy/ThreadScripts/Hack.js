/**
 * thease files are for "multithreading"
 */

/** @param {NS} ns */
export async function main(ns) {
  target = ns.args[0]
  additionalMsec = ns.args[1]

  await ns.hack(target, { additionalMsec: additionalMsec })
}