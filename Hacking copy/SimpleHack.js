// simple hack
// doesn't need a lot of ram 

/** @param {NS} ns */
export async function main(ns) {
  const server_name = ns.args[0]

  while (true) {
    await ns.hack(server_name)
  }
}