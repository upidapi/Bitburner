export function bigFormatNum(num, p_precision = 2) {
  if (num == 0) {
    return "0"
  }

  var exponent = Math.round(Math.log10(num));
  const suf_pos = Math.floor(exponent / 3)

  const sufixes = ["", "k", "m", "b", "t"]

  var exponent = Math.round(Math.log10(num));

  if (-1 > suf_pos || suf_pos > 4) {
    //exponent
    var rounded_number = (num * (Math.pow(10, -exponent))).toFixed(p_precision)
    return rounded_number + " x 10^" + exponent
  } else {
    var sufix = sufixes[suf_pos]


    var log_pow_corrector = Math.ceil(-exponent / 3) * 3
    var pow_corrector = Math.pow(10, log_pow_corrector)

    var precision = p_precision - (exponent % 3)

    var rounded_number = (num * pow_corrector).toFixed(precision)

    var rounded_number = rounded_number.replace(/\.0+$/, '')
    var rounded_number = rounded_number.replace(/\.\.+$/, '')

    return rounded_number + sufix
  }
}