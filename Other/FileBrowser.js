// an improved file browser

import { sortDirs } from "Other/FIleSystem"

/** @param {NS} ns */
export async function printFileStruct(ns, directories) {
    const allFiles = sortDirs(directories)

    let sLastFolder = []
    for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i]
        const sFile = file.split("/")
        
        const result = sDiff(sLastFolder, sFile)
        
        const file_diff = result[1]
        const same = result[2]
        
        let depth = 0
        let padding = ""

        for (let i = 0; i < file_diff.length - 1; i++) {
            depth = same.length + i

            padding = Array(depth + 1).join("  ")
            let folder = file_diff[i]

            ns.tprintf(padding + folder + "/")
        }
    
        depth = file.split("/").length
        padding = Array(depth).join("  ")
        ns.tprintf(padding + file.split("/").slice(-1))

        sLastFolder = sFile
    }
}
