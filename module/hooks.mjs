import { calcMult } from "./helpers.mjs";

const RED = '#e29292';
const GREEN = '#92e298';
const BLUE = '#92c6e2';

/**
 * 
 * @param {event} e : event from button click, should contain info about actor/item uuid
 */
export async function rollAttack(e) {
    // reconstruct drop data
    const dropData = {
        type: 'Item',
        uuid: e.currentTarget.dataset.itemUuid
    }

    const item = await Item.fromDropData(dropData);
    const actor = item.actor;
    if (!actor) {
        return ui.notifications.warn("ERROR: No actor found belonging to item.")
    }

    // check for targets
    const targets = game.user.targets;
    // verify targets amount
    if (targets.size > item.system.targets.max || targets.size < item.system.targets.min) {
        return ui.notifications.warn(`ERROR: Please select a valid amount of targets for ability (${item.system.targets.min}-${item.system.targets.max})`);
    }

    // threshold needed to exceed to count as a crit
    const critThresh = 100 - (actor.system.attributes.bonuses.crit_chance.value * 100);
    // part of determining wether an attack hits
    const accuracy = actor.system.attributes.bonuses.accuracy.value;

    // roll an attack for each target
    for (const target of targets) {
        const tActor = target.actor;
        const evasion = tActor.system.attributes.bonuses.evasion.value;

        // threshold needed to roll to count as a hit
        const hitThresh = 100 * (evasion + (1 - accuracy));

        let r = new Roll("1d100", {}, { flavor: `${actor.name} attacking ${tActor.name}` });
        r.toMessage({
            speaker: { alias: actor.name },
            flags: {
                "celestus": {
                    hitThreshold: hitThresh,
                    critThreshold: critThresh,
                }
            },
            'system.isAttack': true,
        });
    }
}

/**
 * 
 * @param {event} e : event from button click, should contain info about actor/item uuid
 */
export async function rollDamage(e) {
    // extract actor and item from event
    const actorID = e.currentTarget.dataset.actorUuid;
    const actor = await fromUuid(actorID);
    const itemID = e.currentTarget.dataset.itemUuid;
    const item = await fromUuid(itemID);

    if (item.system.type === "magic") {
        // iterate through damage array
        for (let part of item.system.damage) {
            // damage type
            const type = part.type;
            const ability = item.system.ability;

            // base damage roll corresponding to actor level
            const base = CONFIG.CELESTUS.baseDamage.formula[actor.system.attributes.level];

            const mult = calcMult(actor, type, ability, part.value, 0);

            const r = new Roll(`floor((${base})[${type}] * ${mult})`)
            await r.toMessage({
                speaker: { alias: actor.name },
                'system.isDamage': true,
                'system.damageType': type,
                'system.actorID': actorID,
            });
        }
    }
    else if (item.system.type === "weapon") {
        const damage = actor.system.weaponDamage;
        if (!damage) {
            return;
        }
        if (damage.length === 1) {
            const type = damage[0].type;
            const formula = `floor(${damage[0].roll})`

            const r = new Roll(formula);
            await r.toMessage({
                speaker: { alias: actor.name },
                'system.isDamage': true,
                'system.damageType': type,
                'system.actorID': actorID,
            });
        }
        else {
            const type1 = damage[0].type;
            const formula1 = `floor((${damage[0].roll})*${CONFIG.CELESTUS.twoHandMult})`

            const r1 = new Roll(formula1);
            await r1.toMessage({
                speaker: { alias: actor.name },
                'system.isDamage': true,
                'system.damageType': type1,
                'system.actorID': actorID,
            });
            const type2 = damage[1].type;
            const formula2 = `floor((${damage[1].roll})*${CONFIG.CELESTUS.twoHandMult})`

            const r2 = new Roll(formula2);
            await r2.toMessage({
                speaker: { alias: actor.name },
                'system.isDamage': true,
                'system.damageType': type2,
                'system.actorID': actorID,
            });
        }
    }
}

/**
 * 
 * @param {event} e : event from button click
 */
export async function applyDamageHook(e) {
    const damage = e.currentTarget.dataset.damageTotal;
    const type = e.currentTarget.dataset.damageType;
    const origin = await fromUuid(e.currentTarget.dataset.originActor);

    const selected = canvas.tokens.controlled;
    // iterate through each controlled token
    for (const token of selected) {
        token.actor.applyDamage(damage, type, origin);
    }
}

/**
 * 
 * @param {event} e : event from button click
 */
export async function applyStatusHook(e) {
    // get currently controlled tokens
    const selected = canvas.tokens.controlled;
    if (selected.size < 1) {
        return ui.notifications.warn("ERROR: must select an actor to apply statuses to")
    }

    const origin = await fromUuid(e.currentTarget.dataset.actorUuid);
    const item = await fromUuid(e.currentTarget.dataset.itemUuid);

    // for each controlled token
    for (const target of selected) {
        // for each status
        for (const status of item.effects) {
            if (status.disabled || target.actor.effects.find(i => i.name === status.name)) {
                continue;
            }
            await target.actor.createEmbeddedDocuments('ActiveEffect', [
                {
                    name: status.name,
                    img: status.img,
                    origin: origin.uuid,
                    'duration.rounds': status.duration.rounds,
                    disabled: false,
                    type: "status",
                    "system.damage": status.system.damage,
                },
            ]);
        }
    }
}

/**
 * 
 * @param { ChatMessage } msg : chatmessage object for message being rendered (readonly)
 * @param { jQuery } html : jquery html data for chat
 * @param { messageData } options 
 */
export async function addChatButtons(msg, html, options) {
    // if msg is an attack roll, change colors appropriately
    if (msg.system.isAttack) {
        // get roll toral (in case there are modifiers for some reason)
        let total = 0;
        for (let roll of msg.rolls) {
            total += roll.total;
        }
        // change color based on hit, miss, or crit
        if (total > msg.getFlag("celestus", "critThreshold")) {
            html.find(".dice-total").css('background-color', BLUE);
        }
        else if (total > msg.getFlag("celestus", "hitThreshold")) {
            html.find(".dice-total").css('background-color', GREEN);
        }
        else {
            html.find(".dice-total").css('background-color', RED);
        }
    }
    // if message is a skill usage, add attack / damage buttons for owners
    if (msg.system.isSkill) {
        const actor = await fromUuid(msg.system.actorID);
        const skill = await fromUuid(msg.system.itemID);
        const perms = actor.ownership;

        // check if player has owner access on token associated with message
        const disabled = (perms.default >= 3 || ((game.user.id in perms) && perms[game.user.id] >= 3)) ? "" : "disabled";

        // add attack button if there is an attack
        if (msg.system.skill.hasAttack) {
            html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="attack" ${disabled}>Roll Attack</button>`)
        }
        // add damage button if there is a damage roll
        if (msg.system.skill.hasDamage) {
            html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="damage"${disabled}>Roll Damage</button>`)
        }
        console.log(skill.effects.size, skill.effects)
        if (skill.effects.size > 0) {
            html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="apply-status"${disabled}>Apply Statuses</button>`)
        }
    }
    if (msg.system.isDamage) {
        // only gm can apply damage
        const disabled = game.user.isGM ? "" : "disabled";
        // add damage type to damage text
        const dieTotal = html.find(".dice-total");
        dieTotal.html(dieTotal.html() + ` (${CONFIG.CELESTUS.damageTypes[msg.system.damageType].label})`)
        dieTotal.append(`<i class=${CONFIG.CELESTUS.damageTypes[msg.system.damageType].glyph}></i>`);
        dieTotal.css("background-color", CONFIG.CELESTUS.damageTypes[msg.system.damageType].color);
        let dmgTotal = 0;
        for (let roll of msg.rolls) {
            dmgTotal += roll.total;
        }
        html.append(`<button data-origin-actor="${msg.system.actorID}" data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" class=\"apply-damage\ ${disabled}">Apply Damage</button>`);

    }
}

/**
 * 
 * @param {Token} object : object being controlled, used to get actor for dmg preview
 * @param {boolean} controlled : verify if control is being gained or lost
 */
export async function previewDamage(object, controlled) {
    const actor = object.actor;

    // iterate through each apply damage button
    $("button.apply-damage").each(function () {
        // if selecting a token, show damage calc, otherwise show prompt
        if (controlled) {
            let damage = actor.calcDamage($(this).data("damage-total"), $(this).data("damage-type"));
            // invert damage preview if healing
            damage = CONFIG.CELESTUS.damageTypes[$(this).data("damage-type")].style === "healing" ? -damage : damage;
            const sign = damage > 0 ? "" : "+";
            damage *= -1;
            // set html
            $(this).html(sign + damage.toString());
            // set background based on healing or harming
            $(this).css("background-color", (damage <= 0) ? RED : GREEN)
            // set class to display as number
            $(this).addClass("number");
        }
        else {
            $(this).html("Apply Damage");
            $(this).removeClass("number");
            $(this).css("background-color", "")
        }
    });
}

/**
 * Create a macro for an item dropped onto hotbar
 * find existing or create new if one already exists
 * 
 * @param {Object} data: the dropped data for macro
 * @param {number} slot: the hotbar slot
 * @returns {Promise}
 */
export async function createCelestusMacro(data, slot) {
    // only create macros for items
    if (data.type !== "Item") {
        return;
    }
    // only let player create macro for an owned item
    if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
        return ui.notifications.warn(
            "Error: cannot create macro for unowned item."
        );
    }
    // find item
    const item = await Item.fromDropData(data);

    // create macro
    const command = `game.celestus.rollItemMacro("${data.uuid}")`;
    // check if macro already exists
    let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: "script",
            img: item.img,
            command: command,
            flags: { "celestus.itemMacro": true }
        })
    }
    game.user.assignHotbarMacro(macro, slot);
    return false;
}

/**
 * @param {string} itemUuid
 * @returns {Promise}
 */
export function rollItemMacro(itemUuid) {
    // reconstruct drop data
    const dropData = {
        type: 'Item',
        uuid: itemUuid
    }

    // Load the item from the uuid.
    Item.fromDropData(dropData).then((item) => {
        // Determine if the item loaded and if it's an owned item.
        if (!item || !item.parent) {
            const itemName = item?.name ?? itemUuid;
            return ui.notifications.warn(
                `Could not find item ${itemName}. You may need to delete and recreate this macro.`
            );
        }

        // Trigger the item roll
        item.roll();
    });

}

/**
 * Manage Active Effect instances through an Actor or Item Sheet via effect control buttons
 * @param {MouseEvent} event: left-click event on the effect control
 * @param {Actor|Item} owner: document which manages this effect
 */
export function onManageActiveEffect(event, owner) {
    event.preventDefault();
    const a = event.currentTarget;
    const li = a.closest('li');
    const effect = li.dataset.effectId
        ? owner.effects.get(li.dataset.effectId)
        : null;
    switch (a.dataset.action) {
        case 'create':
            return owner.createEmbeddedDocuments('ActiveEffect', [
                {
                    name: "new effect",
                    img: 'icons/svg/aura.svg',
                    origin: owner.uuid,
                    'duration.rounds':
                        li.dataset.effectType === 'temporary' ? 1 : undefined,
                    disabled: li.dataset.effectType === 'inactive',
                    type: "status",
                },
            ]);
        case 'edit':
            return effect.sheet.render(true);
        case 'delete':
            return effect.delete();
        case 'toggle':
            return effect.update({ disabled: !effect.disabled });
    }
}

/**
 * 
 * @param {Combat} combat 
 * @param {Number, Number} updateData round,turn
 * @param {Number, Number} updateOptions advanceTimer, direction
 */
export function triggerTurn(combat, updateData, updateOptions) {
    // only fire if user is a GM
    if (!game.user.isGM) {
        return;
    }
    const endingId = combat.previous.combatantId;
    const startingId = combat.current.combatantId;
    // only handle ending turn if there was a previous turn
    if (endingId) {
        const ending = combat.combatants.get(endingId);
    }
    const starting = combat.combatants.get(startingId);
    starting.actor.startTurn();
}

/**
 * 
 * @param {Combat} combat 
 * @param {number,number} updateData {round, turn}
 */
export function startCombat(combat, updateData) {
    // only fire if user is a GM
    if (!game.user.isGM) {
        return;
    }
    // make all combatants in combat
    for (const combatant of combat.combatants) {
        combatant.actor.refresh(false);
    }
}

/**
 * 
 * @param {Document} document 
 * @param {DatabaseDeleteOperation} options 
 * @param {string} userId 
 */
export function cleanupCombat(document, options, userId) {
    // only fire if user is a GM
    if (!game.user.isGM) {
        return;
    }
    // make all combatants in combat
    for (const combatant of document.combatants) {
        combatant.actor.refresh(false);
    }
}