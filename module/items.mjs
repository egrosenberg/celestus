import { calcMult } from "./helpers.mjs";

/**
 * Extends the basic item class for skills
 * @extends {Item}
 */
export class CelestusItem extends Item {
    /**
     * Prepare derived data
     */
    prepareData() {

    }

    /**
     * prepare data object for rolls
     * @override
     */
    getRollData() {
        // populate with system data
        const rollData = { ...super.getRollData() };
        rollData.config = CONFIG.CELESTUS;

        // return if no parent actor
        if (!this.actor) return rollData;

        // calculate damage if skill
        if (this.type === "skill") {
            let damage = {
                formula: "",
                min: 0,
                max: 0,
                avg: 0,
            };
            let first = true;
            for (let part of this.system.damage) {
                if (!first) {
                    damage.formula += " + "
                }
                else {
                    first = false;
                }
                const mult = calcMult(this.actor, part.type, this.system.ability, part.value, 0) * part.value;
                damage.formula += `((${CONFIG.CELESTUS.baseDamage.formula[this.actor.system.attributes.level]})*${part.value})[${part.type}]`;
                const min = parseInt(CONFIG.CELESTUS.baseDamage.min[this.actor.system.attributes.level] * mult);
                const max = parseInt(CONFIG.CELESTUS.baseDamage.max[this.actor.system.attributes.level] * mult);
                const avg = parseInt(CONFIG.CELESTUS.baseDamage.avg[this.actor.system.attributes.level] * mult);
                damage.min += min;
                damage.max += max;
                damage.avg += avg;
                // itemized type
                if (!damage[part.type]) {
                    damage[part.type] = {
                        min: 0,
                        max: 0,
                        avg: 0,
                    };
                }
                damage[part.type].min += min;
                damage[part.type].max += max;
                damage[part.type].avg += avg;
            }

            rollData.dmg = damage;
        }
        if (this.type === "armor") {
            if (this.system.type !== "none") {
                const phys = CONFIG.CELESTUS.baseArmor[this.system.type][this.system.slot][this.actor.system.attributes.level].phys * this.system.efficiency;
                const mag = CONFIG.CELESTUS.baseArmor[this.system.type][this.system.slot][this.actor.system.attributes.level].mag * this.system.efficiency;
                rollData.armor = { phys: phys, mag: mag };

            }
        }

        // add actor's roll data
        rollData.actor = this.actor.getRollData();

        return rollData;
    }

    /**
     * handle clickable rolls
     * @param {Event} event: The originating click event
     * @private
     */
    async roll() {
        if (this.type === "skill") {
            // get actor
            const actor = this.parent;
            // call roll skill
            actor.useSkill(this);
        }
    }
}