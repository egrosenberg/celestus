/**
 * Object containing scripts to run when executing skills
 * each script has the same signature
 * @param {Actor} origin: actor that is using the skill
 * @param {Token[]} targets: array of tokens to target with the skill
 */
export const scripts = {
    /**
     * Resets all cooldowns of combat skills that have positive cooldowns
     */
    skinGraft: async function (origin, targets) {
        for (const item of origin.items) {
            if (item.type === "skill" && item.system.type !== "civil" && item.system.cooldown.max > 0) {
                await item.update({ "system.cooldown.value": 0 });
            }
        }
    },
    /**
     * Restore armor equal to the values granted by the equipped shield
     */
    shieldsUp: async function (origin, targets) {
        const equipped = origin.system.equipped;
        if (equipped.right?.type === "offhand") {
            // get base values
            const armor = equipped.right.system.value;
            console.log(armor);
            const cPhys = origin.system.resources.phys_armor;
            const cMag = origin.system.resources.mag_armor;
            // calculate new values
            const newPhys = Math.min(cPhys.flat + armor.phys, cPhys.max);
            const newMag = Math.min(cMag.flat + armor.mag, cMag.max);
            // update values
            await origin.update({"system.resources.phys_armor.flat": newPhys});
            await origin.update({"system.resources.mag_armor.flat": newMag});
        }
    },
    /**
     * Restores all magic armor on targets
     */
    oceanBless: async function (origin, targets) {
        for (const target of targets) {
            await target.actor.update({"system.resources.mag_armor.flat": target.actor.system.resources.mag_armor.max});
        }
    },
    /**
     * Create an effect on the origin actor based on the amount of creature surrounding it
     */
    thickOfIt: async function (origin, targets) {
        const active = origin.getActiveTokens()?.[0];
        if (!active) return;
        let count = 0;
        const scene = active.scene;
        const scale = scene.grid.distance / scene.grid.size;
        for (const token of scene.tokens) {
            const dist = Math.sqrt((active.x - token.x)**2 + (active.y - token.y)**2) * scale;
            if (dist <= 15) count++;
        }
        if (count > 0) {
            await origin.createEmbeddedDocuments("ActiveEffect", [{
                name: "In The Thick Of It",
                img: "icons/skills/social/diplomacy-unity-alliance.webp",
                type: "status",
                duration: { rounds: 3 },
                origin: origin.uuid,
                changes: [
                    {
                        key: "system.attributes.bonuses.damage.bonus",
                        mode: 2,
                        value: `+${count*0.1}`
                    }
                ]
            }])
        }
    },
}