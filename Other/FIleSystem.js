/**
 * @param {string} dir 
 * directory to get content of
 * @param {Array<string>} allDirs 
 * all directory on server
 * @returns {Array<string>}
 * the things directly in the dir
 * 
 * @example
 * getDirContends("b/", ["a/1/i", "a/2/i", "b/1/i", "b/1/ii", "b/2/ii", "c/1/i"])
 * => ["1", "2"]
 * 
 * // not 
 * => ["1/i", "2/ii"]
 * 
 * // nor
 * => ["b/1/i", "b/1/ii", "b/2/ii"]
 */

export function getDirContends(dir, allDirs) {
    // if (folderName == "") {
    //     folderName = "/"
    // }

    let folderContent = new Set()

    for (let directory of allDirs) {
        if (!directory.startsWith(dir)) {
            continue
        }

        let dirInFolder = directory.slice(dir.length)
        let thingInFolder = dirInFolder.slice(0, dirInFolder.indexOf("/"))

        folderContent.add(thingInFolder)
    }

    return [...folderContent].sort()
}

function sDiff(a, b) {
    const min_len = Math.min(a.length, b.length)

    for (let i = 0; i < min_len; i++) {
        if (a[i] ==  b[i]) {
            continue
        } 
        
        return [a.slice(i), b.slice(i), a.slice(0, i)]
    } 

    return [a.slice(min_len), b.slice(min_len), a.slice(0, min_len)]
}

/**
 * @param {Array<string>} dirs  
 * @returns {Array<string>}
 * dirs sorted based on the directory's sub file names
 */
export function sortDirs() {
    return dirs.sort((a, b) => {

        let result = sDiff(a, b)
        const a_d = result[0]
        const b_d = result[1]
        
        let a_s = a_d.split("/")
        let b_s = b_d.split("/")

        if (a_s.length == 1 && b_s.length != 1) {
            return 1
        }

        if (a_s.length != 1 && b_s.length == 1) {
            return -1
        }

        for (let i = 0; i < Math.min(a_s.length, b_s.length); i++) {
            if (a_s[i] == b_s[i]) {
                continue
            }

            return a_s[i] > b_s[i] ? 1 : -1
        }
        
        return a_s.length > b_s.length ? -1 : 1
    })
}