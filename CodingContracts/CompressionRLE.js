export function compressRLE(data) {
    let out = ""

    let rep = 0

    for (let i = 0; i < data.length; i++) {
        let char = data[i]

        rep++

        if (char != data[i + 1] || rep == 9) {
            out = out + rep.toString() + char
            rep = 0
        } 
    }

    return out
}