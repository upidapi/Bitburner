import { deFormatGameNum } from "Helpers/Formatting"

/** @param {NS} ns */
export async function main(ns) {
    ns.tprintf(deFormatGameNum("12m")) // => 12000000
    ns.tprintf(deFormatGameNum("1.3k")) // => 1300
    ns.tprintf(deFormatGameNum("1.3e10")) // => 13000000000 (1.3 * 10^10)
    ns.tprintf(deFormatGameNum("1.3e-2")) // => 0.013 (1.3 * 10^-2)
}

