export function largestPrime(data){
    let n = parseInt(data)

    let sqrtN = Math.sqrt(n); //Only update square root when necessary
    
    let factor = 2;
    while (factor <= sqrtN){
        if( n % factor === 0){
            n = Math.round(n/factor);
            sqrtN = Math.sqrt(n);
        }
        else
            factor++;
    }
    return n;
}