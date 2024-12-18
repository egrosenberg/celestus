const BASE_AS = 10; // base ability score value

/**
 * Calculates stat bonuses and totals for the actor
 */
export async function calcModifiers(actor)
{
    // update ability score modifiers
    // iterate through abilities
    for (let [key, value] of Object.entries(actor.system.abilities))
    {
        // calculate modifier
        let total = value.value + value.bonus - BASE_AS;
        let modifier = total * CONFIG.CELESTUS.abilityMod[key];
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

    console.log("CELESTUS  | Updated modifiers");
}

/**
 * 
 * @param {event} e : event from button click, should contain info about actor/item uuid
 */
export async function rollAttack(e)
{
    // extract actor and item from event
    const actorID = e.currentTarget.dataset.actoruuid;
    const actor = await fromUuid(actorID);
    const itemID = e.currentTarget.dataset.itemuuid;
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
    const critThresh = actor.system.crit_chance;
    // part of determining wether an attack hits
    const accuracy = actor.system.attributes.accuracy;

    // roll an attack for each target
    for (const target of targets) {
        const tActor = target.actor;
        const evasion = tActor.system.attributes.evasion;

        // threshold needed to roll to count as a hit
        const hitThresh = evasion + (1 - accuracy);

        let r = new Roll("1d100",{},{flavor: `${actor.name} attacking ${tActor.name}`});
        r.toMessage({speaker: {alias: actor.name}});
    }
}

/**
 * 
 * @param {event} e : event from button click, should contain info about actor/item uuid
 */
export async function rollDamage(e)
{
    console.log(e);
    
    // extract actor and item from event
    const actorID = e.currentTarget.dataset.actoruuid;
    const actor = await fromUuid(actorID);
    const itemID = e.currentTarget.dataset.itemuuid;
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
        await r.toMessage({speaker: {alias: actor.name}})
    }
}