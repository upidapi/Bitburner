// my rm

/** @param {NS} ns */
export async function main(ns) {
    const file = ns.args[0]
    let host = ns.args[1]

    if (host == undefined) {
        host = ns.getHostname()
    }

    const allDirs = ns.ls(host)

    if (!file.endsWith("/")) {
        for (let i = 0; i < allDirs.length; i++) {
            const dir  = allDirs[i]
            if (dir == file) {
                ns.rm(file, host)
                ns.tprintf("removed \"" + file + "\" from \"" + host + "\"")
                return
            }
        }

        ns.tprintf("could not find \"" + file + "\" on \"" + host + "\"")
        return
    } 
    
    let rmfiles = []
    for (let i = 0; i < allDirs.length; i++) {
        const dir  = allDirs[i]
        if (dir.startsWith(file)) {
            ns.t
            ns.rm(dir, host)
            rmfiles.push(dir)
        }
    }

    ns.tprintf("removed " + rmfiles.length + " files from \"" + host + "\"")

    rmfiles.forEach((file_name) => {
        ns.tprintf("  " + file_name)
    })
}

export function autocomplete(data, args) {
    return [...data.txts, ...data.scripts]
}
