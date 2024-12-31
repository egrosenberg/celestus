
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
/**
 * 
 * @param {Actor} actor actor initiating the roll
 * @param {String} ability for actor to roll with
 */
export async function rollAbility(actor, ability) {
    let label, abilityMod;
    if (CONFIG.CELESTUS.civilSkills[ability] !== undefined) {
        label = CONFIG.CELESTUS.civilSkills[ability].label;
        abilityMod = actor.system.civil[ability].value * 5;
    }
    else if (CONFIG.CELESTUS.combatSkills[ability] !== undefined) {
        label = CONFIG.CELESTUS.combatSkills[ability].label;
        abilityMod = actor.system.combat[ability].value;
    }
    else {
        return;
    }
    const path = './systems/celestus/templates/rolls/abilityRollPrompt.hbs';
    const msgData = {
        attributes: CONFIG.CELESTUS.abilities,
        ability: label,
    }
    let msg = await renderTemplate(path, msgData);
    new foundry.applications.api.DialogV2({
        window: { title: `${label} check` },
        content: msg,
        buttons: [{
            action: "normal",
            label: "Normal",
            default: true,
            callback: (event, button, dialog) => ["normal", button.form.elements.attribute.value]
        }, {
            action: "advantage",
            label: "Advantage",
            callback: (event, button, dialog) => ["advantage", button.form.elements.attribute.value]
        }],
        submit: result => {
            const [mode, attribute] = result;
            let skillBonus = actor.system.abilities[attribute]?.value ?? 0;
            if (skillBonus > 0) skillBonus -= CONFIG.CELESTUS.baseAttributeScore;
            if (mode === "normal") {
                let r = new Roll(
                    `1d100 + ${abilityMod} + ${skillBonus}`,
                    {},
                    { flavor: `${label} (${CONFIG.CELESTUS.abilities[attribute]?.label}) check` });
                r.toMessage({
                    speaker: { alias: actor.name },
                })
            }
            else if (mode === "advantage") {
                let r = new Roll(
                    `2d100kh1 + ${abilityMod} + ${skillBonus}`,
                    {},
                    { flavor: `${label} (${CONFIG.CELESTUS.abilities[attribute]?.label}) check` });
                r.toMessage({
                    speaker: { alias: actor.name },
                })
            }
        }
    }).render({ force: true });
}