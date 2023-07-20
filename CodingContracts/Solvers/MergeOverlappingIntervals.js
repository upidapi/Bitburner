function getMerged(merge, intervals) {
    let didMerge = false

    let notAbsorbed = []
    for (let interval of intervals) {
        if ( ! (interval[0] > merge[1] || interval[1] < merge[0])) {

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
//     let map = []

//     for (let thing of data) {
//         let diff = thing[1] - map.length

//         if (diff > 0) {
//             map = map.concat(new Array(diff).fill(0))
//         }

//         for (let i = thing[0]; i <= thing[1]; i++) {
//             map[i] = 1
//         }
//     }

//     map.push(0)

//     let out = []
//     let start = null
//     for (let i = 0; i < map.length; i++) {
//         if (start == null) {
//             if (map[i] == 1) {
//                 start = i
//             }
//         }

//         if (map[i] == 0) {
//             if (start != null) {
//                 out.push([start, i - 1])
//                 start = null
//             }
//         }
//     }

//     return out
// }

// console.log(mergeIntervals(
//     [
//         [
//             9,
//             18
//         ],
//         [
//             15,
//             16
//         ],
//         [
//             9,
//             19
//         ],
//         [
//             22,
//             24
//         ],
//         [
//             22,
//             29
//         ],
//         [
//             17,
//             22
//         ],
//         [
//             2,
//             4
//         ],
//         [
//             16,
//             19
//         ],
//         [
//             25,
//             28
//         ],
//         [
//             17,
//             22
//         ],
//         [
//             9,
//             11
//         ],
//         [
//             14,
//             15
//         ],
//         [
//             10,
//             17
//         ],
//         [
//             19,
//             20
//         ],
//         [
//             8,
//             12
//         ],
//         [
//             18,
//             28
//         ],
//         [
//             23,
//             25
//         ],
//         [
//             5,
//             12
//         ]
//     ]
// ))

// [
//     [
//         9,
//         18
//     ],
//     [
//         9,
//         29
//     ],
//     [
//         2,
//         4
//     ],
//     [
//         17,
//         28
//     ],
//     [
//         23,
//         25
//     ],
//     [
//         5,
//         17
//     ]
// ]

// console.log(mergeIntervals([[11,13], [5,6], [5,6], [19,26], [7,16], [20,24]]))
// console.log()

// // Merge Overlapping Intervals
// // data 
// [
//     [12, 18], 
//     [8, 14], 
//     [15, 17], 
//     [1, 8], 
//     [13, 18], 
//     [3, 8], 
//     [3, 7], 
//     [19, 28], 
//     [4, 7], 
//     [2, 8]
// ]

[
    [
        22,
        27
    ],
    [
        2,
        17
    ]
]

// // my solution
// [
//     [1, 8],
//     [8, 18],
//     [19, 28]
// ]


