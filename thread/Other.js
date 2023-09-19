import { getServers } from "Other/ScanServers"

export class Batch {
    constructor(hack = 0, grow = 0, weaken = 0) {
        this.hack = hack
        this.grow = grow
        this.weaken = weaken
    }

    RamUsage = {
        "hack": 1.70, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
        "grow": 1.75, // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
        "weaken": 1.75 // ns.getScriptRam("HybridShotgunBatcher/ThreadScripts/ThreadHack.js")
    }

    RelativeTime = {
        "hack": 1,
        "grow": 3.2,
        "weaken": 4
    }

    hRam() {
        return this.hack * this.RamUsage.hack
    }

    gRam() {
        return this.grow * this.RamUsage.grow
    }

    wRam() {
        return this.weaken * this.RamUsage.weaken
    }

    ramUsage() {
        return (
            this.hRam() +
            this.gRam() +
            this.wRam()
        )
    }

    averageRamUsage() {
        /**
         * the times of hack, grow, weaken are relative
         * 
         * if hTime = x
         * then gTime = 3.2 * x
         * and wTime = 4 * x
         */

        // the x's cancel out
        const wPart = 1        // 4x   / 4x
        const gPart = 16 / 20  // 3.2x / 4x
        const hPart = 1 / 4    // 1x   / 4x

        const averageRam =
            wPart * this.wRam() +
            gPart * this.gRam() +
            hPart * this.hRam();

        return averageRam
    }
}


/**
 * basically port.nextWrite() but only for select values
 * 
 * @param {NS} ns
 * @param {Number} portNum
 * thing(s) to wait for 
 * @param {Array<String | Number> | String | Number} vals
 */
export async function nextValWrite(ns, portNum, vals) {
    if (!typeof vals == "array") {
        vals = [vals]
    }

    // const toFirst = first - performance.now()
    // if (toFirst <= SleepAccuracy) {
    //     await ns.sleep(toFirst - SleepAccuracy)
    // }

    const portHandle = ns.getPortHandle(portNum)
    // portHandle.clear()

    // if (!portHandle.empty()) {
    //     // unhandled val in port 
    //     // maybe something else wrote to the port 
    //     // or something misspelled was written 

    //     throw new Error(
    //         "port not empty \n" +
    //         `port first elem: ${portHandle.read()}`)
    // }

    
    if (!portHandle.empty()) {
        const data = []

        while (!portHandle.empty()) {
            data.push(portHandle.read())
        }

        throw new Error(`port isn't empty, data: ${data}`)
    }
    
    while (true) {
        await portHandle.nextWrite()
        const val = portHandle.peek()

        // console.log(val)

        if (vals.includes(val)) {
            portHandle.read()

            // portHandle.write("test")
            return val
        }
    }
}


/**
 * basically port.nextWrite() but only for select values
 * 
 * @param {NS} ns
 * @param {Number} portNum
 * thing(s) to wait for 
 * @param {Array<String | Number> | String | Number} vals
 * thing(s) to capture but doesn't count as a "nextValWrite"
 * @param {Array<String | Number> | String | Number} capture
 */
export async function test2(ns, portNum, vals, capture, first, timeout = Infinity) {
    return new Promise((resolve, reject) => {
        test(ns, portNum, vals, capture, first).then(resolve, reject);
        setTimeout(reject, timeout);
    });
}



/**
 * @param {NS} ns 
 * @returns 
 */
function getHsbServers(ns, hostName) {
    const allServers = getServers(ns)

    const availableServers = allServers.filter(
        (x) => {
            if (ns.getServerMaxRam(x) == 0) {
                return false
            }

            if (x == hostName) {
                return false
            }

            if (!ns.hasRootAccess(x)) {
                return false
            }

            return true
        }
    )

    const serversData = availableServers.map((server) => {
        return {
            "server": server,
            "ram": ns.getServerMaxRam(server),
            "usedRam": ns.getServerUsedRam(server),
        }
    })

    return serversData
}

const hostRamMargin = 100

/**
 * @param {NS} ns 
 * @returns 
 */
export function getHsbRamData(ns) {
    const hostName = ns.getHostname()

    const serversData = getHsbServers(ns, hostName)

    let totalServerRam = 0
    let totalServerRamAvailable = 0

    serversData.forEach((serverData) => {
        const serverRam = serverData.ram
        const serverRamUsed = serverData.usedRam
        // remove 2 gb from each server

        // if we don't do this the available ram might spread out on several servers 
        // ex (server 1) ram: 1, (server 2) ram: 1, (server 3) ram: 1
        // this would result in a total available ram of 3.
        // that would make it believe it has space for another hack thread (1.6 gb of ram)
        // but no server has enough ram fo it 
        // resulting in the process crashing

        // therefor we remove ram from the available ram

        // we also add a 1% margin for possible allocations from other sources
        const serverARam = Math.max(0, serverRam - 2) * 0.99
        totalServerRam += serverARam

        totalServerRamAvailable += serverARam - serverRamUsed
    })


    // check if the amount of ram on the servers is lees than the ram on home
    // if so add home as a possibility for WGH thread distribution 
    let hostTotalAvailableRam

    const hostRam = ns.getServerMaxRam(hostName)
    if (hostRam < hostRamMargin * 2) {
        hostTotalAvailableRam = hostRam
    } else {
        hostTotalAvailableRam = Math.max(0, hostRam - hostRamMargin) * 0.99
    }

    if (totalServerRam < hostTotalAvailableRam) {
        const maxRam = totalServerRam + hostTotalAvailableRam

        const hostData = {
            "server": hostName,
            "ram": hostRam,
            "usedRam": ns.getServerUsedRam(hostName)
        }

        const ramAvailable = totalServerRamAvailable + hostRam - ns.getServerUsedRam(hostName)

        return [
            maxRam,
            [...serversData, hostData],
            ramAvailable
        ]
    }

    return [totalServerRam, serversData, totalServerRamAvailable]
}