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

    const target = args[1]
    const type = args[2]

    const threads = args[3]

    const afterTime = args[5]

    const portNum = args[6]
    const portHandle = ns.getPortHandle(portNum)

    const duration = {
        "hack": ns.getHackTime,
        "grow": ns.getGrowTime,
        "weaken": ns.getWeakenTime,
    }[type](target)

    const func = {
        "hack": ns.hack,
        "grow": ns.grow,
        "weaken": ns.weaken
    }[type]

    const startTime = execTime - duration
    const aSec = startTime - performance.now()

    if (aSec < 0) {
        // alert that the worker script failed to start
        portHandle.write("worker failed")

    } else {
        const promise = func(target, {
            "additionalMsec": aSec,
            "threads": threads,
        })

        // alert that the worker script has started
        portHandle.write("started worker")

        await promise

        portHandle.write(`${type} worker finished`)
    }
}
