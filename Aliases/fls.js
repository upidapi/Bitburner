// full ls i.e prints the full directory names


import { printFileStruct } from "Other/FileBrowser.js"


/** @param {NS} ns */
export async function main(ns) {
    const hoast = ns.getHostname()
    let allDirs = ns.ls(hoast)

    printFileStruct(ns, allDirs)
}
