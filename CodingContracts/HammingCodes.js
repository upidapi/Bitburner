

/**
 * @param {number} number 
 * @returns {string} 
 */
function intToBinary(number) {
    if (number == 0) {
        return ""
    }

    let pow2 = {}

    let binary = ""
    let left = number

    let i = 0
    while (true) {
        const pow = 2 ** i

        pow2[i] = pow

        if (pow > number) {
            binary = "1" + binary.slice(1)
            i--
            left -= pow2[i]
            break
        }

        binary = "0" + binary

        i++
    }

    while (true) {
        if (left == 0) {
            return binary
        }

        if (pow2[i] <= left) {
            // console.log(binary, left, i, pow2[i])

            binary = replace(binary, binary.length - 1 - i, "1")

            left -= pow2[i]
        }

        i--
    }
}


/**
 * @param {string} binary 
 * @returns {number}
 */
function binaryToInt(binary) {
    let tot = 0

    for (let i = 0; i < binary.length; i++) {
        const j = binary.length - 1 - i

        if (binary[i] == "1") {
            tot += 2 ** j
        }
    }

    return tot
}


function replace(a, i, x) {
    // replace the thing at i in a with x

    return a.substring(0, i) + x + a.substring(i + 1);
}


// works
export function toHam(number) {
    let binary = intToBinary(number)

    binary = "-" + binary

    // console.log(binary)

    let i = 0

    while (true) {
        const pos = 2 ** i

        if (pos > binary.length) {
            break
        }

        // inserts a "0" at pos in binary
        binary = [binary.slice(0, pos), "0", binary.slice(pos)].join('')

        i++
    }

    // console.log(binary)

    let xorSum = 0

    for (let i = 0; i < binary.length; i++) {
        if (binary[i] != "1") {
            continue
        }

        // console.log(xorSum, i, intToBinary(xorSum ^ i), intToBinary(i))
        xorSum = xorSum ^ i
    }

    const idk = intToBinary(xorSum)

    // console.log(idk)

    for (let i = 0; i < idk.length; i++) {
        // if (idk[idk.length - 1 - i] != "1") {
        //     continue
        // }

        binary = replace(binary, 2 ** i, idk[idk.length - 1 - i])
    }

    const ones = (binary.match(/1/g) || []).length
    binary = (ones % 2).toString() + binary.slice(1)

    return binary
}


// works
export function hamToInt(binary) {
    let xorSum = 0

    for (let i = 0; i < binary.length; i++) {
        if (binary[i] != "1") {
            continue
        }

        // console.log(xorSum, i, intToBinary(xorSum ^ i), intToBinary(i))
        xorSum = xorSum ^ i
    }

    // the flipped bit is at "xorSum"

    // fix the bit i.e flip it
    const newVal = binary[xorSum] == "1" ? "0" : "1"

    // console.log(binary, xorSum, newVal)
    binary = replace(binary, xorSum, newVal)
    // console.log(binary)

    // remove the ham part

    let i = 0
    while (true) {
        // the - i is to account for the previously removed things
        const rmPos = 2 ** i - i

        if (rmPos >= binary.length) {
            break
        }

        binary = replace(binary, rmPos, "")

        // console.log(binary)

        i++
    }

    binary = binary.slice(1)

    return binaryToInt(binary)
}

// console.log(toHam(8))
// console.log("--h--")
// console.log(hamToInt(toHam(8)))
// console.log(hamToInt("01000000100011101000011111111111"))
