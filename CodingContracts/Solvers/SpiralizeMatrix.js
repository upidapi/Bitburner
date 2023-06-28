export function spiralizeMatrix(data) {
    let z = 0

    let out = []

    let xLen = data[0].length
    let yLen = data.length

    let s
    while (true) {
        let halt = false


        // top
        for (let i = z; i < xLen - z; i++) {
            // console.log(data[z][i])
            out.push(data[z][i])
        }

        if (s == out.length) {
            halt = true
        }

        // right
        for (let i = z + 1; i < yLen - z - 1; i++) {
            // console.log(data[i][xLen - 1 - z])
            out.push(data[i][xLen - 1 - z])
        }

        if (z == yLen - 1 - z) {
            // ensure that the center is not added twice
            break
        }

        // bottom
        for (let i = z; i < xLen - z; i++) {
            // console.log(data[yLen - 1 - z][xLen - 1 - i])
            out.push(data[yLen - 1 - z][xLen - 1 - i])
        }

        s = out.length

        // left
        for (let i = z + 1; i < yLen - z - 1; i++) {
            // console.log(data[yLen - 1 - i][z])
            out.push(data[yLen - 1 - i][z])
        }


        if (s == out.length) {
            break
        }

        z++
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

const a = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
]

const b = [
    [1, 2,  3,  4],
    [5, 6,  7,  8],
    [9, 10, 11, 12],
]

const c = [
    [1,  2,  3],
    [4,  5,  6],
    [7,  8,  9],
    [10, 11, 12]
]

const d = [
    [1,  2,  3,  4],
    [5,  6,  7,  8],
    [9,  10, 11, 12],
    [13, 14, 15, 16],
]


// console.log(spiralizeMatrix(a))
// console.log(spiralizeMatrix(b))
// console.log(spiralizeMatrix(c))
// console.log(spiralizeMatrix(d))

