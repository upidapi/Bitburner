function factorial(n) {
    if (n == 0) {
        return 1
    }

    return n * factorial(n - 1)
}


export function getSimpleUniquePaths(data) {
    let rowStep = data[0] - 1
    let colStep = data[1] - 1
    
    // math
    // *meth
    // the round is to avoid float inaccuracies
    return Math.round(factorial(rowStep + colStep) * (1 / factorial(rowStep)) * (1 / factorial(colStep)))
} 

export function getUniquePaths(data) {
    console.log(data)
    const rows = data.length
    
    if (rows == 0) {
        return 0
    }

    const cols = data[0].length

    function getPaths(x, y) {
        if (x == cols - 1 && y == rows - 1) {
            return 1
        }

        let ways = 0

        if (data[y][x + 1] == 0) {
            ways += getPaths(x + 1, y)  
        }

        if (data[y + 1] != null && data[y + 1][x] == 0) {
            ways += getPaths(x, y + 1)  
        }

        return ways
    }

    return getPaths(0, 0)
}

// console.log(getUniquePaths())