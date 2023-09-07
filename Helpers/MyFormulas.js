/** @param {NS} ns */
export function getMinSecHackTime(ns, serverName, serverSec = null) {
    const server = ns.getServer(serverName)
    const person = ns.getPlayer()

    serverSec = serverSec ?? ns.getServerMinSecurityLevel(serverName)
    server.hackDifficulty = serverSec

    // this it just the formula
    // if it changes this breaks
    const difficultyMul = server.requiredHackingSkill * server.hackDifficulty;

    const baseDiff = 500;
    const baseSkill = 50;
    const diffFactor = 2.5;
    let skillFactor = diffFactor * difficultyMul + baseDiff;
    // tslint:disable-next-line
    skillFactor /= person.skills.hacking + baseSkill;

    // intBonus = calculateIntelligenceBonus(person.skills.intelligence, 1)
    const intBonus = 1 + (1 * Math.pow(person.skills.intelligence, 0.8)) / 600;

    const hackTimeMultiplier = 5;
    const hackingTime =
        (hackTimeMultiplier * skillFactor) /
        (person.mults.hacking_speed * intBonus)

    // apparently the returned value is in seconds :)
    return hackingTime * 1000;
}

/** @param {NS} ns */
export function getMinSecGrowTime(ns, serverName, serverSec = null) {
    return getMinSecHackTime(ns, serverName, serverSec) * 3.2;
}

/** @param {NS} ns */
export function getMinSecWeakenTime(ns, serverName, serverSec = null) {
    return getMinSecHackTime(ns, serverName, serverSec) * 4;
}

/**
 * @param {NS} ns 
 * @param {String} target 
 */
export function calcMinHackChance(ns, target, serverSec = null) {
    serverSec = serverSec ?? ns.getServerMinSecurityLevel(target)

    if (ns.fileExists("Formulas.exe")) {
        const server = ns.getServer(target)
        server.hackDifficulty = serverSec
        return ns.formulas.hacking.hackChance(server, ns.getPlayer())
    }

    const difficultyMul = 1 - (serverSec / 100)

    const hackFactor = 1.75;
    const person = ns.getPlayer()
    const serverMinLvl = ns.getServer().requiredHackingSkill
    const skillMul = 1 - serverMinLvl / (hackFactor * person.skills.hacking)

    const chance =
        difficultyMul *
        skillMul *
        person.mults.hacking_chance

    if (chance > 1) {
        return 1
    }
    if (chance < 0) {
        return 0
    }

    return chance
}


// can change
const CONSTANTS = {
    ServerBaseGrowthRate: 1.03,
    ServerMaxGrowthRate: 1.0035,
}

export function getBitNodeMultipliers(n, lvl) {
    switch (n) {
        case 1: {
            return new BitNodeMultipliers();
        }
        case 2: {
            return new BitNodeMultipliers({
                HackingLevelMultiplier: 0.8,

                ServerGrowthRate: 0.8,
                ServerMaxMoney: 0.08,
                ServerStartingMoney: 0.4,

                PurchasedServerSoftcap: 1.3,

                CrimeMoney: 3,

                FactionPassiveRepGain: 0,
                FactionWorkRepGain: 0.5,

                CorporationSoftcap: 0.9,
                CorporationDivisions: 0.9,

                InfiltrationMoney: 3,
                StaneksGiftPowerMultiplier: 2,
                StaneksGiftExtraSize: -6,
                WorldDaemonDifficulty: 5,
            });
        }
        case 3: {
            return new BitNodeMultipliers({
                HackingLevelMultiplier: 0.8,

                ServerGrowthRate: 0.2,
                ServerMaxMoney: 0.04,
                ServerStartingMoney: 0.2,

                HomeComputerRamCost: 1.5,

                PurchasedServerCost: 2,
                PurchasedServerSoftcap: 1.3,

                CompanyWorkMoney: 0.25,
                CrimeMoney: 0.25,
                HacknetNodeMoney: 0.25,
                ScriptHackMoney: 0.2,

                RepToDonateToFaction: 0.5,

                AugmentationMoneyCost: 3,
                AugmentationRepCost: 3,

                GangSoftcap: 0.9,
                GangUniqueAugs: 0.5,

                StaneksGiftPowerMultiplier: 0.75,
                StaneksGiftExtraSize: -2,

                WorldDaemonDifficulty: 2,
            });
        }
        case 4: {
            return new BitNodeMultipliers({
                ServerMaxMoney: 0.1125,
                ServerStartingMoney: 0.75,

                PurchasedServerSoftcap: 1.2,

                CompanyWorkMoney: 0.1,
                CrimeMoney: 0.2,
                HacknetNodeMoney: 0.05,
                ScriptHackMoney: 0.2,

                ClassGymExpGain: 0.5,
                CompanyWorkExpGain: 0.5,
                CrimeExpGain: 0.5,
                FactionWorkExpGain: 0.5,
                HackExpGain: 0.4,

                FactionWorkRepGain: 0.75,

                GangUniqueAugs: 0.5,

                StaneksGiftPowerMultiplier: 1.5,
                StaneksGiftExtraSize: 0,

                WorldDaemonDifficulty: 3,
            });
        }
        case 5: {
            return new BitNodeMultipliers({
                ServerStartingSecurity: 2,
                ServerStartingMoney: 0.5,

                PurchasedServerSoftcap: 1.2,

                CrimeMoney: 0.5,
                HacknetNodeMoney: 0.2,
                ScriptHackMoney: 0.15,

                HackExpGain: 0.5,

                AugmentationMoneyCost: 2,

                InfiltrationMoney: 1.5,
                InfiltrationRep: 1.5,

                CorporationValuation: 0.75,
                CorporationDivisions: 0.75,

                GangUniqueAugs: 0.5,

                StaneksGiftPowerMultiplier: 1.3,
                StaneksGiftExtraSize: 0,

                WorldDaemonDifficulty: 1.5,
            });
        }
        case 6: {
            return new BitNodeMultipliers({
                HackingLevelMultiplier: 0.35,

                ServerMaxMoney: 0.2,
                ServerStartingMoney: 0.5,
                ServerStartingSecurity: 1.5,

                PurchasedServerSoftcap: 2,

                CompanyWorkMoney: 0.5,
                CrimeMoney: 0.75,
                HacknetNodeMoney: 0.2,
                ScriptHackMoney: 0.75,

                HackExpGain: 0.25,

                InfiltrationMoney: 0.75,

                CorporationValuation: 0.2,
                CorporationSoftcap: 0.9,
                CorporationDivisions: 0.8,

                GangSoftcap: 0.7,
                GangUniqueAugs: 0.2,

                DaedalusAugsRequirement: 35,

                StaneksGiftPowerMultiplier: 0.5,
                StaneksGiftExtraSize: 2,

                WorldDaemonDifficulty: 2,
            });
        }
        case 7: {
            return new BitNodeMultipliers({
                HackingLevelMultiplier: 0.35,

                ServerMaxMoney: 0.2,
                ServerStartingMoney: 0.5,
                ServerStartingSecurity: 1.5,

                PurchasedServerSoftcap: 2,

                CompanyWorkMoney: 0.5,
                CrimeMoney: 0.75,
                HacknetNodeMoney: 0.2,
                ScriptHackMoney: 0.5,

                HackExpGain: 0.25,

                AugmentationMoneyCost: 3,

                InfiltrationMoney: 0.75,

                FourSigmaMarketDataCost: 2,
                FourSigmaMarketDataApiCost: 2,

                CorporationValuation: 0.2,
                CorporationSoftcap: 0.9,
                CorporationDivisions: 0.8,

                BladeburnerRank: 0.6,
                BladeburnerSkillCost: 2,

                GangSoftcap: 0.7,
                GangUniqueAugs: 0.2,

                DaedalusAugsRequirement: 35,

                StaneksGiftPowerMultiplier: 0.9,
                StaneksGiftExtraSize: -1,

                WorldDaemonDifficulty: 2,
            });
        }
        case 8: {
            return new BitNodeMultipliers({
                PurchasedServerSoftcap: 4,

                CompanyWorkMoney: 0,
                CrimeMoney: 0,
                HacknetNodeMoney: 0,
                ManualHackMoney: 0,
                ScriptHackMoney: 0.3,
                ScriptHackMoneyGain: 0,
                CodingContractMoney: 0,

                RepToDonateToFaction: 0,

                InfiltrationMoney: 0,

                CorporationValuation: 0,
                CorporationSoftcap: 0,
                CorporationDivisions: 0,

                BladeburnerRank: 0,

                GangSoftcap: 0,
                GangUniqueAugs: 0,

                StaneksGiftExtraSize: -99,
            });
        }
        case 9: {
            return new BitNodeMultipliers({
                HackingLevelMultiplier: 0.5,
                StrengthLevelMultiplier: 0.45,
                DefenseLevelMultiplier: 0.45,
                DexterityLevelMultiplier: 0.45,
                AgilityLevelMultiplier: 0.45,
                CharismaLevelMultiplier: 0.45,

                ServerMaxMoney: 0.01,
                ServerStartingMoney: 0.1,
                ServerStartingSecurity: 2.5,

                HomeComputerRamCost: 5,

                PurchasedServerLimit: 0,

                CrimeMoney: 0.5,
                ScriptHackMoney: 0.1,

                HackExpGain: 0.05,

                FourSigmaMarketDataCost: 5,
                FourSigmaMarketDataApiCost: 4,

                CorporationValuation: 0.5,
                CorporationSoftcap: 0.75,
                CorporationDivisions: 0.8,

                BladeburnerRank: 0.9,
                BladeburnerSkillCost: 1.2,

                GangSoftcap: 0.8,
                GangUniqueAugs: 0.25,

                StaneksGiftPowerMultiplier: 0.5,
                StaneksGiftExtraSize: 2,

                WorldDaemonDifficulty: 2,
            });
        }
        case 10: {
            return new BitNodeMultipliers({
                HackingLevelMultiplier: 0.35,
                StrengthLevelMultiplier: 0.4,
                DefenseLevelMultiplier: 0.4,
                DexterityLevelMultiplier: 0.4,
                AgilityLevelMultiplier: 0.4,
                CharismaLevelMultiplier: 0.4,

                HomeComputerRamCost: 1.5,

                PurchasedServerCost: 5,
                PurchasedServerSoftcap: 1.1,
                PurchasedServerLimit: 0.6,
                PurchasedServerMaxRam: 0.5,

                CompanyWorkMoney: 0.5,
                CrimeMoney: 0.5,
                HacknetNodeMoney: 0.5,
                ManualHackMoney: 0.5,
                ScriptHackMoney: 0.5,
                CodingContractMoney: 0.5,

                AugmentationMoneyCost: 5,
                AugmentationRepCost: 2,

                InfiltrationMoney: 0.5,

                CorporationValuation: 0.5,
                CorporationSoftcap: 0.9,
                CorporationDivisions: 0.9,

                BladeburnerRank: 0.8,

                GangSoftcap: 0.9,
                GangUniqueAugs: 0.25,

                StaneksGiftPowerMultiplier: 0.75,
                StaneksGiftExtraSize: -3,

                WorldDaemonDifficulty: 2,
            });
        }
        case 11: {
            return new BitNodeMultipliers({
                HackingLevelMultiplier: 0.6,

                ServerGrowthRate: 0.2,
                ServerMaxMoney: 0.01,
                ServerStartingMoney: 0.1,
                ServerWeakenRate: 2,

                PurchasedServerSoftcap: 2,

                CompanyWorkMoney: 0.5,
                CrimeMoney: 3,
                HacknetNodeMoney: 0.1,
                CodingContractMoney: 0.25,

                HackExpGain: 0.5,

                AugmentationMoneyCost: 2,

                InfiltrationMoney: 2.5,
                InfiltrationRep: 2.5,

                FourSigmaMarketDataCost: 4,
                FourSigmaMarketDataApiCost: 4,

                CorporationValuation: 0.1,
                CorporationSoftcap: 0.9,
                CorporationDivisions: 0.9,

                GangUniqueAugs: 0.75,

                WorldDaemonDifficulty: 1.5,
            });
        }
        case 12: {
            const inc = Math.pow(1.02, lvl);
            const dec = 1 / inc;

            return new BitNodeMultipliers({
                DaedalusAugsRequirement: Math.floor(Math.min(defaultMultipliers.DaedalusAugsRequirement + inc, 40)),

                HackingLevelMultiplier: dec,
                StrengthLevelMultiplier: dec,
                DefenseLevelMultiplier: dec,
                DexterityLevelMultiplier: dec,
                AgilityLevelMultiplier: dec,
                CharismaLevelMultiplier: dec,

                ServerGrowthRate: dec,
                ServerMaxMoney: dec * dec,
                ServerStartingMoney: dec,
                ServerWeakenRate: dec,

                //Does not scale, otherwise security might start at 300+
                ServerStartingSecurity: 1.5,

                HomeComputerRamCost: inc,

                PurchasedServerCost: inc,
                PurchasedServerSoftcap: inc,
                PurchasedServerLimit: dec,
                PurchasedServerMaxRam: dec,

                CompanyWorkMoney: dec,
                CrimeMoney: dec,
                HacknetNodeMoney: dec,
                ManualHackMoney: dec,
                ScriptHackMoney: dec,
                CodingContractMoney: dec,

                ClassGymExpGain: dec,
                CompanyWorkExpGain: dec,
                CrimeExpGain: dec,
                FactionWorkExpGain: dec,
                HackExpGain: dec,

                FactionPassiveRepGain: dec,
                FactionWorkRepGain: dec,
                RepToDonateToFaction: inc,

                AugmentationMoneyCost: inc,
                AugmentationRepCost: inc,

                InfiltrationMoney: dec,
                InfiltrationRep: dec,

                FourSigmaMarketDataCost: inc,
                FourSigmaMarketDataApiCost: inc,

                CorporationValuation: dec,
                CorporationSoftcap: 0.8,
                CorporationDivisions: 0.5,

                BladeburnerRank: dec,
                BladeburnerSkillCost: inc,

                GangSoftcap: 0.8,
                GangUniqueAugs: dec,

                StaneksGiftPowerMultiplier: inc,
                StaneksGiftExtraSize: inc,

                WorldDaemonDifficulty: inc,
            });
        }
        case 13: {
            return new BitNodeMultipliers({
                HackingLevelMultiplier: 0.25,
                StrengthLevelMultiplier: 0.7,
                DefenseLevelMultiplier: 0.7,
                DexterityLevelMultiplier: 0.7,
                AgilityLevelMultiplier: 0.7,

                PurchasedServerSoftcap: 1.6,

                ServerMaxMoney: 0.3375,
                ServerStartingMoney: 0.75,
                ServerStartingSecurity: 3,

                CompanyWorkMoney: 0.4,
                CrimeMoney: 0.4,
                HacknetNodeMoney: 0.4,
                ScriptHackMoney: 0.2,
                CodingContractMoney: 0.4,

                ClassGymExpGain: 0.5,
                CompanyWorkExpGain: 0.5,
                CrimeExpGain: 0.5,
                FactionWorkExpGain: 0.5,
                HackExpGain: 0.1,

                FactionWorkRepGain: 0.6,

                FourSigmaMarketDataCost: 10,
                FourSigmaMarketDataApiCost: 10,

                CorporationValuation: 0.001,
                CorporationSoftcap: 0.4,
                CorporationDivisions: 0.4,

                BladeburnerRank: 0.45,
                BladeburnerSkillCost: 2,

                GangSoftcap: 0.3,
                GangUniqueAugs: 0.1,

                StaneksGiftPowerMultiplier: 2,
                StaneksGiftExtraSize: 1,

                WorldDaemonDifficulty: 3,
            });
        }
        default: {
            throw new Error("Invalid BitNodeN");
        }
    }
}

export function getCurBitNodeMultipliers(ns, player = null) {
    player = player ?? ns.getPlayer()
    return getBitNodeMultipliers(player.bitNodeN, player.sourceFileLvl(player.bitNodeN) + 1)
}


/**
 * Returns the number of "growth cycles" needed to grow the specified server by the
 * specified amount.
 * @param {NS} ns
 * @param server - Server being grown
 * @param growth - How much the server is being grown by, in DECIMAL form (e.g. 1.5 rather than 50)
 * @param player - Reference to Player object
 * @param cores 
 * @returns Number of "growth cycles" needed
 */
export function numCycleForGrowth(ns, server, growth, player = null, cores = 1) {
    player = player ?? ns.getPlayer()

    if (ns.fileExists("Formulas.exe")) {
        const idk = growth * server.moneyAvailable
        return ns.formulas.hacking.growThreads(server, player, idk, cores)
    }

    let ajdGrowthRate = 1 + (CONSTANTS.ServerBaseGrowthRate - 1) / server.hackDifficulty;
    if (ajdGrowthRate > CONSTANTS.ServerMaxGrowthRate) {
        ajdGrowthRate = CONSTANTS.ServerMaxGrowthRate;
    }
    const serverGrowthPercentage = server.serverGrowth / 100;

    const coreBonus = 1 + (cores - 1) / 16;
    const cycles =
        Math.log(growth) /
        (Math.log(ajdGrowthRate) *
            player.mults.hacking_grow *
            serverGrowthPercentage *
            getCurBitNodeMultipliers(ns).ServerGrowthRate *
            coreBonus);

    return cycles;
}


