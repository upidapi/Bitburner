const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

export function ceasarCipher(data) {
    let text = data[0]
    let leftShift = data[1]

    let out = ""
    for (let char of text) {
        if (char == " ") {
            out = out + " "
            continue
        }

        let encryptedCharIndex = alphabet.indexOf(char) + alphabet.length - leftShift
        let encryptedChar = alphabet[encryptedCharIndex % alphabet.length]

        out = out + encryptedChar
    }

    return out 
}

// console.log(ceasarCipher(["TRASH LOGIN EMAIL QUEUE MACRO", 24]))

export function vCipher(data) {
    let text = data[0]
    let keyWord = data[1]

    let out = ""
    for (let i in text) {
        let textChar = text[i]
        let keyChar = keyWord[i % keyWord.length]

        let encryptedCharIndex = alphabet.indexOf(textChar) + alphabet.indexOf(keyChar)
        let encryptedChar = alphabet[encryptedCharIndex % alphabet.length]

        out = out + encryptedChar
    }

    return out
}

// console.log(vCipher(["TABLEVIRUSPASTEARRAYFRAME", "PODCAST"]))
