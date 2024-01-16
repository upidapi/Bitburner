import { get_path } from "Aliases/path"
import { getRoot } from "thread/Targeting"

const factionsData = [
    {
        faction: "BitRunners",
        server: "run4theh111z"
    },
    {
        faction: "CyberSec",
        server: "CSEC"
    },
    {
        faction: "Black Hand",
        server: "I.I.I.I"
    },
    {
        faction: "NiteSec",
        server: "avmnite-02h"
    },
]


/** @param {NS} ns */
export async function main(ns) {
    let out = []

    const hackLvl = ns.getHackingLevel()

    for (const factionData of factionsData) {
        const faction = factionData.faction
        const server = factionData.server

        var path = get_path(ns, server, false)

        const command = "connect " + path.join(";connect ") + ";backdoor"

        const backdoorInstalled = ns.getServer(server).backdoorInstalled

        out.push(
            "",
            `${faction}`,
            `    backdoor installed: ${backdoorInstalled}`,
            "",
            `    ${command}`
        )

        const lvlReq = ns.getServerRequiredHackingLevel(server)
        if (hackLvl < lvlReq) {
            out.push(
                `    can't backdoor, hack level too low`,
                `        your hack level ${hackLvl}`,
                `        req hack level ${lvlReq}`,
            )

            continue
        }

        if (!getRoot(ns, server)) {
            // idk if you need root to backdoor 

            out.push(
                `    can't backdoor, no root access`,
            )

            continue
        }
    }

    out.push("\n")

    ns.tprintf(out.join("\n"))
}


export function autocomplete(data, _) {
    return data.servers
}


