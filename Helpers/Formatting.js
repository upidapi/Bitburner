export function formatNum(num, p_precision = 2) {
    if (num == 0) {
        return "0"
    }

    var exponent = Math.round(Math.log10(num));
    const suf_pos = Math.floor(exponent / 3)

    const suffixes = ["", "k", "m", "b", "t"]

    var exponent = Math.round(Math.log10(num));

    if (-1 > suf_pos || suf_pos > 4) {
        //exponent
        var rounded_number = (num * (Math.pow(10, -exponent))).toFixed(p_precision)
        return rounded_number + " x 10^" + exponent
    } else {
        var suffix = suffixes[suf_pos]


        var log_pow_corrector = Math.ceil(-exponent / 3) * 3
        var pow_corrector = Math.pow(10, log_pow_corrector)

        var precision = p_precision - (exponent % 3)

        var rounded_number = (num * pow_corrector).toFixed(precision)

        var rounded_number = rounded_number.replace(/\.0+$/, '')
        var rounded_number = rounded_number.replace(/\.\.+$/, '')

        return rounded_number + suffix
    }
}


/**
 * un-formats a formatted game number to its raw equivalent
 * @param {string} fNum 
 * 
 * @example
 * deFormatGameNum("12m") => 12000000
 * deFormatGameNum("1.3k") => 1300
 * deFormatGameNum("1.3e10") => 13000000000 (1.3 * 10^10)
 * deFormatGameNum("1.3e-2") => 0.013 (1.3 * 10^-2)
 */
export function deFormatGameNum(fNum) {
    let suffixMap = {
        "k": 1, // kil
        "m": 2, // mil
        "b": 3, // bil
        "t": 4, // tri
        "q": 5, // quad
        "Q": 6, // quin
        "s": 7, // sex
        "S": 8, // sep
        "o": 9, // octo
        "n": 10 // non
    }

    let sNum = ""
    let formatting = ""

    for (let i in fNum) {
        const char = fNum[i]

        if (char == ".") {
            sNum = sNum + char
            continue
        }

        if (!isNaN(parseInt(char))) {
            // char is a number

            sNum = sNum + char

            continue
        }

        formatting = fNum.slice(i)
        break
    }

    let num = parseFloat(sNum)
    // console.log(num, formatting)
    if (formatting == "") {
        return num

    } else if (Object.keys(suffixMap).includes(formatting)) {
        return num * (1000 ** suffixMap[formatting])

    } else if (formatting.startsWith("e")) {
        let mul = 10 ** parseInt(formatting.slice(1))

        return num * mul
    } else {
        throw new TypeError(`invalid number to be formatted, number to be formatted: ${fNum}`)
    }
}