/**
 * @param {NS} ns 
 * @param {CallableFunction} func 
 * @param {Number} y 
 * @param {Number} min 
 * @param {Number} max 
 * @param {Number} left_margin 
 * @param {Number} right_margin 
 * @param {"min" | "cur" | "max"} preferred 
 */
export function estimateX(
    ns, func, y, min, max, 
    left_margin = 0, 
    right_margin = 0,
    preferred="cur") {
    // console.log("------")
    // console.log(min, func(min))
    // console.log(max, func(max))
    // console.log(y)

    // finds x such that (y - margin < func(x) <= y)
    // if there is no such x return the closest x

    // used for calculating max threads used for specified ram

    // the current x := func(x) that is the closest to y

    let i = 0

    // check if above or below
    if (func(max) < y + left_margin) {
        return max
    }

    if (func(min) > y + right_margin) {
        return min
    }

    let cur

    while (true) {
        cur = (min + max) / 2

        let c_y = func(cur)

        let diff = y - c_y
        if (left_margin <= diff && diff < right_margin) {
            break
        }

        if (c_y > y) {
            // x too big
            max = cur

        } else if (cur == max) {
            // x is larger than max
            break
        } else {
            // x too small
            min = cur
        }

        i++

        if (i > 100) {
            const x_estimate = {
                "min": min,
                "cur": cur,
                "max": max,
            }[preferred]

            // ns.printf(`reached max iterations, returning ${preferred} value ${x_estimate}`)
            // ns.printf(`    target:  ${y}`)
            // ns.printf(`    left margin:  ${left_margin}  right margin: ${right_margin}`)
            // ns.printf("    min: " + min + " func(min): " + func(min))
            // ns.printf("    cur: " + cur + " func(cur): " + func(cur))
            // ns.printf("    max: " + max + " func(max): " + func(max))
            
            func(x_estimate)

            return x_estimate
            
            // throw new Error("could not locate x. min: " + min + " max: " + max + " y: " + y)
        }
    }

    return cur
}


// /** @param {NS} ns */
// export async function main(ns) {
//     console.log(estimateX(
//         ns,
//         x => x,
//         50,
//         0, 
//         1010,
//         0, 
//         1
//     ))
// }