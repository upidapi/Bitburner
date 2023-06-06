// an improved file browser

function sDiff(a, b) {
    const min_len = Math.min(a.length, b.length)

    for (let i = 0; i < min_len; i++) {
        if (a[i] ==  b[i]) {
            continue
        } 
        
        return [a.slice(i), b.slice(i), a.slice(0, i)]
    } 

    return [a.slice(min_len), b.slice(min_len), a.slice(0, min_len)]
}

/** @param {NS} ns */
export function sortDirectories(directories) {
    return directories.sort((a, b) => {
        // ns.tprintf(" ")
        // ns.tprint(a, "   ", a_s.length)
        // ns.tprint(b, "   ", b_s.length)
        
        let result = sDiff(a, b)
        const a_d = result[0]
        const b_d = result[1]
        
        let a_s = a_d.split("/")
        let b_s = b_d.split("/")

        if (a_s.length == 1 && b_s.length != 1) {
            return 1
        }

        if (a_s.length != 1 && b_s.length == 1) {
            return -1
        }

        for (let i = 0; i < Math.min(a_s.length, b_s.length); i++) {
            if (a_s[i] == b_s[i]) {
                continue
            }

            return a_s[i] > b_s[i] ? 1 : -1
        }
        
        return a_s.length > b_s.length ? -1 : 1
    })
}

/** @param {NS} ns */
export async function printFileStruct(ns, directories) {
    const allFiles = sortDirectories(directories)

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
