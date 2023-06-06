/** @param {NS} ns */
export function getServersDepth(ns, start_server = "home") {
  let servers = [start_server]
  // formatt list[list[server_name, depth]]
  let unscanedServers = [[start_server, 0]]
  let serverDepth = []

  while (unscanedServers.length != 0) {
    let serverData = unscanedServers.pop()

    let currentServer = serverData[0]
    let depth = serverData[1]

    serverDepth.push([currentServer, depth])

    let serverConnections = ns.scan(currentServer)

    for (let i = serverConnections.length - 1; i >= 0; i--) {
      let elem = serverConnections[i]

      if (!servers.includes(elem)) {
        unscanedServers.push([elem, depth + 1])
        servers.push(elem)
      }
    }
  }
  return serverDepth
}


/** @param {NS} ns */
export function getServers(ns, startServer = "home") {
  var servers = []
  var unscanedServers = [startServer]

  while (unscanedServers.length != 0) {
    let currentServer = unscanedServers.pop()

    var serverConnections = ns.scan(currentServer)

    for (let i = serverConnections.length - 1; i >= 0; i--) {
      let elem = serverConnections[i]

      if (!servers.includes(elem)) {
        unscanedServers.push(elem)
        servers.push(elem)
      }
    }
  }
  return servers
}