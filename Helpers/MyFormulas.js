/** @param {NS} ns */
export function getMinSecHackTime(ns, serverName) {
    const server = ns.getServer(serverName)
    const person = ns.getPlayer()

    const minSec = ns.getServerMinSecurityLevel(serverName)
    server.hackDifficulty = minSec

    // this it just the formula
    // if it changes this breaks
    const difficultyMult = server.requiredHackingSkill * server.hackDifficulty;

    const baseDiff = 500;
    const baseSkill = 50;
    const diffFactor = 2.5;
    let skillFactor = diffFactor * difficultyMult + baseDiff;
    // tslint:disable-next-line
    skillFactor /= person.skills.hacking + baseSkill;
    
    // intBonus = calculateIntelligenceBonus(person.skills.intelligence, 1)
    const intBonus = 1 + (1 * Math.pow(person.skills.intelligence, 0.8)) / 600;

    const hackTimeMultiplier = 5;
    const hackingTime =
      (hackTimeMultiplier * skillFactor) /
      (person.mults.hacking_speed * intBonus)
  
    return hackingTime;
}

/** @param {NS} ns */
export function getMinSecGrowTime(ns, serverName) {
  return getMinSecHackTime(ns, serverName) * 4;
}

/** @param {NS} ns */
export function getMinSecWeakenTime(ns, serverName) {
    return getMinSecHackTime(ns, serverName) * 4;
}