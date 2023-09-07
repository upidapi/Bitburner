/**
 * @param {NS} ns 
 */
export async function main(ns) {
    const MinDiff = 1000

    const exec = performance.now() + 10000
    const servers = [
        {
            "server": "home",
            "ram": 1000000,
            "usedRam": 0,
        }
    ]

    let loops = 1
    while (true) {
        const s = performance.now()

        for (let i = 0; i < loops; i++) {
            await startWorker(
                ns,
                servers,
                "n00dles",
                "weaken",
                1,
                exec)
            // performance.now()
        }

        // 1 / 5000

        const e = performance.now()
        const diff = (e - s)

        if (diff < MinDiff) {
            loops *= 10
            continue
        }

        console.log((diff / loops).toFixed(20).replace(/\.?0+$/, ""), diff, loops)

        break
    }
}


/**
 * @param {NS} ns 
 */
export async function timeFunction(func, MinDiff=1000) {
    let loops = 1
    while (true) {
        const s = performance.now()

        for (let i = 0; i < loops; i++) {
            // console.log(1)
            await func()
        }

        const e = performance.now()
        const diff = (e - s)

        // console.log(diff)

        if (diff < MinDiff) {
            loops *= 10
            continue
        }

        // console.log((diff / loops).toFixed(20).replace(/\.?0+$/, ""), diff, loops)

        return diff / loops
    }
}