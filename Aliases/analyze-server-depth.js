import { depthScanAnalyze } from "Other/AnalyzeServers.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")

    await depthScanAnalyze(ns)
}

