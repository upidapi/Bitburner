function getParamNames(func) {
    let STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
    let ARGUMENT_NAMES = /([^\s,]+)/g;

    let fnStr = func.toString().replace(STRIP_COMMENTS, "");

    let result = fnStr
        .slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")"))
        .match(ARGUMENT_NAMES);

    if (result === null) result = [];
    return result;
}

function kwargWrapper(a, b) {
    console.log(a, b);
}

console.log(getParamNames(kwargWrapper))

