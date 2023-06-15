class WGHInstance {
    /**
     * @param {number} lanchTime 
     * @param {number} aSec 
     * @param {number} execTime 
     * @param {string} type 
     * @param {number} threads 
     */
    constructor (lanchTime, aSec, execTime, type, threads) {
        this.lanchTime = lanchTime
        this.aSec = aSec
        this.execTime = execTime
        this.type = type
        this.threads = threads 
    }   
}

class Batch {
    constructor (sleepCorrector, aSec, WGHInstances) {
        this.sleepCorrector = sleepCorrector
        this.aSec = aSec
        this.WGHInstances = WGHInstances
    }
}


/** @param {NS} ns */
export async function main(ns) {
    const portNum = ns.args[0]

    const fps = 24
    while (true) {
        const s = Date.now()

        // code here

        const sleepDuration = (1000 / fps) - s
        await ns.sleep(sleepDuration)
    }
}

