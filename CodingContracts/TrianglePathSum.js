function getNext(row, col) {
    return [[row + 1, col], [row + 1, col + 1]]
}


function getVal(data, pos) {
    // console.log(data, pos)
    return data[pos[0]][pos[1]]
}


export function trianglePathSum(data) {
    if (data.length == 0) {
        return 0
    }

    const start = data[0][0]

    if (data.length == 1) {
        return start
    }

    // [row, column]
    let found = [[0, 0]]
    let path = [[[0, 0], start]]


    while (true) {
        let minValPath = [[0, 0], Infinity]
        // console.log(found, "---", path)

        for (let item of path) {
            const connections = getNext(...item[0])

            // console.log("aaa", connections)

            for (let connection of connections) {

                if (found.filter((arr)=> arr[0] === connection[0] && arr[1] === connection[1]).length) {
                    continue
                }

                const newVal = getVal(data, connection) + item[1]

                if (newVal < minValPath[1]) {
                    minValPath = [connection, newVal]
                }
            }
        }

        if (minValPath[0][0] == data.length - 1) {
            return minValPath[1]
        }

        found.push(minValPath[0])
        path.push(minValPath)
    }
}
