export function decompressLZ(data) {
    let uncompressed = ""

    let type = 0

    let i = 0
    while (i < data.length) {
        let chunkSize = parseInt(data[i])
        let nChar = data[i + 1]

        if (chunkSize == 0) {
            i++

            type = type == 0 ? 1 : 0
            continue
        }

        if (type == 0 || parseInt(nChar) == NaN) {
            // instead of checking if it's the last, just assume that is should be the 
            // other type if the chunk is invalid

            // the next char is not a number

            let endPos = i + 1 + chunkSize
            i++

            while (i < endPos) {

                // if (data[i] == "0") {
                //     i++
                //     break
                // }

                uncompressed = uncompressed + data[i]
                i++
            }

            // uncompressed = uncompressed + data.slice(i + 1, i + 1 + chunkSize)
            // i = i + 1 + chunkSize

            type = 1
        } else {
            // the next char is a number

            nChar = parseInt(nChar)

            let start = uncompressed.length - nChar

            for (let j = 0; j < chunkSize; j++) {
                uncompressed = uncompressed + uncompressed[start + j]
            }

            i += 2

            type = 0

        }

    }

    return uncompressed
}


// // the following is exclusively for compressing
// function getOptMul(bef, aft) {
//     // format: compressed version, chars compressed
//     let best = ["0", 0]

//     let maxMulLen = Math.min(9, bef.length)

//     for (let i = 1; i <= maxMulLen; i++) {

//         // the part to be "extended" "j" characters
//         let mulPart = bef.slice(-i)

//         // j i.e extendLength
//         let j = 0
//         while (aft[j] == mulPart[j % mulPart.length]) {
//             j++
//         }

//         if (j > best[1]) {
//             best = [`${j}${i}`, j]
//         }
//     }

//     return best
// }

// function getT1Options(aft) {
//     let maxSecLen = Math.min(9, aft.length)

//     let options = []
//     for (let i = 0; i <= maxSecLen; i++) {
//         let befPart = aft.slice(0, i)

//         options.push([`${i}${befPart}`, i])
//     }

//     return options
// }

// export function compressLZ(uncompressed) {
//     // let bestOptions = [
//     //     //["cL", "cV"]
//     //     [0, ""]
//     // ]

//     // function addToBest(comVer, conLen) {
//     //     for (let i in bestOptions) {
//     //         let [cL, cV] = bestOptions[i]

//     //         if (cL > conLen) {
//     //             // insert [cL, cV] at i
//     //             break
//     //         }

//     //         if (cL == conLen) {
//     //             if (comVer.length < cV.length) {
//     //                 bestOptions[conLen] = comVer
//     //             }
//     //         }
//     //     }
//     // }

//     let bestOptions = {
//         0: ""
//     }

//     function addToBest(cV, cL) {
//         if (bestOptions[cL] == undefined) {
//             bestOptions[cL] = cV
//             return
//         }

//         if (cV.length < bestOptions[cL].length) {
//             bestOptions[cL] = cV
//         }
//     }

//     // cV := compressed version
//     // cL := contracted length

//     let start = 0
//     // option = [cV, cL]
//     while (true) {
//         let beforeCom = bestOptions[start]

//         if (start == uncompressed.length) {
//             return beforeCom
//         }

//         let T1Options = getT1Options(uncompressed.slice(start))
//         for (let [cV, cL] of T1Options) {

//             if (start + cL == uncompressed.length) {
//                 // we have reached the end

//                 // therefor the last chunk can also be of type 2

//                 let bef = uncompressed.slice(0, start)
//                 let aft = uncompressed.slice(start)

//                 let [cMV, mulLen] = getOptMul(bef, aft)

//                 addToBest(beforeCom + cV, start + cL)

//                 if (mulLen == cL) {
//                     // if using type 2 is possible add that as a possibility

//                     addToBest(beforeCom + cMV, start + mulLen)
//                 }

//                 continue
//             }

//             let bef = uncompressed.slice(0, start + cL)
//             let aft = uncompressed.slice(start + cL)

//             let [cMV, mulLen] = getOptMul(bef, aft)

//             if (start + cL + mulLen == uncompressed.length) {
//                 // we have reached the end

//                 let T1Options = getT1Options(uncompressed.slice(start + cL))

//                 // p := possible
//                 let [pCV, pCL] = T1Options[T1Options.length - 1]

//                 addToBest(beforeCom + cV + cMV, start + cL + mulLen)

//                 if (pCL == mulLen) {
//                     // if using type 1 is possible add that 

//                     addToBest(beforeCom + cV + pCV, start + cL + pCL)
//                 }

//                 continue
//             }

//             addToBest(beforeCom + cV + cMV, start + cL + mulLen)
//         }

//         // get next smallest start
//         for (let x of Object.keys(bestOptions).sort((a, b) => a - b)) {
//             x = parseInt(x)

//             if (x > start) {
//                 start = x
//                 break
//             }
//         }
//     }

// }


function getT1Options(start, uncompressed) {
    const t1Options = []  // [[["0"], 0]]
    for (let i = 0; i < 10; i++) {
        if (i + start > uncompressed.length) {
            break
        }

        const part = uncompressed.slice(start, i + start)

        t1Options.push([
            [i.toString(), ...part],
            i
        ])
    }

    return t1Options
}


function getT2Options(start, uncompressed) {
    // cLen, [compressed, uLen]
    const t2Options = [[["0"], 0]]

    // i := how long back
    for (let i = 1; i < 10; i++) {
        if (start - i < 0) {
            break
        }

        // j := chars copied 
        label: for (let j = 1; j < 10; j++) {
            if (start + j > uncompressed.length) {
                break
            }

            const befPart = uncompressed.slice(start - i, start).join("")
            const fullPart = decompressLZ(`${i}${befPart}${j}${i}`)

            for (let k = 0; k < i + j; k++) {
                if (fullPart[k] != uncompressed[start - i + k]) {
                    // remove invalid options
                    continue label
                }
            }

            t2Options.push([
                [j.toString(), i.toString()],
                j
            ])
        }
    }

    return reduceOptions(t2Options)
}

function reduceOptions(options) {
    const merge = {}

    for (const option of options) {
        if (merge[option[1]] == undefined) {
            merge[option[1]] = []
        }

        merge[option[1]].push(option)
    }

    let bestULen = -1
    const out = []
    for (let [uLen, data] of Object.entries(merge)) {
        uLen = JSON.parse(uLen)

        if (uLen <= bestULen) {
            continue
        }

        // data
        // [[compressed, uLen]]
        // uLen i.e how many chars we compressed

        let best = data[0]
        for (const [compressed, _] of data.slice(1)) {
            if (compressed.length < best[0].length) {
                best = [compressed, uLen]
            }
        }

        bestULen = best[1]

        out.push(best)
    }

    return out 
}

/**
 * 
 * @param {String[]} uncompressed 
 */
export function compressLZ(uncompressed) {
    uncompressed = [...uncompressed]

    // compressed, uLen
    let bestOptions = [[[], 0]]

    while (true) {
        let [compressed, uLen] = bestOptions[0]

        // for (const endOption of getEndOptions(uLen, uncompressed)) {
        //     bestOptions.push([
        //         [...compressed, ...endOption[0]],
        //         uLen + endOption[1]
        //     ])
        // }

        for (const nextPart of getT1Options(uLen, uncompressed)) {

            if (uLen + nextPart[1] == uncompressed.length) {
                bestOptions.push([
                    [...compressed, ...nextPart[0]],
                    uLen + nextPart[1]
                ])

                continue
            }

            // for (const endOption of getEndOptions(uLen + nextPart[1], uncompressed)) {
            //     bestOptions.push([
            //         [...compressed, ...nextPart[0], ...endOption[0]],
            //         uLen + nextPart[1] + endOption[1]
            //     ])
            // }

            for (const nextNextPart of getT2Options(uLen + nextPart[1], uncompressed)) {
                bestOptions.push([
                    [...compressed, ...nextPart[0], ...nextNextPart[0]],
                    uLen + nextPart[1] + nextNextPart[1]
                ])
            }
        }

        bestOptions = reduceOptions(bestOptions)

        bestOptions.shift(0)

        if (bestOptions.length == 1) {
            const bestFullCompression = bestOptions[0][0]
            return bestFullCompression.join("")
        }
    }
}

// const x = decompressLZ("1a91031")
// const y = decompressLZ("1a9131")

// const inputs = [
//     "mississippi",
//     "SzHUzHUzHUzHUuR8pHUzHUWFWJiYbPPPPPxCPPPxCPmxCPmxCPmxCPTqRS8CPTqRS8CPCP4RnYC7qpC32YC7qpC34"
// ]

// for (const input of inputs) {
//     const output = compressLZ2(input)
//     const reInput = decompressLZ(output)
//     console.log({
//         "input": input,
//         "reInput": reInput,
//         "output": output
//     })

// }

// console.log("hi")