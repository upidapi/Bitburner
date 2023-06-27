function getAt(data, row, col) {
    let dataRow = data[row]

    if (dataRow == undefined) {
        return dataRow
    }

    return dataRow[col]
}

export function getShortestPath(data) {


    if (data.length == 0) {
        return ""
    }

    if (data[0].length == 0) {
        return ""
    }

    let queue = [[0, 0]]

    const rows = data.length
    const cols = data[0].length

    let toCell = []

    for (let i = 0; i < rows; i++) {
        toCell.push(new Array(cols).fill(Infinity))
    }

    console.log(toCell)

    toCell[0][0] = 0

    while (true) {
        let nextQueue = []

        // pos = row, col
        for (let pos of [...queue]) {
            const toThis = getAt(toCell, ...pos)

            function x(row, col) {
                if (getAt(data, row, col) == 0) {
                    if (toCell[row][col] <= toThis + 1) {
                        return
                    }

                    toCell[row][col] = toThis + 1

                    nextQueue.push([row, col])
                }
            }

            x(pos[0] - 1, pos[1])
            x(pos[0] + 1, pos[1])
            x(pos[0], pos[1] + 1)
            x(pos[0], pos[1] - 1)

        }

        if (toCell[toCell.length - 1][toCell[0].length - 1] != Infinity) {
            break
        }

        if (nextQueue.length == 0) {
            // no possible path
            return ""
        }

        queue = nextQueue
    }

    // start at end
    let pos = [rows - 1, cols - 1]

    let depth = getAt(toCell, ...pos)

    let path = ""

    while (true) {
        if (depth == 0) {
            break
        }

        depth--

        let testPos = [pos[0] - 1, pos[1]]
        if (getAt(toCell, ...testPos) == depth) {
            path = "D" + path
            pos = testPos
            continue
        }

        testPos = [pos[0] + 1, pos[1]]
        if (getAt(toCell, ...testPos) == depth) {
            path = "U" + path
            pos = testPos
            continue
        }

        testPos = [pos[0], pos[1] - 1]
        if (getAt(toCell, ...testPos) == depth) {
            path = "R" + path
            pos = testPos
            continue
        }

        testPos = [pos[0], pos[1] + 1]
        if (getAt(toCell, ...testPos) == depth) {
            path = "L" + path
            pos = testPos
            continue
        }

        throw new Error("no path found?")
    }

    // console.log(path)
    return path
}



// console.log(getShortestPath(
//     [
//         [0, 1, 0, 0, 0, 0],
//         [0, 0, 0, 1, 1, 0]
//     ]
// ))