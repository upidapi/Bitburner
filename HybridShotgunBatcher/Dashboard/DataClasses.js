export class WGHData {
    /**
     * @param {string} WGHType 
     * @param {number} duration 
     * @param {number} aSec 
     */
    constructor(WGHType, duration, threads, aSec = 0) { // possibly add threads
        this.WGHType = WGHType
        this.duration = duration
        this.threads = threads
        this.aSec = aSec
    }

    getTotalDuration() {
        return this.aSec + this.duration
    }
}

export class BatchData {
    /**
     * @param {WGHData} wI 
     * @param {WGHData} gI 
     * @param {WGHData} hI 
     */
    constructor(wI, gI, hI) {
        this.wI = wI
        this.gI = gI
        this.hI = hI
    }

    getTotalDuration() {
        return this.wI.getTotalDuration()
    }
}

export class ShotgunData {
    /**
     * @param {BatchData} batch 
     * @param {number} sleepCorrector 
     * @param {number} deltaBatch 
     * @param {number} nBatches 
     */
    constructor(batch, sleepCorrector, deltaBatch, nBatches) {
        this.batch = batch
        this.sleepCorrector = sleepCorrector
        this.deltaBatch = deltaBatch
        this.nBatches = nBatches
    }

    getTotalDuration() {
        return this.batch.getTotalDuration() + this.sleepCorrector + this.deltaBatch * (this.nBatches - 1)
    }
}

export class LogEntry {
    /**
     * @param {number} startTime 
     * @param {WGHData | BatchData | ShotgunData} data 
     */
    constructor(startTime, data, target, dataClass = null) {
        this.startTime = startTime
        this.data = data
        this.target = target
        this.dataClass = dataClass // only for signifying
    }

    toStr() {
        return JSON.stringify(this)
    }

    writeToPort(portHandle) {
        portHandle.write(this.toStr())
    }
}

function convertToObject(objData, objClass) {
    function insertValues(obj, data) {
        for (const [key, value] of Object.entries(data)) {
            obj[key] = value
        }

        return obj
    }

    if (objClass == "LogEntry") {
        let baseObj = new LogEntry(null, null)

        baseObj = insertValues(baseObj, objData)
        baseObj.data = convertToObject(baseObj.data, baseObj.dataClass)

        return baseObj
    }

    if (objClass == "ShotgunData") {
        let baseObj = new ShotgunData(null, null, null, null)

        baseObj = insertValues(baseObj, objData)

        baseObj.batch = convertToObject(baseObj.batch, "BatchData")

        return baseObj
    }

    if (objClass == "BatchData") {
        let baseObj = new BatchData(null, null, null)

        baseObj = insertValues(baseObj, objData)

        baseObj.wI = convertToObject(baseObj.wI, "WGHData")
        baseObj.gI = convertToObject(baseObj.gI, "WGHData")
        baseObj.hI = convertToObject(baseObj.hI, "WGHData")

        return baseObj
    }

    if (objClass == "WGHData") {
        let baseObj = new WGHData(null, null, null)

        baseObj = insertValues(baseObj, objData)

        return baseObj
    }
}

export function strToLog(strData) {
    // console.log(strData)
    const data = JSON.parse(strData)
    return convertToObject(data, "LogEntry")
}