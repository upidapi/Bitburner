function helper(
    res,
    path,
    num,
    target,
    pos,
    evaluated,
    mul,
) {
    if (pos === num.length) {
        if (target === evaluated) {
            res.push(path);
        }
        return;
    }

    for (let i = pos; i < num.length; ++i) {
        if (i != pos && num[pos] == "0") {
            break;
        }
        const cur = parseInt(num.substring(pos, i + 1));

        if (pos === 0) {
            helper(res, path + cur, num, target, i + 1, cur, cur);
        } else {
            helper(res, path + "+" + cur, num, target, i + 1, evaluated + cur, cur);
            helper(res, path + "-" + cur, num, target, i + 1, evaluated - cur, -cur);
            helper(res, path + "*" + cur, num, target, i + 1, evaluated - mul + mul * cur, mul * cur);
        }
    }
}


export function findValidMath(data) {
    let numbers = data[0]
    let target = data[1]
    
    const result = [];
    helper(result, "", numbers, target, 0, 0, 0);

    return result
}   


// console.log(findValidMath(["5689647", -73]))

