// full ls i.e prints the full directory names


import { printFileStruct } from "Other/FileBrowser.js"


/** @param {NS} ns */
export async function main(ns) {
    const host = ns.getHostname()
    let allDirs = ns.ls(host)

    printFileStruct(ns, allDirs)
}
