/**
 * this is a hybrid shotgun controller
 * it controlls the batch starts
 */

/**
 * terminology
 * 
 * batch start := time when batch starts (the file is run) 
 * batch launch := time when WGH thread start (the exec time is set now)
 * WGH start := time when the acctual WGH starts (will finish in ns.getWGHTime())
 * WGH exec := time when the effect of WGH takes affect
 * 
 * batch := a group of WHG that will leave the server optimal after 
 *          execution + hacks the server 
 * shotgun := a group of sequential batches
 * shotgun shell := a batch in a shotgun
 * 
 * low sec hole := a time with low security, WGH launches here
 */


// margins in ms
const execMargin = 100
/**
 * there has to be a low sec hole in this time
 */

const WGHMargin = 2
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

const lowSecHole = 3
/**
 *             |---| := lowSecHole (= 3)
 * H G W H G W - - - H G W H G W
 * - - _ - - _ _ _ _ - - _ - - _
 *               ^ 
 *            sec hole
 */

const sleepCorrectionMargin = 50
/**
 * the ns.sleep(x) time is not exact 
 * it sleeps for aproximetly y ms
 * z = Math.max(5, x) 
 * z < y < z + 50
 * 
 * therefore we correct this with aditionalMisc 
 * the max correctable time is sleepCorrectionMargin
 * 
 * larger margin results in larger ram usage 
 * ( makes the script run time sleepCorrectionMargin ms longer )
 */

const highSecBatchTime = WGHMargin * 3
/** 
 * the minimum time between batch starts
*/

const maxShotgunShels = Math.floor((execMargin - lowSecHole) / highSecBatchTime)
/**
 * this is the max amount of batches taht can be started before 
 * it needs a low sec hole for them to launch the WGH
 */



// idk
export async function idk(ns, target) {
    while (true) {
        // calculate avalibleShels
        const avalibleShels = 100
        const shotgunShels = Math.min(avalibleShels, maxShotgunShels)

        for (let i = 0; i < shotgunShels; i++) {

        }

    }
}
