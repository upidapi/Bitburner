export function spiralizeMatrix(data) {
    let out = []
    let loop = 0
    while (true) {
        const topLen = data[0].length - 2 * loop
        const sideLen = data.length - 2 * (loop + 1)

        if (topLen <= 0 || sideLen + 2 <= 0) {
            break
        }

        // top
        const topPart = data[loop].slice(loop, loop + topLen)
        out = out.concat(topPart)

        // left
        for (let i = loop + 1; i < loop + 1 + sideLen; i++) {
            out.push(data[i][data[0].length - 1 - loop])
        }

        // bottom
        if (sideLen != -1) {
            const bottomPart = data[data.length - 1 - loop].slice(loop, loop + topLen)
            out = out.concat(bottomPart.reverse())
        }

        // right
        if (topLen != 1) {
            for (let i = 0; i < sideLen; i++) {
                out.push(data[loop + sideLen - i][loop])
            }
        }

        loop++
    }

    return out
}

// const x = [
//     [24, 24, 2, 7, 1, 26, 21, 41, 33, 22],
//     [37, 27, 35, 22, 24, 3, 12, 37, 21, 3],
//     [35, 20, 42, 36, 37, 49, 14, 49, 21, 3],
//     [31, 5, 15, 6, 34, 35, 7, 21, 2, 6],
//     [17, 46, 25, 43, 13, 44, 38, 42, 7, 45],
//     [1, 34, 37, 6, 1, 11, 11, 46, 39, 23],
// ]


// // [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]

// // [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]

// console.log(spiralizeMatrix(x))

// const a = [
//     [1, 2, 3],
//     [4, 5, 6],
//     [7, 8, 9],
// ]

// const b = [
//     [1, 2, 3, 4],
//     [5, 6, 7, 8],
//     [9, 10, 11, 12],
// ]

// const c = [
//     [1, 2, 3],
//     [4, 5, 6],
//     [7, 8, 9],
//     [10, 11, 12]
// ]

// const d = [
//     [1, 2, 3, 4],
//     [5, 6, 7, 8],
//     [9, 10, 11, 12],
//     [13, 14, 15, 16],
// ]

// const e = [
//     [25, 3,  21, 43, 17, 27, 48, 18],
//     [28, 41, 10, 8,  14, 15, 21, 13],
//     [39, 18, 5,  1,  43, 12, 3,  7],
//     [16, 47, 2,  9,  49, 34, 25, 11],
//     [39, 25, 14, 40, 42, 49, 39, 6],
//     [3,  39, 30, 18, 21, 44, 50, 18],
//     [21, 4,  48, 13, 44, 21, 17, 44],
//     [2,  42, 15, 27, 27, 22, 42, 4],
//     [25, 23, 35, 5,  8,  40, 36, 18],
//     [14, 31, 19, 29, 43, 10, 13, 30],
//     [10, 3,  21, 33, 2,  5,  23, 18],
// ]
// [9, 49, 42, 21, 44, 27, 27, 13, 18, 40, 18, 21]
// console.log(spiralizeMatrix(a))
// console.log(spiralizeMatrix(b))
// console.log(spiralizeMatrix(c))
// console.log(spiralizeMatrix(d))
// console.log(spiralizeMatrix(e))

// console.log(spiralizeMatrix(e))
// console.log()
