const BASE_AS = 10; // base abilitiy score value

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