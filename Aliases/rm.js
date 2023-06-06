// my rm

/** @param {NS} ns */
export async function main(ns) {
    const file = ns.args[0]
    let hoast = ns.args[1]

    if (hoast == undefined) {
        hoast = ns.getHostname()
    }

    const allDirs = ns.ls(hoast)

    if (!file.endsWith("/")) {
        for (let i = 0; i < allDirs.length; i++) {
            const dir  = allDirs[i]
            if (dir == file) {
                ns.rm(file, hoast)
                ns.tprintf("removed \"" + file + "\" from \"" + hoast + "\"")
                return
            }
        }

        ns.tprintf("could not find \"" + file + "\" on \"" + hoast + "\"")
        return
    } 
    
    let rmfiles = []
    for (let i = 0; i < allDirs.length; i++) {
        const dir  = allDirs[i]
        if (dir.startsWith(file)) {
            ns.t
            ns.rm(dir, hoast)
            rmfiles.push(dir)
        }
    }

    ns.tprintf("removed " + rmfiles.length + " files from \"" + hoast + "\"")

    rmfiles.forEach((file_name) => {
        ns.tprintf("  " + file_name)
    })
}

