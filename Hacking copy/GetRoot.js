
/** @param {NS} ns */
export async function getRoot(ns, serverName) {
  if (ns.hasRootAccess(serverName)) {
    return true
  }

  const homePrograms = ns.ls("home")
  const portOpeners = []

  function addPossible(file_name, func) {
    if (homePrograms.indexOf(file_name) >= 0) {
      portOpeners.push(func)
    }
  }

  addPossible("BruteSSH.exe", ns.brutessh)
  addPossible("FTPCrack.exe", ns.ftpcrack)
  addPossible("relaySMTP.exe", ns.relaysmtp)
  addPossible("HTTPWorm.exe", ns.httpworm)
  addPossible("SQLInject.exe", ns.sqlinject)

  const portsReq = ns.getServerNumPortsRequired(serverName)

  if (portOpeners.length < portsReq) {
    return false
  }

  // iterate over all needed programs to get root
  for (let i = 0; i < portsReq; i++) {
    portOpeners[i](serverName)
  }

  ns.nuke(serverName)

  return true
}

/** @param {NS} ns */
export async function main(ns) {
  const serverName = ns.args[0]

  return getRoot(ns, serverName)
}

