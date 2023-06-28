export function getMinJumps(jumpLens) {
    let minJumps = new Array(jumpLens.length).fill(Infinity)

    if (minJumps.length == 0) {
        return 0
    } else {
        minJumps[0] = 0
    }

    for (let i = 0; i < jumpLens.length; i++) {
        let maxJump = jumpLens[i]
        let toThis = minJumps[i]

        for (let j = 1; j <= maxJump; j++) {
            if (toThis + 1 < minJumps[i + j]) {
                minJumps[i + j] = toThis + 1
            }
        }
    }

    let toLast = minJumps.pop()
    return toLast == Infinity ? 0 : toLast
}


export function canJump(jumpLens) {
    let minJumps = getMinJumps(jumpLens)
    // console.log(minJumps)
    return minJumps == 0 ? 0 : 1
}

// console.log(canJump([5,4,2,2,0,2,5,2,3,5,1,2]))
