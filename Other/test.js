// /** @param {NS} ns **/
// export async function other(ns) {

import { getNextLowSecEnd } from "HybridShotgunBatcher/SecHoles";

// }


export async function main(ns) {
    for (let i = 0; i < 10000; i++) {


        const toEnd = getNextLowSecEnd(Date.now() + (i / 10)) - (Date.now() + (i / 10))
        console.log(toEnd)
    }
}