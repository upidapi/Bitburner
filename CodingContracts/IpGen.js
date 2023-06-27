function convert(number, parts = []) {
    if (number.startsWith("0") && number != "0") {
        return []
    }

    if (number.length < 4) {
        if (parseInt(number) > 255) {
            return []
        }
        
        return [[number]]
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
    return convert(number).map(val => val.join("."))
}

// console.log(genIp("1938718066"))