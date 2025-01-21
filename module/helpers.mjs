
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
    const mode = await promise;
    return mode === "crit";
}

/**
 * 
 * @param {Actor} actor 
 * @param {Object[]} damage array of damage elements for base damage
 * @param {Object[][]} bonusDamage Array of bonus damage element arrays
 * @param {Object[][]} statuses array of statusApplyRolls from weapons
 * @param {Boolean} isCrit
 * @param {Number} scalar Overall weapon damage scalar
 * @param {String} typeOverride damage type id of damage type override (empty string or otherwise falsy for none)
 */
export async function rollWeaponDamage(actor, damage, bonusDamage, statuses, isCrit, scalar, typeOverride) {
    const type = damage[0].type;

    // roll to apply statuses
    if (statuses && statuses.length > 0) {
        let statusList = statuses.length > 1 ? statuses[0].concat(statuses[1]) : statuses[0];
        let statusRolls = [];

        if (statusList.length > 0) {
            for (const status of statusList) {
                const roll = new Roll("1d100");
                await roll.evaluate();
                const statusEffect = CONFIG.statusEffects.find(s => s.id === status.id);
                statusRolls.push({
                    name: statusEffect.name,
                    icon: statusEffect.img,
                    roll: roll.total,
                    success: roll.total > 100 - status.chance,
                    id: status.id
                })
            }

            const path = './systems/celestus/templates/rolls/weapon-roll-statuses.hbs';
            const msgData = {
                statuses: statusRolls,
                actorId: actor.uuid,
            }
            let msg = await renderTemplate(path, msgData);
            // do text enrichment
            msg = await TextEditor.enrichHTML(
                msg,
                {
                    async: true,
                }
            );
            await ChatMessage.create({
                speaker: { alias: `${actor.name} - Weapon Statuses` },
                content: msg,
                'system.type': "weaponStatuses",
                'system.actorID': actor.uuid,
            });
        }
    }

    // create a roll formula
    let formula = ""// = `floor((${isCrit ? damage.crit : damage.roll})*${scalar})`
    if (damage && damage.length > 0) {
        if (damage.length === 1) {
            formula += `floor((${isCrit ? damage[0].crit : damage[0].roll})*${scalar})[${typeOverride || damage[0].type}]`;
            // roll any bonus damage types
            if (bonusDamage[0]) {
                for (const element of bonusDamage[0]) {
                    const elementType = typeOverride || element.type;
                    formula += ` + floor((${isCrit ? element.crit : element.roll})*${scalar})[${elementType}]`;
                }
            }
        }
        else {
            const dType1 = typeOverride || damage[0].type
            formula += `floor((${isCrit ? damage[0].crit : damage[0].roll})*${scalar})[${dType1}]`;
            // roll any bonus damage types
            if (bonusDamage[0]) {
                for (const element of bonusDamage[0]) {
                    const elementType = typeOverride || element.type;
                    formula += ` + floor((${isCrit ? element.crit : element.roll})*${scalar})[${elementType}]`;
                }
            }
            const dType2 = typeOverride || damage[1].type
            formula += ` + floor((${isCrit ? damage[1].crit : damage[1].roll})*${scalar * CONFIG.CELESTUS.dualwieldMult})[${dType2}]`;
            // roll any bonus damage types
            if (bonusDamage[1]) {
                for (const element of bonusDamage[1]) {
                    const elementType = typeOverride || element.type;
                    formula += ` + floor((${isCrit ? element.crit : element.roll})*${scalar})[${elementType}]`;
                }
            }
        }
    }
    // create final roll
    const r = new Roll(formula);
    await r.toMessage({
        speaker: { alias: `${actor.name} - Weapon Damage` },
        'system.isDamage': true,
        'system.damageType': type,
        'system.actorID': actor.uuid,
    });
}

/**
 * extracts damage types and subtotals from a message object
 * @param {Message} msg 
 * @returns {Object}
 */
export function itemizeDamage(msg) {
    let total = 0;
    let damage = [];
    // iterate through rolls
    for (const roll of msg.rolls) {
        // iterate through components of roll
        for (const term of roll.terms) {
            if (isNaN(term.total)) continue;
            damage.push({
                amount: term.total,
                type: term.options?.flavor || "none"
            });
            total += term.total;
        }
    }
    return { total: total, terms: damage };
}

export async function applyWeaponStatus(ev) {
    const target = _token.actor;
    if (!target) return;

    // get info from press
    const t = ev.currentTarget;
    const statusId = $(t).data("statusId");
    const actorId = $(t).data("actorId");

    // apply status effect
    const statusEffect = await ActiveEffect.fromStatusEffect(statusId);
    statusEffect.updateSource({ "origin": actorId })
    await target.createEmbeddedDocuments(
        "ActiveEffect",
        [statusEffect]
    );
}

export async function executeSkillScript(origin, skill) {
    const selected = canvas.tokens.controlled;
    if (skill.system.targets.type === "creature" && selected.length !== skill.system.targets.count) {
        return ui.notifications.warn(`CELESTUS | Error: please select ${skill.system.targets.count} targets`);
    }
    if (skill.system.targets.type !== "self" && selected.length < 1) {
        return ui.notifications.warn("CELESTUS | Error: please select targets to affect.")
    }
    // prompt for confirmation
    const proceed = await foundry.applications.api.DialogV2.confirm({
        content: "Are you sure you want to execute? This action cannot be undone.",
        rejectClose: false,
        modal: true
    });
    if (!proceed) {
        return;
    }
    // attempt to find script and execute it
    if (!CONFIG.CELESTUS.scripts[skill.system.scriptId]) {
        return ui.notifications.warn(`CELESTUS | Error: could not find script with id "${skill.system.scriptId}"`)
    }
    CONFIG.CELESTUS.scripts[skill.system.scriptId](origin, selected);
}

/**
 * Checks if both a and b match or if a isn't present
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function matchIfPresent(a, b) {
    return typeof a === "undefined" || a === b;
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
