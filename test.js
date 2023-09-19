
/**
 * @param {NS} ns 
 */
export async function main(ns) {
    for (const file of ns.ls("home")) {
        ns.rm(file)
    }
}