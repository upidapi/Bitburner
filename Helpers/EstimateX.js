/** @param {NS} ns */
export function estimateX(ns, func, y, min, max, left_margin = 0, right_margin = 0) {
    // console.log("------")
    // console.log(min, func(min))
    // console.log(max, func(max))
    // console.log(y)
  
    // finds x such that (y - margin < func(x) <= y)
    // if there is no such x return the closest x
  
    // used for calculating max threads used for specified ram
  
    // the current x := func(x) that is the closest to y
  
    let iteratins = 0
  
    // check if above or below
    if (func(max) < y + left_margin) {
      return max
    }
  
    if (func(min) > y + right_margin) {
      return min
    }
  
    let cur
  
    while (true) {
      cur = (min + max) / 2
  
      let c_y = func(cur)
  
      let diff = y - c_y
      if (left_margin <= diff && diff < right_margin) {
        break
      }
  
      if (c_y > y) {
        // x too big
        max = cur
  
      } else if (cur == max) {
        // x is larger than max
        break
      } else {
        // x too small
        min = cur
      }
  
      iteratins++
  
      if (iteratins > 100) {
        ns.printf("reatched max iterations, returning current value anyways")
        ns.printf("    min: " + min + " func(min): " + func(min))
        ns.printf("    max: " + max + " func(max): " + func(max))
        return cur 
        // throw new Error("could not locate x. min: " + min + " max: " + max + " y: " + y)
      }
    }
  
    return cur
  }