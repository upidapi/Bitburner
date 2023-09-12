// TODO make WGHMargin (and DeltaBatchExec) get calculated based 
// on how many batches we can run (based on your cpu etc)

// time we have to start a thread
// at least 0.5ms
export const DeltaThreadExec = 0.5

// time we have to start a batch
export const DeltaBatchExec = DeltaThreadExec * 3

/**
 * time between thread execs 
 * 
 * since theres up to 0.1 ms inaccuracy of the 
 * performance.now() := A
 * 
 * and the sleep (.setTimeout) time has a accuracy of 1ms := B
 * 
 *  A    B    A   margin
 * 0.1 + 1 + 0.1 + 0.3 = 1.5
 * 
 * so we need at least 1.5ms
 * 
 * for the sake of sub threads we set it to 5 anyways
 */
export const ThreadStartMargin = 5

export const DeltaShotgunExec = 50

// the reason why it's so high is due to the GB 
export const BatchStartMargin = 50

/**
 * When we use any Promise based way to wait for something 
 * it wont be exact. If we sleep for less than 5ms it will
 * usually take 5ms anyways. But there is also sometimes spikes 
 * so when we want to wait 30ms it can randomly take longer
 * almost always these spikes are about 0 - 20 ms. 
 * 
 * The sleep accuracy is the max size we assume those spikes
 * can be. Ofc they can be larger but it should be increasable 
 * unlikely that that happens. Since it will probably brake
 * the scheduler 
 */
export const SleepAccuracy = 100

// if there isn't enough ram wait this time before trying again
export const RamWaitTime = 100

// // how much time we have to start the threads in the next shotgun
// const ThreadStartMargin = 5


// for when you want something right after something else
export const smallNum = 0.0001

// used for calculating when to use what mode in the scheduler
export const MaxBatchScheduleTime = 5

export const SpeedStart = true

export const MaxWorkers = 400_000

