
/**
 * Calculates the multiplier for a specified damage roll
 * 
 * @param {Actor} actor: actor who will be dealing the damage
 * @param {String} type: elemental type of damage
 * @param {String} ability: ability to scale damage with ("none" if no scalar)
 * @param {Number} base: damage multiplier from damage source percent
 * @param {String} flat: flat damage bonus as percent
 * @param {Boolean} crit: is damage roll for a critical hit
 * @returns {Number} multiplier to apply to damage roll
 */
export function calcMult(actor, type, ability, base, crit, flat = 0) {
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
    const critBonus = crit ? actor.system.attributes.bonuses.crit_bonus.value : 1;

    let mult = 1 * (base) * (1 + elementBonus) * (1 + abilityBonus) * (1 + flat + actor.system.attributes.bonuses.damage.value) * critBonus;
    return mult.toFixed(2);
}

/**
 * Displays text that fades out on all tokens controlled by actor
 * copies the effect done by statusEffects
 * @param {Actor} actor to display text on
 * @param {String} text to display
 */
export function canvasPopupText(actor, text, color = "#ffffff") {
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
            jitter: 0.25,
            fill: color
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

/**
 * Prompts user and asks if damage roll is a crit
 * @returns {Boolean} true if crit, false if not
 */
export async function promptCrit() {
    const promise = new Promise(async (resolve) => {
        await new foundry.applications.api.DialogV2({
            window: { title: "Roll Damage:" },
            content: "",
            buttons: [{
                action: "normal",
                label: "Normal",
                default: true,
                callback: (event, button, dialog) => ["normal"]
            }, {
                action: "crit",
                label: "Critical",
                callback: (event, button, dialog) => ["crit"]
            }],
            submit: result => {
                const [mode] = result;
                resolve(mode);
            }
        }).render({ force: true });
    })
    const mode =  await promise;
    return mode === "crit";
}






/**
 * Access nested object variable from string
 * by Ray Bellis 
 * https://stackoverflow.com/a/6491621/23494595
 * @param {Object} o 
 * @param {String} s 
 * @returns 
 */
export function byString(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in o) {
            o = o[k];
        } else {
            return;
        }
    }
    return o;
}

/**
 * Calculate function by Felix Bohm
 * https://code.tutsplus.com/what-they-didnt-tell-you-about-es5s-array-extras--net-28263t
 * @param {String} calculation
 * @returns {Number}
 */
export function calculate(calculation) {

    //build an array containing the individual parts

    var parts = calculation.match(

        // digits |operators|whitespace

        /(?:\-?[\d\.]+)|[-\+\*\/]|\s+/g

    );

    //test if everything was matched

    if (calculation !== parts.join("")) {

        throw new Error("couldn't parse calculation")

    }

    //remove all whitespace

    parts = parts.map(Function.prototype.call, String.prototype.trim);

    parts = parts.filter(Boolean);

    //build a separate array containing parsed numbers

    var nums = parts.map(parseFloat);

    //build another array with all operations reduced to additions

    var processed = [];

    for (var i = 0; i < parts.length; i++) {

        if (nums[i] === nums[i]) { //nums[i] isn't NaN

            processed.push(nums[i]);

        } else {

            switch (parts[i]) {

                case "+":

                    continue; //ignore

                case "-":

                    processed.push(nums[++i] * -1);

                    break;

                case "*":

                    processed.push(processed.pop() * nums[++i]);

                    break;

                case "/":

                    processed.push(processed.pop() / nums[++i]);

                    break;

                default:

                    throw new Error("unknown operation: " + parts[i]);

            }

        }

    }

    //add all numbers and return the result

    return processed.reduce(function (result, elem) {

        return result + elem;

    });

}
