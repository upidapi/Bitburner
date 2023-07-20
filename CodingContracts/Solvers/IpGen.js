function convert(number, parts = []) {
    if (number == "") {
        return []
    }

    if (number == "0") {
        return ["0"]
    }

    if (number.startsWith("0")) {
        for (let part of convert(number.slice(1))) {
            parts.push([number.slice(0, 1), ...part])
        }
        return parts.filter((val) => val.length < 5)
    }

    if (number.length < 4) {
        if (parseInt(number) <= 255) {
            parts.push([number])
        }
    }

    switch (number.length) {
        default:
        case 3:
            if (parseInt(number.slice(0, 3)) <= 255) {
                for (let part of convert(number.slice(3))) {
                    parts.push([number.slice(0, 3), ...part])
                }
            }

        case 2:
            for (let part of convert(number.slice(2))) {
                parts.push([number.slice(0, 2), ...part])
            }

        case 1:
            for (let part of convert(number.slice(1))) {
                parts.push([number.slice(0, 1), ...part])
            }

        case 0:
    }

    parts = parts.filter((val) => val.length < 5)
    return parts
}


export function genIp(number) {
    return convert(number)
        .filter((val) => val.length == 4)
        .map(val => val.join("."))
}

// console.log(genIp("101124248"))
// console.log()
// 101124248
// 10 1

// 101.124.2.48,
// 101.12.42.48,
// 101.12.4.248,
// 101.1.242.48,
// 101.1.24.248,
// 10.112.42.48,
// 10.112.4.248,
// 10.11.242.48,
// 10.11.24.248,
// 10.1.124.248

// 23376093
// 2 3 3 7 6 0 9 3
// 233 76 0 93