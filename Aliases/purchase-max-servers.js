import { purchaseMaxServers } from "Other/PurchaseServers.js";

/** @param {NS} ns */
export async function main(ns) {
    await purchaseMaxServers(ns, true)
}