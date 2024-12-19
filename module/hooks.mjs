const BASE_AS = 10; // base ability score value

/**
 * Calculates stat bonuses and totals for the actor
 */
export async function calcModifiers(actor) {
    // update ability score modifiers
    // iterate through abilities
    for (let [key, value] of Object.entries(actor.system.abilities))
    {
        // calculate modifier
        let total = value.value + value.bonus - BASE_AS;
        let modifier = total * CONFIG.CELESTUS.abilityMod[key];
        modifier += CONFIG.CELESTUS.baseAbilityMod[key];
        // update modifier value
        await actor.update({ [`system.abilities.${key}.mod`]: modifier});
    }

    // update damage bonus modifiers
    // iterate through damage types
    for (let [key, value] of Object.entries(actor.system.attributes.damage))
    {
        // get combat skill name to use for damage bonus
        const cSkill = CONFIG.CELESTUS.damageTypes[key].skill;
        // calculate modifier
        let total = actor.system.combat[cSkill].value + actor.system.combat[cSkill].bonus;
        let modifier = total * CONFIG.CELESTUS.combatSkillMod;
        // update modifier value
        await actor.update({ [`system.attributes.damage.${key}`]: modifier});
    }

    // calculate health
    const hpMod = actor.system.abilities.con.mod;
    const missingHP = actor.system.resources.hp.max - actor.system.resources.hp.value;
    let maxHP = CONFIG.CELESTUS.maxHP[actor.system.attributes.level] * (1 + hpMod);
    await actor.update({"system.resources.hp.max": parseInt(maxHP) });
    await actor.update({"system.resources.hp.value": parseInt(maxHP - missingHP) });
    
    // calculate crit chance
    const witMod = actor.system.abilities.wit.mod;
    await actor.update({"system.attributes.crit_chance": witMod})

    console.log("CELESTUS  | Updated modifiers");
}

/**
 * 
 * @param {event} e : event from button click, should contain info about actor/item uuid
 */
export async function rollAttack(e) {
    // extract actor and item from event
    const actorID = e.currentTarget.dataset.actorUuid;
    const actor = await fromUuid(actorID);
    const itemID = e.currentTarget.dataset.itemUuid;
    const item = await fromUuid(itemID);

    // check for targets
    const targets = game.user.targets;
    // verify targets amount
    if (targets.size > item.system.targets.max || targets.size < item.system.targets.min)
    {
        const targetError = new Dialog({
            title: "Invalid Targets",
            content: `Please select an appropriate amount of targets for the spell (between ${item.system.targets.min} and ${item.system.targets.max})`,
            buttons: {
                button1:
                {
                    label: "Ok",
                    icon: `<i class="fas fa-check"></i>`
                }
            }
        }).render(true);
        return;
    }

    // threshold needed to exceed to count as a crit
    const critThresh = 100 - (actor.system.attributes.crit_chance * 100);
    // part of determining wether an attack hits
    const accuracy = actor.system.attributes.accuracy;

    // roll an attack for each target
    for (const target of targets) {
        const tActor = target.actor;
        const evasion = tActor.system.attributes.evasion;

        // threshold needed to roll to count as a hit
        const hitThresh = 100 * (evasion + (1 - accuracy));

        let r = new Roll("1d100",{},{flavor: `${actor.name} attacking ${tActor.name}`});
        r.toMessage({
            speaker: {alias: actor.name},
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

    // iterate through damage array
    for (let part of item.system.damage )
    {
        // damage type
        const type = part.type;
        const ability = item.system.ability;
    
        // base damage roll corresponding to actor level
        const base = CONFIG.CELESTUS.baseDamage.formula[actor.system.attributes.level];
        // base damage multiplier percent
        const baseMul = part.value;
        // elemental damage bonus percentage
        const elementBonus = actor.system.attributes.damage[type];
        // bonus from ability associated with skill
        const abilityBonus = actor.system.abilities[ability].mod;

        const r = new Roll(`floor(((${base})[${type}] * (${baseMul}) * (1 + ${elementBonus}) * (1 + ${abilityBonus})))`)
        await r.toMessage({
            speaker: {alias: actor.name},
            'system.isDamage': true,
            'system.damageType': type
        });
    }
}

/**
 * 
 * @param {event} e : event from button click
 */
export async function applyDamageHook (e) {
    const damage = e.currentTarget.dataset.damageTotal;
    const type = e.currentTarget.dataset.damageType;

    const selected = canvas.tokens.controlled;
    // iterate through each controlled token
    for (const token of selected)
    {
        token.actor.applyDamage(damage, type);
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
        // get roll toal (in case there are modifiers for some reason)
        let total = 0;
        for (let roll of msg.rolls) {
            total += roll.total;
        }
        // change color based on hit, miss, or crit
        console.log(msg.getFlag("celestus", "critThreshold"));
        if (total > msg.getFlag("celestus", "critThreshold"))
        {
            html.find(".dice-total").css('background-color', '#92c6e2');
        }
        else if (total > msg.getFlag("celestus", "hitThreshold"))
        {
            html.find(".dice-total").css('background-color', '#92e298');
        }
        else
        {
            html.find(".dice-total").css('background-color', '#e29292');
        }
    }
    // if message is a skill usage, add attack / damage buttons for owners
    if (msg.system.isSkill) {
        const actor = await fromUuid(msg.system.actorID);
        const perms = actor.ownership;
        // check if player has owner access on token associated with message
        if (perms.default >= 3 || ((game.user.id in perms) && perms[game.user.id] >= 3)) {
            // add attack button if there is an attack
            if (msg.system.skill.hasAttack) {
                html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="attack">Roll Attack</button>`)
            }
            // add damage button if there is a damage roll
            if (msg.system.skill.hasDamage) {
                html.append(`<button data-item-uuid="${msg.system.itemID}" data-actor-uuid="${msg.system.actorID}" class="damage">Roll Damage</button>`)
            }
        }
    }
    if (game.user.isGM && msg.system.isDamage) {
        let dmgTotal = 0;
        for (let roll of msg.rolls) {
            dmgTotal += roll.total;
        }
        console.log(html.find("dice-total"));
        html.append(`<button data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" class=\"apply-damage\">Apply Damage</button>`);
    }
}