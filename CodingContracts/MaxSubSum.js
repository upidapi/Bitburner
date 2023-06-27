export function findMaxSubSum(data) {
    let largest = 0

    for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j <= data.length; j++) {
            let sum = data.slice(i, j).reduce((partialSum, a) => partialSum + a, 0)

            if (sum > largest) {
                largest = sum
            }
        }
    }

    return largest
}