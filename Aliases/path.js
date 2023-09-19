import { getServersDepth } from "Other/ScanServers.js"


/** @param {NS} ns */
export function get_path(ns, target, no_backdoor = false) {
    let start_server = "home"

    var path = [target]

    const serversData = getServersDepth(ns, start_server)

    let curDepth
    let curServer = target

    for (const [serverName, serverDepth] of serversData) {
        if (serverName == target) {
            curDepth = serverDepth
            break
        }
    }

    if (curDepth == undefined) {
        throw new Error(`couldn't find server: ${target}`)
    }

    Main: while (true) {
        if (curDepth == 0) {
            break Main
        }

        if (!no_backdoor) {
            if (ns.getServer(curServer).backdoorInstalled) {
                break Main
            }
        }
        
        for (const [serverName, serverDepth] of serversData) {
            if (serverDepth != curDepth - 1) {
                continue
            }

            if (!ns.scan(curServer).includes(serverName)) {
                continue
            }

            path.unshift(serverName)
            curServer = serverName
            curDepth--

            break
        }
    }

    return "connect " + path.join(";connect ")
}


/** @param {NS} ns */
export async function main(ns, no_backdoor) {
    var target = ns.args[0]

    var path = get_path(ns, target, no_backdoor)

    // makes everything automatic (needs 35gb ram tho and prob some late game thing)
    // for (let i = 0; i < path.length; i++) {
    // ns.singularity.connect(path[i])
    // }

    ns.tprintf(path)
    // navigator.clipboard.writeText(path)
}


export function autocomplete(data, _) {
    return data.servers
}
