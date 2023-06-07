// this folder is for setting up aliasing for different commands

// filename is the same as the command name (-.js)

/** @param {NS} ns */
export function main(ns) {
    // setup all aliases
    const allFiles = ns.ls("home")
    let command = ""

    for (let i = 0; i < allFiles.length; i++) {
        let fullFileName = allFiles[i]
        
        // ns.tprintf(fullFileName)
        if (!(fullFileName.startsWith("Aliases/") && fullFileName.endsWith(".js"))) {
            continue
        }

        let fileName = fullFileName.slice("Aliases/".length, -".js".length)
        // ns.tprintf(fileName)
        
        // example part fith the file Aliases/test.js"
        // => alias test="run Aliases/test.js";
        command = command + "alias " + fileName + "=" + "\"run " + fullFileName + "\";"
    }

    ns.tprintf(command)
}
