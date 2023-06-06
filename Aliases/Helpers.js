// this folder is for aliasing different commands

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

        // ignore this file
        if (fileName == "Helpers") {
            continue
        }
        
        // example part fith the file Aliases/test.js"
        // => alias test="run Aliases/test.js";
        command = command + "alias " + fileName + "=" + "\"run " + fullFileName + "\";"
    }

    ns.tprintf(command)
}


// founctions for fully automating it
// /** @param {NS} ns */
// export function injectCommand(commandLine) {
//     const terminalInput = document.getElementById("terminal-input");
//     terminalInput.value = commandLine;
//     const handler = Object.keys(terminalInput)[1];
//     terminalInput[handler].onChange({ target: terminalInput });
//     terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });
// }

// export async function main(ns) {
//     //Download script, create alias and execute alias by injecting commands
//     injectCommand('home; wget https://raw.githubusercontent.com/5p0ng3b0b/bitburner-scripts/main/autoinfiltrate.js autoinfiltrate.js');
//     injectCommand('alias autoinfiltrate=run autoinfiltrate.js');
//     injectcommand('autoinfiltrate');
// }