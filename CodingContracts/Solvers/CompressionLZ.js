 function decompressLZ(data) {
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


// the following is exclusively for compressing
function getOptMul(bef, aft) {
    // format: compressed version, chars compressed
    let best = ["0", 0]

    let maxMulLen = Math.min(9, bef.length)

    for (let i = 1; i <= maxMulLen; i++) {

        // the part to be "extended" "j" characters
        let mulPart = bef.slice(-i)

        // j i.e extendLength
        let j = 0
        while (aft[j] == mulPart[j % mulPart.length]) {
            j++
        }

        if (j > best[1]) {
            best = [`${j}${i}`, j]
        }
    }

    return best
}

function getT1Options(aft) {
    let maxSecLen = Math.min(9, aft.length)

    let options = []
    for (let i = 0; i <= maxSecLen; i++) {
        let befPart = aft.slice(0, i)

        options.push([`${i}${befPart}`, i])
    }

    return options
}

 function compressLZ(uncompressed) {
    // let bestOptions = [
    //     //["cL", "cV"]
    //     [0, ""]
    // ]

    // function addToBest(comVer, conLen) {
    //     for (let i in bestOptions) {
    //         let [cL, cV] = bestOptions[i]

    //         if (cL > conLen) {
    //             // insert [cL, cV] at i
    //             break
    //         }

    //         if (cL == conLen) {
    //             if (comVer.length < cV.length) {
    //                 bestOptions[conLen] = comVer
    //             }
    //         }
    //     }
    // }

    let bestOptions = {
        0: ""
    }

    function addToBest(cV, cL) {
        if (bestOptions[cL] == undefined) {
            bestOptions[cL] = cV
            return
        }

        if (cV.length < bestOptions[cL].length) {
            bestOptions[cL] = cV
        }
    }

    // cV := compressed version
    // cL := contracted length

    let start = 0
    // option = [cV, cL]
    while (true) {
        let beforeCom = bestOptions[start]

        if (start == uncompressed.length) {
            return beforeCom
        }

        let T1Options = getT1Options(uncompressed.slice(start))
        for (let [cV, cL] of T1Options) {

            if (start + cL == uncompressed.length) {
                // we have reached the end

                // therefor the last chunk can also be of type 2

                let bef = uncompressed.slice(0, start)
                let aft = uncompressed.slice(start)

                let [cMV, mulLen] = getOptMul(bef, aft)

                addToBest(beforeCom + cV, start + cL)

                if (mulLen == cL) {
                    // if using type 2 is possible add that as a possibility

                    addToBest(beforeCom + cMV, start + mulLen)
                }

                continue
            }

            let bef = uncompressed.slice(0, start + cL)
            let aft = uncompressed.slice(start + cL)

            let [cMV, mulLen] = getOptMul(bef, aft)

            if (start + cL + mulLen == uncompressed.length) {
                // we have reached the end

                let T1Options = getT1Options(uncompressed.slice(start + cL))

                // p := possible
                let [pCV, pCL] = T1Options[T1Options.length - 1]

                addToBest(beforeCom + cV + cMV, start + cL + mulLen)

                if (pCL == mulLen) {
                    // if using type 1 is possible add that 

                    addToBest(beforeCom + cV + pCV, start + cL + pCL)
                }

                continue
            }

            addToBest(beforeCom + cV + cMV, start + cL + mulLen)
        }

        // get next smallest start
        for (let x of Object.keys(bestOptions).sort((a, b) => a - b)) {
            x = parseInt(x)

            if (x > start) {
                start = x
                break
            }
        }
    }

}

// console.log(decompressLZ(compressLZ("SzHUzHUzHUzHUuR8pHUzHUWFWJiYbPPPPPxCPPPxCPmxCPmxCPmxCPTqRS8CPTqRS8CPCP4RnYC7qpC32YC7qpC34")) == "SzHUzHUzHUzHUuR8pHUzHUWFWJiYbPPPPPxCPPPxCPmxCPmxCPmxCPTqRS8CPTqRS8CPCP4RnYC7qpC32YC7qpC34")
// // SzHUzHUzHUzHUuR8pHUzHUWFWJiYbPPPPPxCPPPxCPmxCPmxCPmxCPTqRS8CPTqRS8CPCP4RnYC7qpC32YC7qpC34
// // SzHUzHUzHUzHUuR8pHUzHUWFWJiYbPPPPPxCPPPxCPmm5TqR73CP4189nqpC32783

// console.log(decompressLZ(compressLZ("SzHUzHUzHUzHUuR8pHUzHUWFWJiYbPPPPPxCPPPxCPmxCPmxCPmxCPTqRS8CPTqRS8CPCP4RnYC7qpC32YC7qpC34")))
// console.log(compressLZ("SzHUzHUzHUzHUuR8pHUzHUWFWJiYbPPPPPxCPPPxCPmxCPmxCPmxCPTqRS8CPTqRS8CPCP4RnYC7qpC32YC7qpC34"))

// console.log(compressLZ("ababac"))

// console.log("----")

// console.log(compressLZ("BqhbfA5Fr74cfA5Fr74cjxcr74cjxcsrhsupoYWhMS4b5s5sW35Ip363sW35Ip3IgZ5cHHHHH"))
// console.log()

// let a, b

// [a, b] = x

// console.log(a, b, x)
// RKSyqSyqSycqSycqSycqSycqSySJycqSySJycpjA1B1CFhc6M61CFhc6M6ufF6QC8C8C8C8C888888undefinedundefined
// RKSyqSyqSycqSycqSycqSycqSySJycqSySJycpjA1B1CFhc6M61CFhc6M6ufF6QC8C8C8C88Z8C88m8m8m8m8


// function comprLZDecode(compr) {
//     let plain = "";

//     for (let i = 0; i < compr.length;) {
//         const literal_length = compr.charCodeAt(i) - 0x30;

//         if (literal_length < 0 || literal_length > 9 || i + 1 + literal_length > compr.length) {
//             return null;
//         }

//         plain += compr.substring(i + 1, i + 1 + literal_length);
//         i += 1 + literal_length;

//         if (i >= compr.length) {
//             break;
//         }
//         const backref_length = compr.charCodeAt(i) - 0x30;

//         if (backref_length < 0 || backref_length > 9) {
//             return null;
//         } else if (backref_length === 0) {
//             ++i;
//         } else {
//             if (i + 1 >= compr.length) {
//                 return null;
//             }

//             const backref_offset = compr.charCodeAt(i + 1) - 0x30;
//             if ((backref_length > 0 && (backref_offset < 1 || backref_offset > 9)) || backref_offset > plain.length) {
//                 return null;
//             }

//             for (let j = 0; j < backref_length; ++j) {
//                 plain += plain[plain.length - backref_offset];
//             }

//             i += 2;
//         }
//     }

//     return plain;
// }

// console.log(decompressLZ("1a312b1a"))

// console.log(decompressLZ("5aa02ab72"))
// console.log(decompressLZ( "5RKSyq531c640982SJ979pjA1B1CFh04c6M6887ufF6QC86228Z451m72"))
// console.log(comprLZDecode("5RKSyq531c640982SJ979pjA1B1CFh04c6M6887ufF6QC86228Z451m72"))

// console.log(decompressLZ( "2C86228Z451m72"))
// console.log(comprLZDecode("2C86228Z451m72"))

// console.log(decompressLZ( "2C86228Z451m72"))
// console.log(comprLZDecode("2C86228Z451m72"))

// console.log(decompressLZ( "2C862"))
// console.log(comprLZDecode("2C862"))

// console.log(decompressLZ( "2C86228Z451m72"))
// console.log(comprLZDecode("2C86228Z451m72"))


// console.log(decompressLZ( "2C22"))
// console.log(comprLZDecode("2C22"))

// console.log(decompressLZ("5ChbcZ8408522c812kK512IK9467AuYKg619kmjoLp0na"))
// console.log(comprLZDecode("5ChbcZ8408522c812kK512IK9467AuYKg619kmjoLp0na"))
// console.log(comprLZDecode("5aa03bbb"))

// RKSyqSyqSycqSycqSycqSycqSySJycqSySJycpjA1B1CFhc6M61CFhc6M6ufF6QC8C8C8C8C888888undefinedundefined
// RKSyqSyqSycqSycqSycqSycqSySJycqSySJycpjA1B1CFhc6M61CFhc6M6ufF6QC8C8C8C88Z8C88m8m8m8m8