function getSpan(line) {
    if (line.children.length != 1) {
        // ns.print(line.children.length)
        return null
    }

    let subDiv = line.children[0]

    if (subDiv.tagName != "DIV") {
        // ns.print(subDiv.tagName)
        return null
    }

    if (subDiv.children.length != 1) {
        // ns.print(subDiv.children.length)
        return null
    }

    let subSpan = subDiv.children[0]

    if (subSpan.tagName != "SPAN") {
        // ns.print(subSpan.tagName)
        return null
    }

    return subSpan
}


function getAttemptedCommand(lines) {
    // check if last things are a command
    if (lines.length < 2) {
        return null
    }

    const line = lines[lines.length - 2]
    const nextLine = lines[lines.length - 1]

    const lineSpan = getSpan(line)
    if (lineSpan == null) {
        return null
    }

    const nextSpan = getSpan(nextLine)
    if (nextSpan == null) {
        return null
    }

    const nextSpanText = nextSpan.innerText

    // ns.print(nextSpanText)

    if (!(nextSpanText.startsWith("Command ") && nextSpanText.endsWith(" not found"))) {
        return null
    }

    const commandName = nextSpanText.slice("Command ".length, -" not found".length)

    const lineSpanText = lineSpan.innerText

    const tCwdEnd = lineSpanText.indexOf("/]> ")

    // terminal command working directory
    const tCwd = lineSpanText.slice("[".length, tCwdEnd)

    const rawCommandStart = "[" + tCwd + "/]> " + commandName

    if (!lineSpanText.startsWith(rawCommandStart)) {
        // ns.print(lineSpanText, " ", commandStart, "hello")
        return null
    }

    const commandArgStartIndex = rawCommandStart.length + 1

    const commandArgs = lineSpanText.slice(commandArgStartIndex).trim().split(" ")

    return [commandName, commandArgs, tCwd]
}


function callCustomTerminalCommand(ns, commandName, commandArgs, tCwd) {
    ns.tprintf(`called custom terminal command "${commandName}" with the args ${JSON.stringify(commandArgs)}`)
    return true
}


export async function main(ns) {
    ns.disableLog("ALL")

    // ns.clearTerminal()

    let doc = eval(document)

    while (true) {
        await ns.sleep(0)

        // the terminal is a reference to the "<ul> </ul>" in the terminal window
        // this list is filled with list items "<li> </li>"
        // every one of those items correspond to a, for example, ns.tprintf()
        // that is in turn usually filled by a div with a span and the text in that

        /**
         * struct
         * 
         * Terminal:
         * <ul> 
         *   <li> 
         *     <div>
         *       <span> text 1 </span>
         *     </div>
         *   </li>
         *   <li> 
         *     <div>
         *       <span> text 2 </span>
         *     </div>
         *   </li>
         *   <li> 
         *     <div>
         *       <span> text 3 </span>
         *     </div>
         *   </li>
         * </ul>
         */

        let terminal = doc.getElementById("terminal")

        if (terminal == null) {
            // not in terminal window
            // ns.print("no terminal")
            continue
        }

        let lines = terminal.querySelectorAll("li")

        let returnVal = getAttemptedCommand(lines)

        if (returnVal == null) {
            continue
        }

        const [commandName, commandArgs, tCwd] = returnVal

        let foundCommand = callCustomTerminalCommand(ns, commandName, commandArgs, tCwd)

        if (!foundCommand) {
            continue
        }

        // remove the "command {command name} not found" from the terminal
        // we cant directly do this since it will break the clear command (bitburner goes into recovery mode :) )
        // therefore we just remove the text, which has almost the same reault
        getSpan(terminal.lastElementChild).innerText = ""

        // remove the "command {command name} not found" from the terminal
        // terminal.lastElementChild.remove();
    }
}
