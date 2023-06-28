let cache1 = new Map()

export function waysToSumI(data) {
    cache1 = new Map()
    return waysToSum(data, Infinity)
}

let cache2 = new Map()

export function waysToSumII(data) {
    cache2 = new Map()

    // console.log(data)
    return strictWaysToSum(data[0], Infinity, data[1])
}



function waysToSum(target, lastNum) {
    if (target == 0) {
        return 1
    }

    const key = JSON.stringify([target, lastNum])
    if (cache1.has(key)) return cache1.get(key)

    let sum = 0

    for (let i = 1; i <= lastNum; i++) {
        // need at least 2 integers per sum
        if (lastNum == Infinity) {
            if (i >= target) {
                break
            }
        }

        if (i > target) {
            break
        }

        sum += waysToSum(target - i, i)
    }

    cache1.set(key, sum)
    return sum
}

function strictWaysToSum(target, lastNum, options) {
    if (target == 0) {
        return 1
    }

    const key = JSON.stringify([target, lastNum])
    if (cache2.has(key)) return cache2.get(key)

    let sum = 0

    for (let i of options) {
        if (i > target) {
            break
        }

        if (i > lastNum) {
            break
        }

        sum += strictWaysToSum(target - i, i, options)
        // console.log(sum, target - i, i, options)
    }

    cache2.set(key, sum)

    return sum
}

// console.log(waysToSum(
//     11,
//     Infinity,
// ))


// console.log(strictWaysToSum(
//     182,
//     Infinity,
//     [1, 2, 3, 4, 5, 6, 7, 8]
// ))

// console.log(
//     waysToSumII([
//         182,
//         [
//             1,
//             2,
//             3,
//             4,
//             5,
//             6,
//             7,
//             8
//         ]
//     ]))
