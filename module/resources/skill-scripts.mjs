/**
 * Object containing scripts to run when executing skills
 * each script has the same signature
 * @param {Actor} origin: actor that is using the skill
 * @param {Token[]} targets: array of tokens to target with the skill
 */
export const scripts = {
    skinGraft: async function (origin, targets) {
        // reset all cooldowns
        for (const item of origin.items) {
            if (item.type === "skill" && item.system.type !== "civil" && item.system.cooldown.max > 0) {
                await item.update({ "system.cooldown.value": 0 });
            }
        }
    }
}