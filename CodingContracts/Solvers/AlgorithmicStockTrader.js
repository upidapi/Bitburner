// I => IV

export function traderI(data) {
    // one trade
    return trade(1, data)
}

export function traderII(data) {
    // no max trades
    let maxTrades = Math.floor(data.length / 2)
    return trade(maxTrades, data)
}

export function traderIII(data) {
    // 2 trades
    return trade(2, data)
}

export function traderIV(data) {
    // data[0] trades
    return trade(data[0], data[1])
}

function trade(maxTrades, stockPrices) {
    if (maxTrades == 0) {
        return 0
    }

    let a = new Array(stockPrices.length + 1).fill(0)

    let highestProfit = []
    for (let i = 0; i <= maxTrades; i++) {
        highestProfit.push([...a])
    }

    let i, j, k
    for (i = 1; i <= maxTrades; i++) {
        for (j = 1; j <= stockPrices.length; j++) { // Buy / Start
            for (k = j; k <= stockPrices.length; k++) { // Sell / End

                highestProfit[i][k] = Math.max(
                    highestProfit[i][k], // cant be lower than with the same trades
                    highestProfit[i][k - 1], // cant be lower than with less stockPrices
                    highestProfit[i - 1][k], // cant be lower than with fewer trades
                    highestProfit[i - 1][j - 1] + stockPrices[k - 1] - stockPrices[j - 1]) // another buy + sell                
            }
        }
    }

    let maxProfit = highestProfit[maxTrades][stockPrices.length]
    // cant be lower than 0 since it will never choose those trades
    // Math.max(0, maxProfit)
    return maxProfit
}
