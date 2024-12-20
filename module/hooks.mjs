const RED = '#e29292';
const GREEN = '#92e298';
const BLUE = '#92c6e2';

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
            html.find(".dice-total").css('background-color', BLUE);
        }
        else if (total > msg.getFlag("celestus", "hitThreshold"))
        {
            html.find(".dice-total").css('background-color', GREEN);
        }
        else
        {
            html.find(".dice-total").css('background-color', RED);
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
    if (msg.system.isDamage) {
        // add damage type to damage text
        const dieTotal = html.find(".dice-total");
        dieTotal.html(dieTotal.html() + ` (${CONFIG.CELESTUS.damageTypes[msg.system.damageType].label})`)
        dieTotal.append(`<i class=${CONFIG.CELESTUS.damageTypes[msg.system.damageType].glyph}></i>`);
        dieTotal.css("background-color", CONFIG.CELESTUS.damageTypes[msg.system.damageType].color);
        // only gm can apply damage
        if (game.user.isGM)
        {
            let dmgTotal = 0;
            for (let roll of msg.rolls) {
                dmgTotal += roll.total;
            }
            console.log(html.find("dice-total"));
            html.append(`<button data-damage-total="${dmgTotal}" data-damage-type="${msg.system.damageType}" class=\"apply-damage\">Apply Damage</button>`);
        }
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
            const sign = damage > 0 ? "" : "+";
            damage *= -1;
            // set html
            $(this).html(sign + damage.toString());
            // set background based on healing or harming
            $(this).css("background-color", (damage < 0) ? RED : GREEN)
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