
/**
 * Calculates the multiplier for a specified damage roll
 * 
 * @param {Actor} actor: actor who will be dealing the damage
 * @param {String} type: elemental type of damage
 * @param {String} ability: ability to scale damage with ("none" if no scalar)
 * @param {Number} base: damage multiplier from damage source percent
 * @param {String} flat: flat damage bonus as percent
 * @returns {Number} multiplier to apply to damage roll
 */
export function calcMult(actor, type, ability, base, flat = 0) {
    // elemental damage bonus percentage
    let elementBonus = 0;
    if (type !== "none") {
        elementBonus = actor.system.elementBonus[type];
    }
    // bonus from ability associated with skill
    let abilityBonus = 0;
    // if there is no ability to scale with, use base level scaling mult
    if (ability === "none") {
        abilityBonus = (actor.system.attributes.level - 1) * CONFIG.CELESTUS.flatDamageScalar;
    }
    else if (ability !== "0") {
        abilityBonus = actor.system.abilities[ability].mod;
    }

    let mult = 1 * (base) * (1 + elementBonus) * (1 + abilityBonus) * (1 + flat);
    return mult.toFixed(2);
}