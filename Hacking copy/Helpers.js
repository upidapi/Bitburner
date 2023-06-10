const RamUsage = {
    "hack": 1.70, // ns.getScriptRam("Hacking/ThreadScripts/ThreadHack.js")
    "grow": 1.75, // ns.getScriptRam("Hacking/ThreadScripts/ThreadHack.js")
    "weaken": 1.75 // ns.getScriptRam("Hacking/ThreadScripts/ThreadHack.js")
}


export class Threads {
    constructor(hack = 0, grow = 0, weaken = 0) {
        this.hack = hack;
        this.grow = grow;
        this.weaken = weaken;
    }

    copy() {
        return Threads(this.hack, this.grow, this.weaken)
    }

    ramUsage() {
        let req_ram = 0

        req_ram += this.hack * RamUsage["hack"]
        req_ram += this.grow * RamUsage["grow"]
        req_ram += this.weaken * RamUsage["weaken"]

        return req_ram
    }
}


/** @param {NS} ns */
export function distributeThreads(ns, servers, script_name, threads, ...args) {
    // distrubutes the script over multiple servers to get a total threads "threads"
    if (threads == 0) {
        return
    }

    const scriptRam = ns.getScriptRam(script_name)

    let serversAndRam = servers.map(server => [server, ns.getServerMaxRam(server) - ns.getServerUsedRam(server)])
    // sort servers_and_ram so that it tries the larges servers first
    serversAndRam.sort((a, b) => (b[1] - a[1]))

    // ns.tprint(serversAndRam[0], serversAndRam.slice(-1))
    for (let i = 0; i < servers.length; i++) {
        let serverName = serversAndRam[i][0]
        let serverRam = serversAndRam[i][1]

        if (serverName == ns.getHostname()) {
            continue
        }

        if (!ns.hasRootAccess(serverName)) {
            continue
        }

        let maxThreads = Math.floor(serverRam / scriptRam)
        let handledThreads = Math.min(maxThreads, threads)
        // disThreads i.e distrubuted threads
        threads -= handledThreads

        if (handledThreads == 0) {
            continue
        }

        ns.scp(script_name, serverName)
        ns.exec(script_name, serverName, handledThreads, ...args)

        if (threads == 0) {
            return
        }
    }

    serversAndRam = servers.map(server => [server, ns.getServerMaxRam(server) - ns.getServerUsedRam(server)])
    // sort servers_and_ram so that it tries the larges servers first
    serversAndRam.sort((a, b) => (b[1] - a[1]))

    console.log("---------")
    ns.tprint("test", servers, servers.length)
    for (let i = 0; i < servers.length; i++) {
        console.log(serversAndRam[0], serversAndRam[1], serverName != ns.getHostname(), ns.hasRootAccess(serverName))
        ns.tprint(serversAndRam[0], serversAndRam[1], serverName != ns.getHostname(), ns.hasRootAccess(serverName))
    }

    throw new Error("not enough ram on servers")
}


/** @param {NS} ns */
export function getAvalibleRam(ns, servers) {
    let serverAvalibleRam = 0

    const hoasName = ns.getHostname()
    for (let i = 0; i < servers.length; i++) {
        let server_name = servers[i]

        if (!ns.hasRootAccess(server_name)) {
            continue
        }

        // todo maby remove this
        if (server_name == hoasName) {
            // due to stability reasones the script realy shuld not spawn "wgh threads" on the server it's on
            continue
        }

        let avalibeRam = ns.getServerMaxRam(server_name) - ns.getServerUsedRam(server_name)

        // remove 2 gb from each server

        // if we don't do this the avalible ram might spread out on several servers 
        // ex (server 1) ram: 1, (server 2) ram: 1, (server 3) ram: 1
        // this would result in a total avalible ram of 3.
        // that would make it beleave it has space for another hack thread (1.6 gb of ram)
        // but no server has enough ram fo it 
        // resulting in the proces chrashing

        // threrfor we remove ram from the avalible ram
        let avalibeRamWithMargins = Math.max(0, avalibeRam - 2)

        serverAvalibleRam += avalibeRamWithMargins
    }

    return serverAvalibleRam
}