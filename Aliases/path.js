import { getServersDepth } from "Other/ScanServers.js"


/** @param {NS} ns */
export function get_path(ns, target, servers = null, start_server = null) {
    if (start_server === null) {
        start_server = "home"
    }

    var path = []

    if (servers === null) {
        servers = getServersDepth(ns, start_server)
    } else if (servers[0] != [start_server, 0]) {
        throw new Error("args servers has an invallid structure")
    }

    // ns.tprint(servers)

    for (let i = 0; i < servers.length; i++) {
        var server = servers[i]

        if (server[0] == target) {
            var depth = server[1] + 1

            for (let j = i; j > -1; j--) {
                var server = servers[j]

                if (depth == 0) {
                    break
                }

                // first progress back
                if (server[1] == depth - 1) {
                    depth--
                    path.unshift(server[0])

                    if (ns.getServer(server[0]).backdoorInstalled) {
                        break
                    }
                }
            }

            break
        }
    }

    // path connecf fotmatt =>
    // connect {server_name};connect {server_name} 
    return "connect " + path.join(";connect ")
}


/** @param {NS} ns */
export async function main(ns) {
    var target = ns.args[0]

    var path = get_path(ns, target)

    // makes everything automatic (needs 35gb ram tho and prob some late game thing)
    // for (let i = 0; i < path.length; i++) {
    // ns.singularity.connect(path[i])
    // }

    ns.tprintf(path)
    // navigator.clipboard.writeText(path)
}


export function autocomplete(data, args) {
    return data.servers
}
