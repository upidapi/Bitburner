/**
 * terminology
 * 
 * batch start := time when batch starts (the file is run) 
 * batch launch := time when WGH thread start (the exec time is set now)
 * WGH start := time when the actual WGH starts (will finish in ns.getWeakenTime())
 * WGH exec := time when the effect of WGH takes affect
 * 
 * batch := a group of WHG that will leave the server optimal after 
 *          execution + hacks the server 
 * shotgun := a group of sequential batches, followed by a low sec hole
 * shotgun shell := a batch in a shotgun
 * 
 * low sec hole := a time with low security, WGH launches here
 */


// margins in ms
/**
 * there has to be a low sec hole in this time
 */
export const execMargin = 100


/** 
 * | := WGH exec
 * * := wait time
 * 
 *         |-| := WGHMargin (= 2)
 * | * * | * * | * * | * * | * * | *
 * 
 * if they all get offset by 1 ms, the worst case seanrio is this => 
 * * | | * * * * | | * * * * | | * * (still doesn't break)
 * */
export const WGHMargin = 2


/**
 * the ns.sleep(x) time is not exact 
 * it sleeps for aproximetly y ms
 * z = Math.max(5, x) 
 * z < y < z + 50
 * 
 * therefore we correct this with aditionalMisc 
 * the max correctable time is sleepMargin
 * 
 * larger margin results in (sligtly) larger ram usage 
 * ( makes the script run time sleepMargin ms longer )
 */
export const sleepMargin = 20


// cant sleep pecise amounts of time, therafour it's limited by the sleep margin
/**
 *             |---| := lowSecHole (= 3)
 * H G W H G W - - - H G W H G W
 * - - _ - - _ _ _ _ - - _ - - _
 *               ^ 
 *            sec hole
 */
export const lowSecHoleTime = sleepMargin


// export const lowSecHoleMid = Math.floor(lowSecHoleTime / 2)
// /**
//  * the point in which the batch lanches
//  * it's the midpoint of lowSecHoleTime rounded down
//  */


/** 
 * the minimum time between batch starts/exec
*/
export const minDeltaBatchExec = WGHMargin * 3


/**
 * this is the max amount of batches that can be started before 
 * it needs a low sec hole for them to launch the WGH
 */
export const maxShotgunShells = Math.floor((execMargin - lowSecHoleTime) / minDeltaBatchExec)

/**
 * the average amount of time it will take for each batch in a full shotgun
 * i.e the average aSec for the weaken in full shotgun
 * this takes the "worst" case scenario when the entire sleepMargin has to be awaited
 */
export const averageBatchASec = sleepMargin + minDeltaBatchExec * (maxShotgunShells - 1) / 2


/**
 * the extra time we give ourself to actually start the batch
 * i.e the max time between then the execTime is calculated and 
 * when the batch starts
 */
export const StartMargin = 8


/**
 * additional reserved ram on home
 */
export const hostRamMargin = 100