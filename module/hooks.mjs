import { applyWeaponStatus, byString, calcMult, delay, executeSkillScript, itemizeDamage, promptDamage, rollWeaponDamage, rotateTokenTowards, updateWithMath } from "./helpers.mjs";

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
    if (targets.size < 1) {
        return ui.notifications.warn("ERROR: Please select at least one target to attack.");
    }

    // point token towards first target
    if (targets.size === 1) {
        const target = targets.values()?.next()?.value;
        if (target) {
            const tokens = actor.getActiveTokens();
            for (const token of tokens) {
                rotateTokenTowards(token, { x: target.x, y: target.y });
            }
        }
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

        let r = new Roll("1d100", {});
        r.toMessage({
            speaker: { alias: actor.name },
            flags: {
                "celestus": {
                    hitThreshold: hitThresh,
                    critThreshold: critThresh,
                    targetName: target.name
                }
            },
            'system.isAttack': true,
        });
    }
}
/**
 * roll a d100  just to check for a critical hit
 * @param {event} e : event from button click, should contain info about actor/item uuid
 */
export async function rollCrit(e) {
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
    // threshold needed to exceed to count as a crit
    const critThresh = 100 - (actor.system.attributes.bonuses.crit_chance.value * 100);

    let r = new Roll("1d100", {}, { flavor: `${actor.name} rolls for Brutal Spellcraft` });
    r.toMessage({
        speaker: { alias: actor.name },
        flags: {
            "celestus": {
                critThreshold: critThresh,
            }
        },
        'system.isAttack': true,
    });
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

    if (item.type === "skill") {
        const [isCrit, situational] = await promptDamage();
        if (item.system.type === "magic" || item.system.overridesWeaponDamage) {
            let formula = "";
            // iterate through damage array
            for (let part of item.system.damage) {
                // damage type
                const type = part.type;
                const ability = item.system.ability;

                // base damage roll corresponding to actor level
                const base = CONFIG.CELESTUS.baseDamage.formula[actor.system.attributes.level].replace("none", type);

                const mult = calcMult(actor, type, ability, part.value, isCrit, 0);
                formula += `+ floor((${base}) * ${mult} * ${situational})[${type}]`
            }
            const r = new Roll(formula)
            await r.toMessage({
                speaker: { alias: `${actor.name} - ${item.name}` },
                'system.isDamage': true,
                'system.damageType': item.system.damage[0].type,
                'system.actorID': actorID,
                'system.itemID': itemID,
                'flags.celestus.splitDamage': item.system.itemizeDamage,
            });
        }
        else if (item.system.type === "weapon") {
            let weaponScalar = item.system.weaponEfficiency ?? 1;
            const damage = actor.system.weaponDamage;
            const bonusDamage = actor.system.bonusWeaponDamage;
            const statuses = actor.system.weaponStatusRolls;
            if (!damage || damage.length === 0) {
                return;
            }
            let overrideDamageType = item.system.overridesWeaponType ? item.system.overrideDamageType : "";
            await rollWeaponDamage(actor, damage, bonusDamage, statuses, isCrit, weaponScalar, overrideDamageType, situational);
        }
    }
    else if (item.type === "consumable") {
        let formula = "";
        // iterate through damage array
        for (let part of item.system.damage) {
            // damage type
            const type = part.type;

            // base damage roll corresponding to actor level
            const base = part.value;
            const mult = calcMult(actor, type, "0", 1, false, 0);
            formula += `+ floor((${base}) * ${mult})[${type}]`
        }
        const r = new Roll(formula)
        await r.toMessage({
            speaker: { alias: `${actor.name} - ${item.name}` },
            'system.isDamage': true,
            'system.damageType': item.system.damage[0].type,
            'system.actorID': actorID,
            'system.itemID': itemID,
            'flags.celestus.splitDamage': item.system.itemizeDamage,
        });
    }
}


/**
 * 
 * @param {event} e : event from button click
 */
export async function applyDamageHook(e) {
    const origin = await fromUuid(e.currentTarget.dataset.originActor);
    const item = await fromUuid(e.currentTarget.dataset.originItem);
    const multiplier = parseFloat(e.currentTarget.dataset.multiplier || 1);

    const msg = await fromUuid(e.currentTarget.dataset.messageId);
    if (!msg) return;

    const dmgTerms = itemizeDamage(msg);
    if (!dmgTerms.terms) return;

    let lifesteal = 0;
    if (item?.type === "skill") {
        lifesteal = item.system.lifesteal;
    }

    const selected = canvas.tokens.controlled;
    // iterate through each controlled token
    for (const token of selected) {
        for (const term of dmgTerms.terms) {
            await token.actor.applyDamage(term.amount * multiplier, term.type, origin, { lifesteal: lifesteal });
        }
    }

    e.stopPropagation();
    e.preventDefault();
}

/**
 * 
 * @param {event} e : event from button click
 */
export async function applyDamageComponent(e) {
    const parent = $(e.currentTarget).parents(".damage-component")[0];
    if (!parent) return console.warn("CELESTUS | Could not find damage component parent");
    const damage = parent.dataset.damageTotal * e.currentTarget.dataset.mult;;
    const type = parent.dataset.damageType;
    const origin = await fromUuid(parent.dataset.originActor);
    const item = await fromUuid(parent.dataset.originItem);

    let lifesteal = 0;
    if (item?.type === "skill") {
        lifesteal = item.system.lifesteal;
    }

    const selected = canvas.tokens.controlled;
    // iterate through each controlled token
    for (const token of selected) {
        await token.actor.applyDamage(damage, type, origin, { lifesteal: lifesteal });
    }

    e.stopPropagation();
    e.preventDefault();
}

/**
 * 
 * @param {event} e : event from button click
 */
export async function drawTemplate(e) {
    const skill = await fromUuid(e.currentTarget.dataset.itemUuid);
    CONFIG.MeasuredTemplate.objectClass.fromSkill(skill);
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
        // go through actual statusEffects
        for (const id of item.system.statusEffects) {
            const statusEffect = await ActiveEffect.fromStatusEffect(id);
            statusEffect.updateSource({ "origin": origin.uuid })
            await target.actor.createEmbeddedDocuments(
                "ActiveEffect",
                [statusEffect]
            );
        }
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
                    system: status.system,
                    changes: status.changes,
                    statuses: status.statuses,
                },
            ]);
        }
    }
}

/**
 * 
 * @param { ChatMessage } msg : chatmessage object for message being rendered (readonly)
 * @param { HTMLElement } html : HTML Element for chat message
 * @param { messageData } options 
 */
export async function addChatButtons(msg, html, options) {
    html = $(html);
    // if msg is an attack roll, change colors appropriately
    if (msg.system.isAttack) {
        // get roll toral (in case there are modifiers for some reason)
        let total = 0;
        for (let roll of msg.rolls) {
            total += roll.total;
        }
        // change color based on hit, miss, or crit
        if (total < msg.getFlag("celestus", "hitThreshold")) {
            html.find(".dice-total").css('background-color', RED);
            html.find(".dice-total").html(total + ' <i class="fa-solid fa-xmark attack-indicator"></i>');
        }
        else if (total > msg.getFlag("celestus", "critThreshold")) {
            html.find(".dice-total").css('background-color', BLUE);
            html.find(".dice-total").html(total + ' <i class="fa-solid fa-star attack-indicator"></i>');
        }
        else {
            html.find(".dice-total").css('background-color', GREEN);
            html.find(".dice-total").html(total + ' <i class="fa-solid fa-check attack-indicator"></i>');
        }
        html.find(".message-content").html(html.find(".message-content").html() + `
            <div class="attack-description">
                Attacking ${msg.getFlag("celestus", "targetName")}
            </div>
            <div class="attack-thresholds">
                <b>Hit:</b> ${msg.getFlag("celestus", "hitThreshold").toFixed(0)},
                <b>Crit:</b> ${msg.getFlag("celestus", "critThreshold").toFixed(0)}
            </div>
        `);
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
        else if (actor.getFlag("celestus", "brutalspells") && skill.system.damage.length > 0) {
            html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="roll-crit" ${disabled}>Brutal Spellcraft</button>`)
        }
        // add damage button if there is a damage roll
        if (msg.system.skill.hasDamage) {
            html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="damage" ${disabled}>Roll Damage</button>`);
        }
        // apply effects
        if (skill.effects.size > 0 || skill.system.statusEffects?.length > 0) {
            html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="apply-status" ${disabled}>Apply Statuses</button>`)
        }
        // draw template
        const targetOptions = CONFIG.CELESTUS.targetTypes[skill.system.targets.type]?.options;
        if (targetOptions && targetOptions.find(o => o === "size")) {
            html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="draw-template" ${disabled}>Draw Template</button>`)
        }
        // execute script
        if (skill.system.hasScript && game.user.isGM) {
            html.append(`<button data-skill-id="${skill.system.scriptId}" data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="execute-skill" ${disabled}>Execute Skill</button>`);
            html.on('click', '.execute-skill', (ev) => {
                executeSkillScript(actor, skill);
            });
        }

    }
    // if message is a consumable item
    if (msg.system.isConsumable) {
        const actor = await fromUuid(msg.system.actorID);
        const perms = actor.ownership;
        const item = await fromUuid(msg.system.itemID);
        // check if player has owner access on token associated with message
        const disabled = (perms.default >= 3 || ((game.user.id in perms) && perms[game.user.id] >= 3)) ? "" : "disabled";

        // add damage button if there is a damage roll
        if (item.system.hasDamage) {
            html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="damage" ${disabled}>Roll Formula</button>`);
        }
    }
    if (msg.system.isDamage) {
        // only gm can apply damage
        const disabled = game.user.isGM ? "" : "disabled";
        // add damage type to damage text
        const dieTotal = html.find(".dice-total");
        let label = CONFIG.CELESTUS.damageTypes[msg.system.damageType]?.label ?? msg.system.damageType;
        label += itemizeDamage(msg)?.terms?.length > 1 ? '*' : '';
        dieTotal.html(dieTotal.html() + ` (${label})`)
        if (CONFIG.CELESTUS.damageTypes[msg.system.damageType]) {
            dieTotal.append(`<i class=${CONFIG.CELESTUS.damageTypes[msg.system.damageType].glyph}></i>`);
            dieTotal.css("background-color", CONFIG.CELESTUS.damageTypes[msg.system.damageType].color);
        }
        let dmgTotal = 0;
        for (let roll of msg.rolls) {
            dmgTotal += roll.total;
        }
        html.append(`<button data-origin-actor="${msg.system.actorID}" data-message-id="${msg.uuid}" data-origin-item="${msg.system.itemID}" data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" class=\"apply-damage\" ${disabled}">Apply Damage</button>`);
        html.append(`
            <div class=flexrow>
                <button data-origin-actor="${msg.system.actorID}" data-message-id="${msg.uuid}" data-origin-item="${msg.system.itemID}" data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" data-multiplier="-1" class="apply-damage-mult" ${disabled}>-1</button>
                <button data-origin-actor="${msg.system.actorID}" data-message-id="${msg.uuid}" data-origin-item="${msg.system.itemID}" data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" data-multiplier="0.25" class="apply-damage-mult" ${disabled}>1/4</button>
                <button data-origin-actor="${msg.system.actorID}" data-message-id="${msg.uuid}" data-origin-item="${msg.system.itemID}" data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" data-multiplier="0.5" class="apply-damage-mult" ${disabled}>1/2</button>
                <button data-origin-actor="${msg.system.actorID}" data-message-id="${msg.uuid}" data-origin-item="${msg.system.itemID}" data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" data-multiplier="1" class="apply-damage-mult" ${disabled}>1</button>
                <button data-origin-actor="${msg.system.actorID}" data-message-id="${msg.uuid}" data-origin-item="${msg.system.itemID}" data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" data-multiplier="2" class="apply-damage-mult" ${disabled}>2</button>
            </div>
            `);
    }
    html.on('click', '.status.success', applyWeaponStatus);
}

/**
 * 
 * @param {Token} object : object being controlled, used to get actor for dmg preview
 * @param {boolean} controlled : verify if control is being gained or lost
 */
export async function previewDamage(object, controlled) {
    const actor = object.actor;

    // iterate through each apply damage button
    $("button.apply-damage").each(async function () {
        // if selecting a token, show damage calc, otherwise show prompt
        if (controlled) {
            const origin = await fromUuid($(this).data("origin-actor"));
            const msg = await fromUuid($(this).data("message-id"));
            if (!msg) return;
            const damageParts = itemizeDamage(msg);
            if (!damageParts) return;
            // iterate through damage parts
            let damage = 0;
            for (const term of damageParts.terms) {
                let part = actor.calcDamage(term.amount, term.type, origin);
                // invert damage preview if healing
                part = CONFIG.CELESTUS.damageTypes[term.type].style === "healing" ? -part : part;
                damage += part;
            }

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
    const command = `game.celestus.rollItemMacro("${item.name}")`;
    // check if macro already exists
    let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: "script",
            img: item.img,
            command: command,
            flags: { "celestus.itemMacro": true },
            ownership: { "default": 3 }
        })
    }
    await game.user.assignHotbarMacro(macro, slot);
    return false;
}

/**
 * @param {string} name
 */
export function rollItemMacro(name) {
    // check for token/actor
    let actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character ?? _token?.actor ?? null;
    if (!actor) {
        return ui.notifications.warn("CELESTUS | Please select a token before executing a macro");
    }
    // find item on controlled actor
    const item = actor.items.find(i => i.name === name);
    if (!item) {
        return ui.notifications.warn(`CELESTUS | Could not find item named ${name} on controlled actor`)
    }
    item.roll();
}

/**
 * Automatically populates hotbar with macros from the actor's skill list
 */
export async function populateHotbar(actor) {
    // prompt for confirmation (if not auto populating)
    if (!game.settings.get('celestus', 'autoPopulateHotbar') && game.settings.get('celestus', 'hotbarPopulateConfirmation')) {
        const proceed = await foundry.applications.api.DialogV2.confirm({
            content: `Are you sure you want to populate the hotbar? This will remove any existing hotbar macros
                <br/>(If there is no current actor, it will just be cleared)`,
            rejectClose: false,
            modal: true
        });
        if (!proceed) return;
    }
    // clear user's hotbar
    await game.user.update({ hotbar: {} }, { diff: false, recursive: false, noHook: true });
    // get actor
    actor = actor ?? canvas.tokens?.controlled?.[0]?.actor ?? game.user.character ?? _token?.actor ?? null;
    if (!actor) return ui.notifications.warn("CELESTUS | No actor to populate hotbar from");
    // iterate through active skills
    let skills;
    if (actor.type === "player") {
        skills = actor.items.filter(i => (i.type === "skill" && i.system.memorized === "always"));
        skills = skills.concat(actor.items.filter(i => (i.type === "skill" && i.system.memorized === "true")));
    }
    else {
        skills = actor.items.filter(i => (i.type === "skill"));
    }
    let i = 1;
    for (const skill of skills) {
        if (i > 50) break;
        const data = { type: "Item", uuid: skill.uuid };
        await createCelestusMacro(data, i);
        i++;
    }
}

/**
 * Manage Active Effect instances through an Actor or Item Sheet via effect control buttons
 * @param {MouseEvent} event: left-click event on the effect control
 * @param {Actor|Item} owner: document which manages this effect
 */
export async function onManageActiveEffect(event, owner) {
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
                    name: owner.name,
                    img: owner.img,
                    origin: owner.uuid,
                    'duration.rounds':
                        li.dataset.effectType === 'temporary' ? 1 : undefined,
                    disabled: li.dataset.effectType === 'inactive',
                    type: "status",
                    transfer: false,
                },
            ]);
        case 'edit':
            return effect.sheet.render(true);
        case 'delete':
            const proceed = await foundry.applications.api.DialogV2.confirm({
                content: "Are you sure you want to delete this effect? This action cannot be undone.",
                rejectClose: false,
                modal: true
            });
            if (!proceed) return;
            return effect.delete();
        case 'toggle':
            return effect.update({ disabled: !effect.disabled });
    }
}

/**
 * 
 * @param {Combat} combat 
 * @param {CombatHistoryData} prior
 * @param {CombatHistoryData} current
 */
export async function triggerTurn(combat, prior, current) {
    // only fire if user is a GM
    if (!game.user.isGM) {
        return;
    }
    // skip if first turn of combat
    if (prior.turn === null) return;
    // only fire if progressing forward
    if (prior.round > current.round || (prior.turn > current.turn && prior.round === current.round)) return;
    // check lingering templates
    for (const template of canvas.scene.templates) {
        if (template.getFlag("celestus", "clearThis")) {
            await template.delete();
            continue;
        }
        if (template.getFlag("celestus", "linger") === true) {
            const startRound = template.getFlag("celestus", "lingerStartRound");
            const startTurn = template.getFlag("celestus", "lingerStartTurn");
            const duration = template.getFlag("celestus", "lingerDuration");
            if (current.round - startRound > duration || current.round - startRound >= duration && current.turn > startTurn) {
                // check if surface turns to something else on death
                const onEnd = CONFIG.CELESTUS.surfaceTypes[template.getFlag("celestus", "surfaceType")]?.onEnd;
                if (onEnd && CONFIG.CELESTUS.surfaceTypes[onEnd]) {
                    await template.setFlag("celestus", "lingerStartRound", current.round);
                    await template.setFlag("celestus", "lingerStartTurn", current.turn);
                    await template.setFlag("celestus", "lingerDuration", CONFIG.CELESTUS.surfaceTypes[onEnd].duration);
                    await template.setFlag("celestus", "surfaceType", onEnd);
                }
                else {
                    await template.delete();
                }
                continue;
            }
        }
        // trigger auras
        if (template) {
            await template.testAll();
        }
    }
    const endingId = combat.previous.combatantId;
    const startingId = combat.current.combatantId;
    // only handle ending turn if there was a previous turn
    if (endingId) {
        const ending = combat.combatants.get(endingId);
        await ending.actor.endTurn();
    }
    const starting = combat.combatants.get(startingId);
    await starting.actor.startTurn();
}

/**
 * 
 * @param {Combat} combat 
 * @param {number,number} updateData {round, turn}
 */
export async function startCombat(combat, updateData) {
    // only fire if user is a GM
    if (!game.user.isGM) {
        return;
    }
    // clear combatant ap
    for (const combatant of combat.combatants) {
        await combatant.actor.update({ "system.resources.ap.value": 0 });
    }
    // trigger first combatant's turn
    const first = combat.combatants.get(combat.turns[0]?.id)?.actor;
    if (first) {
        await first.startTurn();
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
}

/**
 * 
 * @param {Object} token: token object on canvas to spread aura from 
 * @param {Object} changed: changed values
 */
export async function spreadAura(token, changed, options, userId) {
    if (!game.users.activeGM.isSelf) return;
    if (!(changed.x && changed.y)) return;
    // get new coords as an object
    const tokenCoords = {
        x: changed.x + token.object.w / 2,
        y: changed.y + token.object.h / 2,
    }
    // spread from this token
    await token.object.spreadAuraFrom(tokenCoords);
    // spread from other tokens
    await token.object.spreadAuraTo(tokenCoords);
}

/**
 * 
 * @param {ChatMessage} message: The ChatMessage document being rendered
 * @param {HTMLElement} html: The pending HTML as an HTML Element
 * @param {any} messageData 
 */
export function removeRollAuthor(message, html, messageData) {
    if (message.system?.type !== "roll") return;
    $(html).find("h4.message-sender").remove();
}

/**
 * render overlays over hotbat
 */
export function renderHotbarOverlay(render = true, html = null) {
    html ??= document.getElementById("hotbar");
    html = $(html);
    let actor = game?.canvas?.tokens?.controlled?.[0]?.actor ?? game?.user?.character ?? _token?.actor ?? null;
    // check for token/actor
    if (!actor) {
        return;
    }
    // clear all old hotbar overlays
    $(".macro-overlay").remove();
    if (!render && !game.user.character) return;
    const skills = actor.system.allSkills;
    // find all active hotbar items
    const active = $(html).find("#action-bar li.slot");
    active.each((i, e) => {
        const macroId = game?.user?.hotbar[e.dataset.slot];
        const skill = skills.find(i => i.name === game.macros?.get(macroId)?.name);
        if (skill) {
            const cooldown = skill.system.cooldown.value;
            if (cooldown > 0) {
                $(`<div class=macro-overlay>${cooldown}</div>`).insertBefore($(e).find(".key"));
            }
            else if (cooldown < 0) {
                $(`<div class=macro-overlay><i class="icon-sunrise"></i></div>`).insertBefore($(e).find(".key"));
            }
            else if (skill.system.disabled) {
                $(`<div class=macro-overlay><i class="fa-solid fa-ban"></i></div>`).insertBefore($(e).find(".key"));
            }
        }
    });
}

/**
 * Draws (or hides) token overlays on hovered token
 * @param {Token} token 
 * @param {Boolean} hovered 
 */
export function drawTokenHover(token, hovered) {
    // render token info in hud
    // only render token info if not boss
    if (game.celestus.bossId !== token.actor?._id) {
        renderTokenInfo(token, hovered);
    }
    if (hovered && token) {
        const tokenCenter = token.getCenterPoint();;

        // add to scene and store in config
        let reachOverlay = CONFIG.CELESTUS.reachOverlay;
        let overlaySprite = CONFIG.CELESTUS.backstabOverlaySprite;
        let areaSprite = CONFIG.CELESTUS.backstabAreaSprite;

        CONFIG.CELESTUS.reachOverlay = reachOverlay
        canvas.effects.addChild(overlaySprite);
        canvas.effects.addChild(reachOverlay);
        canvas.effects.addChild(areaSprite);

        /**
         * Draw backstab overlay
         */
        const size = Math.min(token.w, token.h) * 2;
        let offsetY = tokenCenter.y;
        let offsetX = tokenCenter.x;


        [overlaySprite.x, overlaySprite.y] = [offsetX, offsetY]

        overlaySprite.width = size;
        overlaySprite.height = size;

        overlaySprite.anchor.x = 0.5;
        overlaySprite.anchor.y = 0.5;
        const rotation = token.document.getFlag("celestus", "rotation") ?? 0;
        overlaySprite.rotation = rotation;

        overlaySprite.zIndex = 20;

        /**
         * Draw backstab area
         */
        [areaSprite.x, areaSprite.y] = [offsetX, offsetY]
        areaSprite.width = size * 2;
        areaSprite.height = size * 2;
        areaSprite.rotation = rotation;


        /**
         * Draw attack range
         */
        // get grid scale
        const pixelPerFoot = game.canvas.grid.size / 5;
        // convert reach to pixels
        const rangePx = token.actor.system.reach * pixelPerFoot;
        const radius = rangePx + (Math.min(token.w, token.h) / 2);
        // draw circle
        reachOverlay.beginFill(CONFIG.CELESTUS.rangeOverlayCol);
        reachOverlay.drawCircle(0, 0, radius);
        reachOverlay.endFill();
        reachOverlay.alpha = 0.2;

        // set position
        [reachOverlay.x, reachOverlay.y] = [tokenCenter.x, tokenCenter.y];
    }
    else {
        canvas.effects.removeChild(CONFIG.CELESTUS.backstabOverlaySprite);
        canvas.effects.removeChild(CONFIG.CELESTUS.backstabAreaSprite);
        CONFIG.CELESTUS.reachOverlay.clear();
        canvas.effects.removeChild(CONFIG.CELESTUS.reachOverlay);
    }
}

/**
 * Rotates tokens towards the position they move to
 * @param {Token} token 
 * @param {Object} changed 
 * @param {Object} options 
 */
export function rotateOnMove(token, changed, options) {
    // if token moved, rotate towards position
    if (changed.x && changed.y) {
        rotateTokenTowards(token.object, { x: changed.x, y: changed.y });
    }
}


/**
 * 
 * @param { ChatMessage } msg : chatmessage object for message being rendered (readonly)
 * @param { HTMLElement } html : HTML Element for chat message
 * @param { messageData } options 
 */
export async function renderDamageComponents(msg, html, options) {
    html = $(html);
    if (!msg.system.isDamage) return;
    const dmgInfo = itemizeDamage(msg);
    // render item description to html
    const path = `./systems/celestus/templates/rolls/damage-breakdown.hbs`;
    const msgData = {
        terms: dmgInfo.terms,
        damageTypes: CONFIG.CELESTUS.damageTypes,
        originActor: msg.system.actorID,
        originItem: msg.system.itemID,
        msgId: msg.uuid,
    }
    let content = await foundry.applications.handlebars.renderTemplate(path, msgData);
    html.find(".dice-roll").after(content);
}

/**
 * Renders action points and other resources in ui overlay
 * @param {Boolean} hide should the resources ui be forced to be hidden?
 */
export async function renderResourcesUi(hide = false) {
    let actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? _token?.actor ?? null;

    if (!actor || hide === true) {
        document.getElementById("ui-resources").style.display = "none";
        $("#chat-notifications").animate({"margin-bottom": 0});
        return;
    }

    // move chat up
    $("#chat-notifications").animate({"margin-bottom": 145}, "200");

    const path = './systems/celestus/templates/resources-ui.hbs';
    const msgData = {
        actorId: actor._id,
        resources: actor.system.resources,
        portrait: actor.prototypeToken?.texture.src ?? actor.img,
        name: actor.prototypeToken?.name ?? actor.name
    }
    let msg = await foundry.applications.handlebars.renderTemplate(path, msgData);

    document.getElementById("ui-resources").innerHTML = msg;
    document.getElementById("ui-resources").dataset.actorId = actor.uuid;


    // render progress bars for resources
    $("#ui-resources").find('.resource-value').each((index, target) => {
        const varPath = target.id;
        const resourceVal = actor.system.resources[varPath.substring(varPath.lastIndexOf('.') + 1)].value;
        const resourceMax = actor.system.resources[varPath.substring(varPath.lastIndexOf('.') + 1)].max;
        const resourcePercent = (resourceVal / resourceMax);
        // draw gradient depending on if overflowing or not
        let gradient;
        if (resourcePercent > 1) {
            const gradientCol = "rgba(255,255,255,0.25)";
            gradient = `linear-gradient(to left, ${gradientCol} ${((1 - resourcePercent) * -100)}%, rgba(0,0,0,0) 0%)`;
        }
        else if (resourcePercent > 0) {
            const gradientCol = "#404040";
            gradient = `linear-gradient(to left, ${gradientCol} ${((1 - resourcePercent) * 100)}%, rgba(0,0,0,0) 0%)`;
        }
        else {
            const gradientCol = "#404040";
            gradient = `linear-gradient(to right, ${gradientCol} ${((1 + resourcePercent) * 100)}%, rgba(0,0,0,0) 0%)`;
        }
        const curCSS = $(target).css("background-image");
        $(target).css("background-image", `${curCSS}, ${gradient}`);
        if (resourcePercent < 0) {
            $(target).css("background-color", `#ff9999`);
        }
    });
    // reveal resources ui
    document.getElementById("ui-resources").style.display = "";
}

/**
 * sets action points from clicking on resource ui
 * @param {Event} ev event originating click
 */
export async function resourceInteractAp(ev) {
    const actor = await fromUuid($(ev.currentTarget).parents('.resources-ui').attr('data-actor-id'));
    if (!actor) return console.warn("CELESTUS | Could not find actor to update AP");
    const index = $(ev.currentTarget).data('index') + 1;
    if (index === actor.system.resources.ap.value) {
        await actor.update({ "system.resources.ap.value": actor.system.resources.ap.value - 1 });
    }
    else {
        await actor.update({ "system.resources.ap.value": index });
    }
}
/**
 * sets focus points from clicking on resource ui
 * @param {Event} ev event originating click
 */
export async function resourceInteractFp(ev) {
    const actor = await fromUuid($(ev.currentTarget).parents('.resources-ui').attr('data-actor-id'));
    if (!actor) return console.warn("CELESTUS | Could not find actor to update FP");
    const index = $(ev.currentTarget).data('index') + 1;
    if (index === actor.system.resources.fp.value) {
        await actor.update({ "system.resources.fp.value": actor.system.resources.fp.value - 1 });
    }
    else {
        await actor.update({ "system.resources.fp.value": index });
    }
}
/**
 * updates resource based on changing input element
 * @param {Event} ev event originating click
 */
export async function resourceInteractMisc(ev) {
    const actor = await fromUuid($(ev.currentTarget).parents('.resources-ui').attr('data-actor-id'));
    if (!actor) return console.warn("CELESTUS | Could not find actor to update resource");
    const resourceName = `system.${$(ev.currentTarget).attr('name')}`;
    await updateWithMath(actor, resourceName, $(ev.currentTarget).val());
}

/**
 * Renders token hover info ui
 * or hides ui if hover leave
 * @param {Token} token
 * @param {Boolean} hovered
 * @param {Boolean} force: force to render
 */
export async function renderTokenInfo(token, hovered, force) {
    // update currently hovered token
    CONFIG.CELESTUS.hoveredToken = hovered ? token : null;

    let ui = document.getElementById("ui-token-hover");

    if (ui.dataset.persist === "true" && !force) {
        return;
    }

    if (!hovered && ui.dataset.persist === "false") {
        ui.style.display = "none";
        return;
    }

    const path = './systems/celestus/templates/token-info.hbs';
    const msgData = {
        name: token.name,
        creatureType: CONFIG.CELESTUS.creatureTypes[token.actor.system.t],
        portrait: token.document.texture.src,
        resources: token.actor.system.resources,
        effects: token.actor.effects,
    }
    let msg = await foundry.applications.handlebars.renderTemplate(path, msgData);

    ui.style.display = "";
    ui.innerHTML = msg;
    ui.dataset.actorId = token.actor.uuid;

    // render progress bars for resources
    $("#ui-token-hover").find('.resource-value').each((index, target) => {
        const varPath = target.id;
        const resourceVal = token.actor.system.resources[varPath.substring(varPath.lastIndexOf('.') + 1)].value;
        const resourceMax = token.actor.system.resources[varPath.substring(varPath.lastIndexOf('.') + 1)].max;
        const resourcePercent = (resourceVal / resourceMax);
        // draw gradient depending on if overflowing or not
        let gradient;
        if (resourcePercent > 1) {
            const gradientCol = "rgba(255,255,255,0.25)";
            gradient = `linear-gradient(to left, ${gradientCol} ${((1 - resourcePercent) * -100)}%, rgba(0,0,0,0) 0%)`;
        }
        else if (resourcePercent > 0) {
            const gradientCol = "#404040";
            gradient = `linear-gradient(to left, ${gradientCol} ${((1 - resourcePercent) * 100)}%, rgba(0,0,0,0) 0%)`;
        }
        else {
            const gradientCol = "#404040";
            gradient = `linear-gradient(to right, ${gradientCol} ${((1 + resourcePercent) * 100)}%, rgba(0,0,0,0) 0%)`;
        }
        const curCSS = $(target).css("background-image");
        $(target).parents(".resource").css("background-image", `${curCSS}, ${gradient}`);
        if (resourcePercent < 0) {
            $(target).parents(".resource").css("background-color", `#ff9999`);
        }
    });
}

export async function activateBoss() {
    const token = canvas.tokens.controlled[0];
    if (!token) {
        return ui.notifications.warn("CELESTUS | You must select a token in order to turn it into a boss");
    }
    game.socket.emit("system.celestus", {
        type: "activateBoss",
        data: { id: token.id }
    });
    await renderBossDisplay(token);
    await showBossDisplay();
}

export function deactivateBoss() {
    if (!game.user.isGM) return;
    hideBossDisplay();
    game.socket.emit("system.celestus", {
        type: "deactivateBoss",
        data: {  }
    });
}


/**
 * Renders boss display
 */
export async function renderBossDisplay(token) {
    let ui = document.getElementById("ui-boss-display");
    ui.dataset.actorId = token.actor._id;
    game.celestus.bossId = token.actor._id;
    $("#boss-display-control").addClass("toggle");

    if (!token) return;
    const effects = token.actor.effects.filter(effect => (effect.isTemporary || effect.system.aura.has) && !effect.disabled);
    const resources = token.actor.system.resources;
    // render handlebars template
    const path = './systems/celestus/templates/boss-display.hbs';
    const msgData = {
        name: token.name,
        creatureType: CONFIG.CELESTUS.creatureTypes[token.actor.system.t],
        portrait: token.document.texture.src,
        resources: resources,
        resourcePercents: {
            hp: resources.hp.value / resources.hp.max * 100,
            phys_armor: resources.phys_armor.value / resources.phys_armor.max * 100,
            mag_armor: resources.mag_armor.value / resources.mag_armor.max * 100,
        },
        effects: effects,
        spacerIndex: Math.floor(effects.length / 2),
        effectNeedsDummy: effects.length % 2 !== 0,
    }
    let msg = await foundry.applications.handlebars.renderTemplate(path, msgData);
    // set inner html
    ui.innerHTML = msg;
}

/**
 * Updates the resources of the boss display
 * @param {Actor} actor data of boss
 */
export async function updateBossResources(actor) {
    let ui = document.getElementById("ui-boss-display");

    for (const key of ["phys_armor", "mag_armor", "hp"]) {
        const current = actor.system.resources[key].value;
        const max = actor.system.resources[key].max;
        const percent = Math.round(current / max * 100);
        // set resource numbers
        $(ui).find(`#${key}-value`).html(`${current}/${max}`);
        // animate bars
        $(ui).find(`#${key} .foreground`).animate({ width: percent + "%" }, 750, "swing");
        await sleep(250)
        $(ui).find(`#${key} .trailer`).animate({ width: percent + "%" }, 1750, "swing");
    }

    const effects = actor.effects.filter(effect => (effect.isTemporary || effect.system.aura.has) && !effect.disabled);
    const path = 'systems/celestus/templates/boss-display-effects.hbs';
    const msgData = {
        effects: effects,
        spacerIndex: Math.floor(effects.length / 2),
        effectNeedsDummy: effects.length % 2 !== 0,
    }
    let msg = await foundry.applications.handlebars.renderTemplate(path, msgData);
    const effectList = $(ui).find("#boss-effects");
    if (effectList.html() !== msg) {
        effectList.fadeOut(500);
        await sleep(500);
        effectList.html(msg);
        await sleep(250);
        effectList.fadeIn(500);
    }
}

/**
 * Animates boss display coming onto the screen
 * @returns {Promise} of when animations are completed
 */
export async function showBossDisplay() {
    // first, hide token info
    $("#ui-token-hover").animate({ top: -220 }, 1000, "swing");
    await delay(1000);
    // animate boss display
    $("#boss-health-container").animate({ top: 0 }, 1000);
    await delay(250);
    $("#boss-phys-container").animate({ top: 0 }, 1000);
    await delay(250);
    $("#boss-mag-container").animate({ top: 0 }, 1000);
    await delay(500);
    $("#boss-portrait-container").animate({ top: 0 }, 1000);
    await delay(250);
    $("#boss-effects").animate({ top: 20 }, 1000);
    await delay(1500);
    $("#boss-name").fadeIn(5000);
    await delay(5000);
    $("#boss-hide-tab").slideDown(500);
    return await delay(500);
}

/**
 * Animates boss display leaving the screen
 * @returns {Promise} of when animations are completed
 */
export async function hideBossDisplay() {
    $("#boss-name").slideUp(500);
    $("#boss-hide-tab").slideUp(500);
    await delay(500);
    $("#boss-effects").animate({ top: -200 }, 1000, "swing");
    await delay(100);
    $("#boss-portrait-container").animate({ top: -200 }, 1000, "swing");
    await delay(100);
    $("#boss-mag-container").animate({ top: -200 }, 1000, "swing");
    await delay(100);
    $("#boss-phys-container").animate({ top: -200 }, 1000, "swing");
    await delay(100);
    $("#boss-health-container").animate({ top: -200 }, 1000, "swing");
    await delay(1000);
    // finally, reveal token info
    $("#ui-token-hover").animate({ top: -20 }, 1000, "swing");
    await delay(1000);
    // remove boss id from session storage
    game.celestus.bossId = null;
    $("#boss-display-control").removeClass("toggle");
}

let teleporting = false;

/**
 * Confirms token teleport command
 * @param {Event} ev 
 */
async function teleportTokenConfirm(ev) {
    const token = canvas.scene.tokens.get(CONFIG.CELESTUS.teleportTargetId);
    if (!token) return;
    // get canvas position
    let center = ev.data.getLocalPosition(canvas.getLayerByEmbeddedName("Token"));
    center.x = parseInt(center.x - token.object.w / 2);
    center.y = parseInt(center.y - token.object.h / 2);
    const dest = canvas.grid.getSnappedPoint(center, {
        mode: CONST.GRID_SNAPPING_MODES.CENTER,
        resolution: 2,
    });

    // update token position
    await token.update(dest, {
        animate: false,
        teleport: true,
    });

    teleporting = false;
    // remove listeners
    canvas.stage.off('mousedown', teleportTokenConfirm);
    canvas.stage.off('mousemove', teleportTokenCursor);
    canvas.app.view.oncontextmenu = null;
    // remove teleport cursor
    canvas.effects.removeChild(CONFIG.CELESTUS.teleportCursor);
}

/**
 * Moves teleport cursor
 * @param {Event} ev 
 */
function teleportTokenCursor(ev) {
    // get canvas position
    const center = ev.data.getLocalPosition(canvas.getLayerByEmbeddedName("Token"));
    // update teleport cursor position
    const snapped = canvas.grid.getSnappedPoint(center, {
        mode: CONST.GRID_SNAPPING_MODES.CENTER,
        resolution: 2,
    });
    CONFIG.CELESTUS.teleportCursor.x = snapped?.x ?? 0;
    CONFIG.CELESTUS.teleportCursor.y = snapped?.y ?? 0;
}

/**
 * Cancels token teleport command
 * @param {Event} ev 
 */
function teleportTokenCancel(ev) {
    ui.notifications.notify("CELESTUS | Canceled teleport operation");
    teleporting = false;
    // remove listeners
    canvas.stage.off('mousedown', teleportTokenConfirm);
    canvas.stage.off('mousemove', teleportTokenCursor);
    canvas.app.view.oncontextmenu = null;
    // remove teleport cursor
    canvas.effects.removeChild(CONFIG.CELESTUS.teleportCursor);
}

/**
 * awaits some amount of time in ms
 * @param {Number} ms 
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || DEF_DELAY));
}

/**
 * rotates teleport cursor
 */
async function teleportTicker() {
    while (teleporting) {
        await sleep(20);
        CONFIG.CELESTUS.teleportCursor.rotation += CONFIG.CELESTUS.teleportCursorRotationSpeed;
    }
}

/**
 * Teleport Token for hook keybinding
 * @param {Token?} token optional token to teleport
 */
export function teleportTokenStart(token) {
    if (token) {
        CONFIG.CELESTUS.teleportTargetId = token.id;
    }
    else {
        const t = canvas.tokens.controlled[0];
        if (t) {
            CONFIG.CELESTUS.teleportTargetId = t.id;
        }
        else {
            return ui.notifications.warn("CELESTUS | Please select a token to teleport");
        }
    }
    ui.notifications.notify("CELESTUS | Starting teleport operation, left click to confirm");
    teleporting = true;
    // turn on event listeners
    canvas.stage.on('mousedown', teleportTokenConfirm);
    canvas.stage.on('mousemove', teleportTokenCursor);
    canvas.app.view.oncontextmenu = teleportTokenCancel;
    // render teleport cursor
    CONFIG.CELESTUS.teleportCursor.width = canvas.scene.grid.size;
    CONFIG.CELESTUS.teleportCursor.height = canvas.scene.grid.size;
    canvas.effects.addChild(CONFIG.CELESTUS.teleportCursor);
    teleportTicker();
}

/**
 * Displays or removes the boss health bar
 * @param {Event} event 
 * @param {Boolean} active 
 */
export function toggleBossBar() {
    if (game.celestus.bossId) {
        deactivateBoss();
    }
    else {
        activateBoss();
    }
}