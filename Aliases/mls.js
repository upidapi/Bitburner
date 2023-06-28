// my ls

import { sortDirs } from "Other/FileSystem"

/** @param {NS} ns */
export async function main(ns) {
    const host = ns.getHostname()
    const allDirs = ns.ls(host)
    const sortedDirs = sortDirs(allDirs)
    for (let i = 0; i < sortedDirs.length; i++) {
        ns.tprintf(sortedDirs[i])
    }
}



