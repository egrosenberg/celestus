
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

    let mult = 1 * (base) * (1 + elementBonus) * (1 + abilityBonus) * (1 + flat + actor.system.attributes.bonuses.damage.value);
    return mult.toFixed(2);
}

/**
 * Displays text that fades out on all tokens controlled by actor
 * copies the effect done by statusEffects
 * @param {Actor} actor to display text on
 * @param {String} text to display
 */
export function canvasPopupText(actor, text) {
    const tokens = actor.getActiveTokens(true);
    for (let t of tokens) {
        if (!t.visible || !t.renderable) continue;
        canvas.interface.createScrollingText(t.center, text, {
            anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
            direction: CONST.TEXT_ANCHOR_POINTS.TOP,
            distance: (2 * t.h),
            fontSize: 28,
            stroke: 0x000000,
            strokeThickness: 4,
            jitter: 0.25
        });
    }
}