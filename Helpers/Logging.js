export class Logger {
    /**
     * @param {NS} ns 
     * @param {"log" | "both" | "console"} mode 
     */
    constructor(ns, mode) {
        this.ns = ns
        this.mode = mode
    }

    log(message) {
        if (this.mode == "log") {
            this.ns.print(message)

        } else if (this.mode == "both") {
            this.ns.print(message)
            console.log(message)

        } else if (this.mode == "console") {
            console.log(message)
        }

    }
}