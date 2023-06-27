function getMerged(merge, intervals) {
    let didMerge = false

    let notAbsorbed = []
    for (let interval of intervals) {
        if ((merge[0] <= interval[0] && interval[0] <= merge[1]) ||
            (merge[0] <= interval[1] && interval[1] <= merge[1])) {

            merge = [
                Math.min(merge[0], interval[0]),
                Math.max(merge[1], interval[1])
            ]

            didMerge = true

        } else {
            notAbsorbed.push(interval)
        }
    }

    if (!didMerge) {
        // nothing changed
        return [merge, intervals]
    }

    return getMerged(merge, notAbsorbed)
}

export function mergeIntervals(data) {
    let intervalsLeft = data

    let out = []
    while (intervalsLeft.length > 0) {
        let merge = intervalsLeft[0]

        let returnVal = getMerged(merge, intervalsLeft.slice(1))

        out.push(returnVal[0])

        intervalsLeft = returnVal[1]
    }

    return out.sort((a, b) => a[0] - b[0])
}

// function mergeIntervals(data) {
//     const nCells = Math.max(...data.map(val => val[1]))

//     console.log(nCells, data)
//     let covered = new Array(nCells).fill(0)

//     for (let interval of data) {
//         for (let i = interval[0]; i <= interval[1]; i++) {
//             covered[i] = 1
//         }
//     }

//     let intervals = []

//     let i = 0
//     let j
//     while (i < covered.length) {

//         if (covered[i] == 1) {
//             for (j = i; j < covered.length; j++) {
//                 if (covered[j] == 0) {
//                     break
//                 }
//             }

//             intervals.push([i, j - 1])
//             i = j
//             continue
//         }

//         i++
//     }

//     return intervals
// }

// console.log(mergeIntervals([
//     [19, 24],
//     [25, 34],
//     [3, 7],
//     [3, 7]
// ]))


// console.log(mergeIntervals(
//     [[19, 24], [25, 34], [3, 7], [3, 7]]
// ))

