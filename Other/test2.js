/** @param {NS} ns */
export async function main(ns) {


    for (let i = 0; i < 100; i++) {
        ns.run("Hacking-copy/ThreadScripts/Weaken.js", 1, "n00dles", i)
        // let s = Date.now()
        // let r = ns.getWeakenTime("n00dles")

        // await ns.weaken("n00dles")

        // let d = Date.now() - s

        // ns.tprint(d - r, " ", d, " ", r)
    }
}