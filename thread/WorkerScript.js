// WARNING should not be called manually 
// only Worker.js should run this script

// The reason that this isn't in Worker.js is due to imports 
// from other files (not used in the actual worker script 
// main). When you copy and run the script on another server 
// the imports break the worker since it tries to import the
// functions even if it wont be used. Since the files the
// import is from isn't copied over the script will break.  


/**
 * @param {NS} ns
 */
export async function main(ns) {
    const args = ns.args

    const compiling = args[0]

    if (compiling) {
        return
    }

    const [_, target, type, threads, duration, execTime, portNum] = args
    // const target = args[1]
    // const type = args[2]

    // const threads = args[3]

    // const duration = args[4]
    // const execTime = args[5]

    // const portNum = args[6]
    
    const portHandle = ns.getPortHandle(portNum)

    const func = {
        "hack": ns.hack,
        "grow": ns.grow,
        "weaken": ns.weaken
    }[type]
    
    const startTime = execTime - duration
    const aSec = startTime - performance.now()

    if (aSec < 0) {
        console.log([
            `target: ${target}`,
            `type: ${type}`,
            `threads: ${threads}`,
            `duration: ${duration}`,
            `execTime: ${execTime}`,
            `startTime: ${startTime}`,
            `aSec: ${aSec}`,
        ].join("\n"))

        // alert that the worker script failed to start
        portHandle.write("worker failed")
    
    } else {
        // ns.print([
        //     `target: ${target}`,
        //     `type: ${type}`,
        //     `threads: ${threads}`,
        //     `duration: ${duration}`,
        //     `execTime: ${execTime}`,
        //     `aSec: ${aSec}`,
        // ].join("\n"))
        
        const promise = func(target, {
            "additionalMsec": aSec,
            "threads": threads,
        })

        // alert that the worker script has started
        portHandle.write("started worker")

        await promise
        
        // ns.tprintf("1 - " + type)

        portHandle.write(`${type} worker finished`)
    }
}
