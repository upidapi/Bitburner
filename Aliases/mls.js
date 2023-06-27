// my ls

import { sortDirectories } from "Other/FileBrowser.js"


/** @param {NS} ns */
export async function main(ns) {
    const host = ns.getHostname()
    const allDirs = ns.ls(host)
    const sortedDirs = sortDirectories(allDirs)
    for (let i = 0; i < sortedDirs.length; i++) {
        ns.tprintf(sortedDirs[i])
    }
}



