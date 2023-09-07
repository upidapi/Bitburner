/**
 * thease files are for "multithreading"
 */

/** @param {NS} ns */
export async function main(ns) {
  const target = ns.args[0]
  const additionalMsec = ns.args[1]

  console.log(`start ${ns.args[2]} ${performance.now()}`)

  await ns.hack(target, { additionalMsec: additionalMsec })
  console.log(`end ${ns.args[2]} ${performance.now()}`)

  ns.tprintf(`H ${ns.args[2]} ${ns.args[3]} ${ns.args[4]}`)
}