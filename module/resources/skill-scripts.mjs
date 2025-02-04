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
            await origin.update({ "system.resources.phys_armor.flat": newPhys });
            await origin.update({ "system.resources.mag_armor.flat": newMag });
        }
    },
    /**
     * Restores all magic armor on targets
     */
    oceanBless: async function (origin, targets) {
        for (const target of targets) {
            await target.actor.update({ "system.resources.mag_armor.flat": target.actor.system.resources.mag_armor.max });
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
            const dist = Math.sqrt((active.x - token.x) ** 2 + (active.y - token.y) ** 2) * scale;
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
                        value: `+${count * 0.1}`
                    }
                ]
            }])
        }
    },
    /**
     * Swap vitality percentages of origin and target
     * (error if more than one target, error if target has phys armor)
     */
    vitalExchange: async function (origin, targets) {
        if (targets.length !== 1) return ui.notifications.warn("CELESTUS | Only select one target to swap hp percents with (don't select the source actor)");
        const target = targets[0].actor;
        if (!target) return ui.notifications.error("CELESTUS | Target token has no actor");
        // check for physical armor
        if (target.system.resources.phys_armor.value > 0) return ui.notifications.warn("CELESTUS | Vital Exchange target has physical armor present");
        // calculate percentages
        const percentOrigin = Math.max(origin.system.resources.hp.flat / origin.system.resources.hp.max, 0);
        const percentTarget = Math.max(target.system.resources.hp.flat / target.system.resources.hp.max, 0);
        // update to corresponding percentages
        await origin.update({ "system.resources.hp.flat": Math.round(origin.system.resources.hp.max * percentTarget) });
        await target.update({ "system.resources.hp.flat": Math.round(target.system.resources.hp.max * percentOrigin) });
    },
    /**
     * Draw a 15-foot radius template around each token with the dead condition
     */
    massCorpseplosion: async function (origin, targets) {
        // throw error if no canvas scene
        if (!canvas.scene) return ui.notifications.warn("CELESTUS | No active scene to draw templates on");
        // find active token
        const active = origin.getActiveTokens()?.[0];
        if (!active) return ui.notifications.warn("CELESTUS | Unable to find token to use skill");

        const maxDist = 60;

        // iterate through all tokens on canvas
        for (const token of canvas.scene.tokens) {
            // only draw template if token is dead
            if (!token.actor.effects.find(e => e.name === "Dead")) continue;
            // check if token is within 60 feet of origin
            const dist = canvas.scene.grid.measurePath([active.center, token.object.center]);
            if (dist.distance > maxDist) continue;
            // check if point is within vision
            if (!canvas.visibility.testVisibility(token.object.center, { object: active })) continue;
            // prepare base template
            const templateData = {
                user: game.user?.id,
                x: token.object.center.x,
                y: token.object.center.y,
                distance: 15,
                fillColor: "#ffffff",
                t: "circle",
                flags: { celestus: { clearThis: true } },
            };

            // create template
            const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
                parent: canvas.scene,
            });

            await canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [
                template.toObject(),
            ]);
        }
    }
}