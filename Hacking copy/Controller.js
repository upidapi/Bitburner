/**
 * every 3m ms lanch new batch 
 */

// margins in ms
const execMargin = 100
const WGHMargin = 2
/** 
 * | := WGH start
 * * := wait time
 * 
 * | * * | * * | * * | * * | * * | *
 * if they all get offset by 1 the wors case seanrio is this => (still doent break)
 * * | | * * * * | | * * * * | | * *
 * 
 * 
 * */ 


const sleepCorrectionMargin = 50
const lowSecHole = 3


export async function idk(ns, target) {
    while (true) {

    }
}
