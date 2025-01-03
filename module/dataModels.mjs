import { calcMult, canvasPopupText } from "./helpers.mjs";

const {
    HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField
} = foundry.data.fields;

/**
 * helper function simplifying equipped armor
 */
function armorSocket() {
    return new SchemaField({
        id: new StringField({}), // _id of item
    });
}

/**
 * Define data model for player character
 * @extends {TypeDataModel}
 */
export class ActorData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            biography: new HTMLField(), // create biography field
            // configure resources
            resources: new SchemaField({
                // configure health as a schema field
                hp: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total hp value
                    flat: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current hp value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),  // max hp value
                    offset: new NumberField({ required: true, integer: true, initial: 0 }), // offset from max hp
                }),
                // configure armor as a schema field
                phys_armor: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total armor value
                    flat: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current armor
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // max armor value
                    temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // temporary armor (from skills)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // misc. bonus max armor
                    offset: new NumberField({ required: true, integer: true, initial: 0 }), // offset from max phys_armor
                }),
                // configure magic armor as a schema field
                mag_armor: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total armor value
                    flat: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current armor
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // max armor value
                    temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // temporary armor (from skills)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // misc. bonus max armor
                    offset: new NumberField({ required: true, integer: true, initial: 0 }), // offset from max mag_armor
                }),
                ap: new SchemaField({ // action points
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 4 }), // current ap amount
                    max: new NumberField({ required: true, integer: true, min: 4, initial: 6 }), // max ap amount
                    start: new NumberField({ required: true, integer: true, min: 4, initial: 4 }), // starting ap amount
                }),
                fp: new SchemaField({ // focus points
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current ap amount
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // max ap amount
                }),
            }),
            attributes: new SchemaField({
                bonuses: new SchemaField({
                    crit_chance: new SchemaField({ // chance to land a crit, expressed as a percentage
                        value: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    }),
                    crit_bonus: new SchemaField({ // damage increase (on top of base) on crit (as percent)
                        value: new NumberField({ required: true, integer: false, min: 0, initial: 1.6 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    }),
                    accuracy: new SchemaField({ // base chance to hit (can go above 1)
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0.95 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    evasion: new SchemaField({ // chance to dodge an attack (expressed as a percent)
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    damage: new SchemaField({ // flat damage bonus
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                }),
                resistance: new SchemaField({ // resitance values, expressed int percentages 
                    physical: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    fire: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    water: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    air: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    earth: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    poison: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    psychic: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    healing: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    phys_armor: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    mag_armor: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    t_phys_armor: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    t_mag_armor: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                }),
                // movement
                movement: new SchemaField({ // movement in map units (default ft)
                    base: new NumberField({ required: true, integer: false, min: 0, initial: 20 }),
                    bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // bonus as additive percent
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                }),
                // xp & level
                xp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                level: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
                unspentPoints: new NumberField({ required: true, integer: true, initial: 0 }), // derived unspent attribute points
                unspentCombat: new NumberField({ required: true, integer: true, initial: 0 }),
                unspentCivil: new NumberField({ required: true, integer: true, initial: 0 }),
                memory: new SchemaField({
                    total: new NumberField({ required: true, integer: true, initial: 0 }), // derived
                    spent: new NumberField({ required: true, integer: true, initial: 0 }), // derived
                }),
            }),
            // combat abilities
            combat: new SchemaField({
                flamespeaker: new SchemaField({ // fire
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                tidecaller: new SchemaField({ // water/ healing
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                stormseeker: new SchemaField({ // air
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                duneshaper: new SchemaField({ // earth / poison
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                voidcantor: new SchemaField({ // psychic (psionics)
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                deathbringer: new SchemaField({ // physical/ lifesteal (will include blood)
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                shroudstalker: new SchemaField({ // rogue, crit, movement (shadow magic)
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                formshifter: new SchemaField({ // polymorph, gives bonus abillity points
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                huntmaster: new SchemaField({ // huntmaster will do something
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
                warlord: new SchemaField({ // increases physical
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                }),
            }),
            // civil abilities
            civil: new SchemaField({
                scoundrel: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                lore: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                nature: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                influence: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
            }),
            // configure ability/attributes
            abilities: new SchemaField({
                str: new SchemaField({ // Strength
                    value: new NumberField({ required: true, integer: false, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // bonus to base value from items/features
                    total: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    label: new StringField({ required: true, initial: "Str" }),
                }),
                dex: new SchemaField({ // Dexterity
                    value: new NumberField({ required: true, integer: false, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // bonus to base value from items/features
                    total: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    label: new StringField({ required: true, initial: "Dex" }),
                }),
                con: new SchemaField({ // Constitution
                    value: new NumberField({ required: true, integer: false, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // bonus to base value from items/features
                    total: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    label: new StringField({ required: true, initial: "Con" }),
                }),
                int: new SchemaField({ // Intellect
                    value: new NumberField({ required: true, integer: false, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // bonus to base value from items/features
                    total: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    label: new StringField({ required: true, initial: "Int" }),
                }),
                mind: new SchemaField({ // Mind
                    value: new NumberField({ required: true, integer: false, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (flat)
                    bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // bonus to base value from items/features
                    total: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    label: new StringField({ required: true, initial: "Mind" }),
                }),
                wit: new SchemaField({ // Wits
                    value: new NumberField({ required: true, integer: false, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (flat)
                    bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // bonus to base value from items/features
                    total: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    label: new StringField({ required: true, initial: "Wit" }),
                }),
            }),
        };
    }

    /** override */
    prepareDerivedData() {
        /**
         * perform final operations
         */
        // add flat misc armor bonuses
        this.resources.phys_armor.max += this.resources.phys_armor.bonus;
        this.resources.mag_armor.max += this.resources.mag_armor.bonus;
        // calculate max hp
        this.resources.hp.max += CONFIG.CELESTUS.maxHP[this.attributes.level];
        /**
         * Perform final additive operations
         */
        // final unspent skill points update for formshifter
        this.attributes.unspentPoints += this.combat.formshifter.value * 2;
        // calculate memory
        this.attributes.memory.total += parseInt(Math.floor((this.attributes.level) / 2) + (this.abilities.mind.value) - 7);
        // calculate modifiers
        // ability scores
        for (let [key, ability] of Object.entries(this.abilities)) {
            ability.mod += ((ability.total - CONFIG.CELESTUS.baseAttributeScore) * CONFIG.CELESTUS.abilityMod[key]) + CONFIG.CELESTUS.baseAbilityMod[key];
        }
        // combat abilities
        for (let [key, ability] of Object.entries(this.combat)) {
            ability.mod += ability.value * 0.05;
        }
        // calculate crit chance
        this.attributes.bonuses.crit_chance.value += this.abilities.wit.mod + this.attributes.bonuses.crit_chance.bonus;
        // calculate crit bonus
        this.attributes.bonuses.crit_bonus.value += 1 + CONFIG.CELESTUS.baseCritBonus + this.attributes.bonuses.crit_bonus.bonus + this.combat.shroudstalker.mod;
        // calculate accuracy
        this.attributes.bonuses.accuracy.value += CONFIG.CELESTUS.baseAccuracy + this.attributes.bonuses.accuracy.bonus;
        // calculate evasion
        this.attributes.bonuses.evasion.value += this.attributes.bonuses.evasion.bonus;
        // calculate overall damage bonus
        this.attributes.bonuses.damage.value += this.attributes.bonuses.damage.bonus;
        // calculate movespeed
        this.attributes.movement.value += this.attributes.movement.base;

        /**
         * Perform multiplicative operations
         */
        // con operations
        this.resources.phys_armor.max *= 1 + this.abilities.con.mod;
        this.resources.mag_armor.max *= 1 + this.abilities.con.mod;
        this.resources.hp.max *= 1 + this.abilities.con.mod;
        // ensure all resources are back to int
        this.resources.phys_armor.max = parseInt(this.resources.phys_armor.max);
        this.resources.mag_armor.max = parseInt(this.resources.mag_armor.max);
        this.resources.hp.max = parseInt(this.resources.hp.max);
        // movespeed
        this.attributes.movement.value *= (1 + this.attributes.movement.bonus);

        /**
         * calculate final flat values from offsets
         */
        for (const key of ["hp", "phys_armor", "mag_armor"]) {
            const resource = this.resources[key];
            resource.flat = resource.max + resource.offset;
            // cap resource at max
            resource.flat = Math.min(resource.flat, resource.max);
        }

        /**
        * derive final resource values for display
        */
        this.resources.hp.value = this.resources.hp.flat;
        this.resources.phys_armor.value = this.resources.phys_armor.flat + this.resources.phys_armor.temp;
        this.resources.mag_armor.value = this.resources.mag_armor.flat + this.resources.mag_armor.temp;
    }

    /**
     * finds and returns all armor
     * @returns {undefined | Object} object containing each armor item for each armor slot
     */
    get armor() {
        return {
            helmet: this.parent.items.filter(i => (i.type === "armor" && i.system.slot == "helmet")),
            chest: this.parent.items.filter(i => (i.type === "armor" && i.system.slot == "chest")),
            gloves: this.parent.items.filter(i => (i.type === "armor" && i.system.slot == "gloves")),
            leggings: this.parent.items.filter(i => (i.type === "armor" && i.system.slot == "leggings")),
            boots: this.parent.items.filter(i => (i.type === "armor" && i.system.slot == "boots")),
            amulet: this.parent.items.filter(i => (i.type === "armor" && i.system.slot == "amulet")),
            ring: this.parent.items.filter(i => (i.type === "armor" && i.system.slot == "ring")),
            belt: this.parent.items.filter(i => (i.type === "armor" && i.system.slot == "belt")),
        };
    }

    /**
     * finds and returns all weapons
     * @returns {undefined | Object} object containing each weapon
     */
    get weapon() {
        return this.parent.items.filter(i => i.type === "weapon");
    }
    /**
     * finds and returns all offhands
     */
    get offhand() {
        return this.parent.items.filter(i => i.type === "offhand");
    }
    /**
     * Finds and returns all effects on character
     * @returns {Object} with categories for different states of effect
     */
    get effects() {
        return {
            temporary: this.parent.effects.filter(e => (!e.disabled && e.isTemporary)),
            passive: this.parent.effects.filter(e => (!e.disabled && !e.isTemporary)),
            disabled: this.parent.effects.filter(e => e.disabled),
        };
    }

    /**
     * Calculates damage bonuses for elements
     * @returns {Object} with keys = to all damage types and values = to percent damage multiplier (additive)
     */
    get elementBonus() {
        let bonuses = {};
        for (let [key, type] of Object.entries(CONFIG.CELESTUS.damageTypes)) {
            if (key === "none") {
                bonuses[key] = 0;
                continue;
            }
            bonuses[key] = this.combat[type.skill].value * CONFIG.CELESTUS.combatSkillMod;
        }
        return bonuses;
    }

    /**
     * all features owned by actor
     */
    get features() {
        let features = {};
        for (let [type, label] of Object.entries(CONFIG.CELESTUS.featureTypes)) {
            features[type] = this.parent.items.filter(i => (i.type === "feature" && i.system.type === type));
        }
        return features;
    }
};


/**
 * Define data model for player character
 * @extends {ActorData}
 */
export class PlayerData extends ActorData {
    static defineSchema() {
        let schema = super.defineSchema();
        return schema;
    }

    /** @override */
    prepareDerivedData() {
        /**
         * Zero out all derived data
         */
        // zero out ability score related things
        for (let [key, ability] of Object.entries(this.abilities)) {
            ability.mod = 0;
            ability.total = ability.bonus;
        }
        this.attributes.unspentPoints = 0;
        // zero out combat ability stuff
        for (let [key, ability] of Object.entries(this.combat)) {
            ability.value = ability.bonus;
            ability.mod = 0;
        }
        // zero out civil ability stuff
        for (let [key, ability] of Object.entries(this.civil)) {
            ability.value = ability.bonus;
        }
        // zero out damage resists
        for (let [key, damageType] of Object.entries(this.attributes.resistance)) {
            damageType.value = 0;
        }
        // zero out generic bonuses
        for (let [key, bonus] of Object.entries(this.attributes.bonuses)) {
            bonus.value = 0;
        }
        // zero out memory related things
        this.attributes.memory.total = 0;
        this.attributes.memory.spent = 0;
        // zero out armor totals
        this.resources.phys_armor.max = 0;
        this.resources.mag_armor.max = 0;
        this.resources.hp.max = 0;

        /**
         * perform item operations
         */
        let spentPoints = 0;
        for (let [key, ability] of Object.entries(this.abilities)) {
            spentPoints += ability.value - CONFIG.CELESTUS.baseAttributeScore;
            ability.total += ability.value;
        }
        this.attributes.unspentPoints += (this.attributes.level * 2) + CONFIG.CELESTUS.baseAbilityPoints - spentPoints;
        // calculage ability bonus from enlightened
        if (this.parent.getFlag("celestus", "enlightened")) {
            for (let [ability, value] of Object.entries(CONFIG.CELESTUS.enlightenedBonus[this.attributes.level])) {
                this.abilities[ability].bonus += value;
                this.abilities[ability].total += value;
            }
        }
        // update combat ability values
        let spentCombat = 0;
        for (let [key, ability] of Object.entries(this.combat)) {
            // calculate total
            ability.value += ability.base;
            spentCombat += ability.base;
        }
        this.attributes.unspentCombat = this.attributes.level + CONFIG.CELESTUS.baseAbilityPoints - spentCombat;
        let spentCivil = 0;
        // update civil ability values
        for (let [key, ability] of Object.entries(this.civil)) {
            // calculate total
            ability.value += ability.base;
            spentCivil += ability.base;
        }
        this.attributes.unspentCivil = Math.floor(this.attributes.level / 3) + CONFIG.CELESTUS.baseAbilityPoints - spentCivil;
        // update base damage resists
        for (let [key, damageType] of Object.entries(this.attributes.resistance)) {
            damageType.value += damageType.bonus;
        }

        // iterate through items
        for (const item of this.parent.items) {
            // check if item is an armor piece and equipped
            if (item.type === "armor" && item.system.equipped) {
                // calculate armor values
                const phys = item.system.value.phys;
                const mag = item.system.value.mag;
                // increase max armor
                this.resources.phys_armor.max += item.system.value.phys;
                this.resources.mag_armor.max += item.system.value.mag;
                // apply bonuses
                for (let [ability, value] of Object.entries(item.system.bonuses.combat)) {
                    this.combat[ability].bonus += value;
                    this.combat[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.civil)) {
                    this.civil[ability].bonus += value;
                    this.civil[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.abilities)) {
                    this.abilities[ability].bonus += value;
                    this.abilities[ability].total += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.resistance)) {
                    this.attributes.resistance[ability].value += value;
                }
            }
            else if ((item.type === "weapon" || item.type === "feature") && item.system.equipped) {
                // apply bonuses
                for (let [ability, value] of Object.entries(item.system.bonuses.combat)) {
                    this.combat[ability].bonus += value;
                    this.combat[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.civil)) {
                    this.civil[ability].bonus += value;
                    this.civil[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.abilities)) {
                    this.abilities[ability].bonus += value;
                    this.abilities[ability].total += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.resistance)) {
                    this.attributes.resistance[ability].value += value;
                }
            }
            else if (item.type === "offhand" && item.system.equipped) {
                // increase max armor
                this.resources.phys_armor.max += item.system.value.phys;
                this.resources.mag_armor.max += item.system.value.mag;
                // apply bonuses
                for (let [ability, value] of Object.entries(item.system.bonuses.combat)) {
                    this.combat[ability].bonus += value;
                    this.combat[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.civil)) {
                    this.civil[ability].bonus += value;
                    this.civil[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.abilities)) {
                    this.abilities[ability].bonus += value;
                    this.abilities[ability].total += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.resistance)) {
                    this.attributes.resistance[ability].value += value;
                }
            }
            else if (item.type === "skill" && item.system.memorized === "true") {
                this.attributes.memory.spent += item.system.memSlots;
            }
        }

        /**
         * call final operations from super
         */
        super.prepareDerivedData();
    }

    /**
     * finds and returns equipped items
     * @returns {undefined | Object} object containing slots for each type of equipped item
     */
    get equipped() {
        const rings = this.parent.items.filter(i => (i.type === "armor" && i.system.equipped && i.system.slot == "ring"));
        const equippedWeapons = this.parent.items.filter(i => (i.type == "weapon" && i.system.equipped));
        const offhand = this.parent.items.find(i => (i.type === "offhand" && i.system.equipped));
        let leftHand;
        let rightHand;
        if (equippedWeapons.length) {
            leftHand = equippedWeapons[0];
            if (!leftHand.system.twoHanded && equippedWeapons.length > 1) {
                rightHand = equippedWeapons[1];
            }
            else if (leftHand.system.twoHanded) {
                rightHand = leftHand;
            }
        }
        // check for offhand
        if (offhand) {
            if (rightHand) {
                rightHand.update({ "system.equipped": false });
            }
            rightHand = offhand;
        }
        return {
            helmet: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "helmet")),
            chest: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "chest")),
            gloves: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "gloves")),
            belt: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "belt")),
            leggings: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "leggings")),
            boots: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "boots")),
            amulet: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "amulet")),
            ring1: rings[0],
            ring2: rings[1],
            left: leftHand,
            right: rightHand,
        };
    }

    /**
     * Calculates weapon damage
     * @returns {false|Array[Object]} false if no weapon or array of damage info objects from equipped weapons
     */
    get weaponDamage() {
        const equipped = this.equipped;
        // return early if no equipped weapons
        if (!equipped.left) {
            return false;
        }
        // two weapon
        else if (equipped.left.system.twoHanded || !equipped.right || equipped.right.type === "offhand") {
            return [equipped.left.system.damage];
        }
        // two single handed
        else {
            const left = equipped.left.system.damage;
            const right = equipped.right.system.damage;
            return [left, right];
        }
    }

    /**
     * All skills owned by actor
     * @returns {Object} containing all skills, categorized as memorized, unmemorized, and always
     */
    get skills() {
        return {
            memorized: this.parent.items.filter(i => (i.type === "skill", i.system.memorized === "true")),
            unmemorized: this.parent.items.filter(i => (i.type === "skill", i.system.memorized === "false")),
            always: this.parent.items.filter(i => (i.type === "skill", i.system.memorized === "always")),
        };
    }

}

/**
 * @extends {ActorData}
 */
export class NpcData extends ActorData {
    static defineSchema() {
        let schema = super.defineSchema();
        schema.abilitySpread = new SchemaField(Object.keys((({ none, ...o }) => o)(CONFIG.CELESTUS.abilities)).reduce((obj, ability) => {
            obj[ability] = new NumberField({ required: true, min: 0, initial: 0 });
            return obj;
        }, {}));
        schema.armorSpread = new SchemaField({
            phys: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            mag: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        });
        schema.armorBoost = new NumberField({ required: true, min: 0, initial: 1 });
        schema.dmgBoost = new NumberField({ required: true, min: 0, initial: 1 });
        schema.spread = new StringField({ required: true, initial: "custom" });
        return schema;
    }

    /** @override */
    prepareDerivedData() {
        /**
         * Zero out all derived data
         */
        // zero out ability score related things
        for (let [key, ability] of Object.entries(this.abilities)) {
            ability.mod = 0;
            ability.total = ability.bonus;
        }
        this.attributes.unspentPoints = 0;
        // zero out combat ability stuff
        for (let [key, ability] of Object.entries(this.combat)) {
            ability.value = ability.bonus;
            ability.mod = 0;
        }
        // zero out civil ability stuff
        for (let [key, ability] of Object.entries(this.civil)) {
            ability.value = ability.bonus;
        }
        // zero out damage resists
        for (let [key, damageType] of Object.entries(this.attributes.resistance)) {
            damageType.value = 0;
        }
        // zero out generic bonuses
        for (let [key, bonus] of Object.entries(this.attributes.bonuses)) {
            bonus.value = 0;
        }
        // zero out memory related things
        this.attributes.memory.total = 0;
        this.attributes.memory.spent = 0;
        // zero out armor totals
        this.resources.phys_armor.max = 0;
        this.resources.mag_armor.max = 0;
        this.resources.hp.max = 0;

        // calculate attribute scores
        for (let [key, value] of Object.entries(this.abilitySpread)) {
            this.abilities[key].total += Math.round(CONFIG.CELESTUS.baseAttributeScore + value * CONFIG.CELESTUS.npcAttributeScalar * this.attributes.level);
        }

        // calculate combat abilities
        for (let [key, ability] of Object.entries(this.combat)) {
            ability.value += Math.round(CONFIG.CELESTUS.npcAbilityBase + ability.base * CONFIG.CELESTUS.npcAbilityScalar * this.attributes.level);
        }
        // calculate civil abilities
        for (let [key, ability] of Object.entries(this.civil)) {
            ability.value += Math.round(CONFIG.CELESTUS.npcAbilityBase + ability.base * CONFIG.CELESTUS.npcAbilityScalar * this.attributes.level);
        }

        // calculate armor
        this.resources.phys_armor.max += Math.round(this.armorSpread.phys * CONFIG.CELESTUS.npcArmorScalar * (CONFIG.CELESTUS.e ** this.attributes.level) * this.armorBoost);
        this.resources.mag_armor.max += Math.round(this.armorSpread.mag * CONFIG.CELESTUS.npcArmorScalar * (CONFIG.CELESTUS.e ** this.attributes.level) * this.armorBoost);

        // call final derivations from super
        super.prepareDerivedData();
    }
    /**
     * All skills owned by actor
     * @returns {Object} containing all skills, categorized as memorized, unmemorized, and always
     */
    get skills() {
        return this.parent.items.filter(i => (i.type === "skill"));
    }

    get equipped() {
        const equippedWeapons = this.weapon;
        let leftHand;
        let rightHand;
        if (equippedWeapons.length) {
            leftHand = equippedWeapons[0];
            if (!leftHand.system.twoHanded && equippedWeapons.length > 1) {
                rightHand = equippedWeapons[1];
            }
            else if (leftHand.system.twoHanded) {
                rightHand = leftHand;
            }
        }
        return {
            left: leftHand,
            right: rightHand,
        };
    }

    /**
     * @returns 
     */
    get weaponDamage() {
        const equipped = this.equipped;
        // return early if no equipped weapons
        if (!equipped.left) {
            return false;
        }
        // two weapon
        else if (equipped.left.system.twoHanded || !equipped.right || equipped.right.type === "offhand") {
            return [equipped.left.system.damage];
        }
        // two single handed
        else {
            const left = equipped.left.system.damage;
            const right = equipped.right.system.damage;
            return [left, right];
        }
    }
}

/**
 * Defines data model for skills
 * @extends { TypeDataModel }
 */
export class SkillData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description: new HTMLField(), // skill description
            ap: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // action point cost
            fp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // focus point cost
            cooldown: new SchemaField({ // cooldown in rounds negative value means inf
                value: new NumberField({ required: true, integer: true, min: -1, initial: 0 }),
                max: new NumberField({ required: true, integer: true, min: -1, initial: 0 }),
            }),
            components: new SchemaField({
                verbal: new BooleanField({ required: true, initial: false }),
                somatic: new BooleanField({ required: true, initial: false }),
                material: new BooleanField({ required: true, initial: false }),
                materialFull: new StringField({ required: true, initial: "" }),
            }),
            memorized: new StringField({ required: true, initial: "false" }),
            type: new StringField({ required: true, initial: "magic" }),
            memSlots: new NumberField({ required: true, integer: true, min: 0, initial: 1 }), // memory slot cost
            prereqs: new SchemaField({ // prerequisite combat skill values to memorize
                flamespeaker: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                tidecaller: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                stormseeker: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                duneshaper: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                voidcantor: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                deathbringer: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                shroudstalker: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                formshifter: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                huntmaster: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                warlord: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            }),
            damage: new ArrayField(new SchemaField({
                type: new StringField({ required: true, initial: "none" }), // damage type
                value: new NumberField({ required: true, integer: false, initial: 0 }), // damage roll as %of base@lvl
            })),
            ability: new StringField({ required: true, initial: "none" }), // int/dex/str - ability used for scaling of damage
            attack: new BooleanField({ required: true, initial: false }),
            targets: new SchemaField({ // amount of targets required/allowed
                min: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            }),
            range: new NumberField({ required: true, initial: 0 }), // range of skill use, 0ft = self, 5ft = melee
            statusEffects: new ArrayField(new StringField()),
        };
    }

    /**
     * calculates final range value
     * @returns {Number}
     */
    get finalRange() {
        if (this.type === "weapon" && this.parent.actor?.weaponDamage?.left) {
            return this.parent.actor.weaponDamage.left.range;
        }
        else {
            return this.range;
        }
    }
    /**
     * calculates final ability modifier value
     * @returns {Number}
     */
    get finalAbility() {
        if (this.type === "weapon" && this.parent?.actor?.system?.equipped?.left) {
            return this.parent.actor.system.equipped.left.system.ability;
        }
        else {
            return this.ability;
        }
    }
    /**
     * Finds and returns all effects on character
     * @returns {Object} with categories for different states of effect
     */
    get effects() {
        return {
            temporary: this.parent.effects.filter(e => (!e.disabled && e.isTemporary)),
            passive: this.parent.effects.filter(e => (!e.disabled && !e.isTemporary)),
            disabled: this.parent.effects.filter(e => e.disabled),
        };
    }
    /**
     * checks if skill is usable
     * @returns {false|String} false if not disabled, string containing status message if disabled
     */
    get disabled() {
        const actor = this.parent.actor;
        // dont disable if no actor
        if (!actor) {
            return false;
        }
        // can't use skills while incapacitated
        if (actor.getFlag("celestus", "incapacitated")) {
            return "actor is incapacitated";
        }
        // check if skill on cooldown
        if (this.cooldown.value > 0 || this.cooldown.value < 0) {
            return "on cooldown";
        }
        // check if skill is memorized
        if (this.memorized === "false" && actor.type === "player") {
            return "not memorized";
        }
        // dont use civil skills in combat?
        if (this.type === "civil" && actor.inCombat) {
            return "can't use civil skill in combat";
        }
        // dont use skills that require verbal component if actor is silenced
        if (this.components.verbal && actor.getFlag("celestus", "silenced")) {
            return "actor is silenced";
        }
        // special cases for weapon skills
        if (this.type === "weapon") {
            // needs a weapon to use a weapon skill
            if (!actor.system.equipped.left) {
                return "requires a weapon";
            }
            // cant use weapon skills while disarmed
            if (actor.getFlag("celestus", "disarmed")) {
                return "actor is disarmed";
            }
        }
        // check if actor has available AP or FP
        if (this.ap > actor.system.resources.ap.value) {
            return "insufficent action points available";
        }
        if (this.fp > actor.system.resources.fp.value) {
            return "insufficent focus points available";
        }
        return false;
    }
};

/**
 * Defines data model for all gear items
 * @extends { TypeDataModel }
 */
export class GearData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // equiped or not
            equipped: new BooleanField({ required: true, initial: false }),
            // html description of armor
            description: new HTMLField(),
            // type of armor (robes (int) / light (dex) / heavy (str))
            type: new StringField({ required: true, initial: "none" }),
            // slot of armor (helmet / chest / gloves / leggings / boots)
            slot: new StringField({ required: true, initial: "none" }),
            // effeciency stat multiplies by base value for that slot and type
            efficiency: new NumberField({ required: true, integer: false, initial: 1 }),
            bonuses: new SchemaField({
                // combat abilities
                combat: new SchemaField({
                    flamespeaker: new NumberField({ required: true, integer: true, initial: 0 }),
                    tidecaller: new NumberField({ required: true, integer: true, initial: 0 }),
                    stormseeker: new NumberField({ required: true, integer: true, initial: 0 }),
                    duneshaper: new NumberField({ required: true, integer: true, initial: 0 }),
                    voidcantor: new NumberField({ required: true, integer: true, initial: 0 }),
                    deathbringer: new NumberField({ required: true, integer: true, initial: 0 }),
                    shroudstalker: new NumberField({ required: true, integer: true, initial: 0 }),
                    formshifter: new NumberField({ required: true, integer: true, initial: 0 }),
                    huntmaster: new NumberField({ required: true, integer: true, initial: 0 }),
                    warlord: new NumberField({ required: true, integer: true, initial: 0 }),
                }),
                civil: new SchemaField({
                    scoundrel: new NumberField({ required: true, integer: true, initial: 0 }),
                    lore: new NumberField({ required: true, integer: true, initial: 0 }),
                    nature: new NumberField({ required: true, integer: true, initial: 0 }),
                    influence: new NumberField({ required: true, integer: true, initial: 0 }),
                }),
                abilities: new SchemaField({
                    str: new NumberField({ required: true, integer: true, initial: 0 }),
                    dex: new NumberField({ required: true, integer: true, initial: 0 }),
                    con: new NumberField({ required: true, integer: true, initial: 0 }),
                    int: new NumberField({ required: true, integer: true, initial: 0 }),
                    mind: new NumberField({ required: true, integer: true, initial: 0 }),
                    wit: new NumberField({ required: true, integer: true, initial: 0 }),
                }),
                resistance: new SchemaField({
                    physical: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    fire: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    water: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    air: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    earth: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    poison: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    psychic: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    healing: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    phys_armor: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    mag_armor: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    t_phys_armor: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    t_mag_armor: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                }),
            }),
            // prerequisite stats
            prereqs: new SchemaField({
                str: new NumberField({ required: true, integer: true, initial: 0 }),
                dex: new NumberField({ required: true, integer: true, initial: 0 }),
                con: new NumberField({ required: true, integer: true, initial: 0 }),
                int: new NumberField({ required: true, integer: true, initial: 0 }),
                mind: new NumberField({ required: true, integer: true, initial: 0 }),
                wit: new NumberField({ required: true, integer: true, initial: 0 }),
            }),
        };
    }
    /**
     * Finds and returns all effects on character
     * @returns {Object} with categories for different states of effect
     */
    get effects() {
        return {
            temporary: this.parent.effects.filter(e => (!e.disabled && e.isTemporary)),
            passive: this.parent.effects.filter(e => (!e.disabled && !e.isTemporary)),
            disabled: this.parent.effects.filter(e => e.disabled),
        };
    }
};


/**
 * Defines data model for all armor items
 * @extends { TypeDataModel }
 */
export class ArmorData extends GearData {
    static defineSchema() {
        let schema = super.defineSchema();
        schema.spread = new StringField({ required: true, initial: "none" }),
            schema.base = new SchemaField({
                phys: new NumberField({ required: true, integer: true, initial: 0 }),
                mag: new NumberField({ required: true, integer: true, initial: 0 }),
            })
        return schema;
    }

    /**
     * getter to get max armor values from armor
     * @returns {Object} containing phys and mag values for armor granted from this armor
     */
    get value() {
        // if no slot, return 0s
        if (this.slot === "none") {
            return { phys: 0, mag: 0 };
        }
        // get actor level if it exists
        const level = this.parent?.actor?.system.attributes.level ?? 1;
        const scalar = CONFIG.CELESTUS.armor.scalars[this.slot] ?? 0;
        return {
            phys: Math.round((this.base.phys * scalar / 100.0) * (CONFIG.CELESTUS.e ** level)),
            mag: Math.round((this.base.mag * scalar / 100.0) * (CONFIG.CELESTUS.e ** level)),
        }
    }
}

/**
 * Defines data model for all weapon items
 * @extends { TypeDataModel }
 */
export class WeaponData extends GearData {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.twoHanded = new BooleanField({ required: true, initial: false });
        schema.ability = new StringField({ required: true, initial: "str" });
        schema.type = new StringField({ required: true, initial: "physical" });
        schema.range = new NumberField({ required: true, initial: 0 }); // range in feet
        return schema;
    }

    /**
     * Calculate damage roll based on actor level
     * @returns {Object} containing min, max, average, and roll formula for base damage of this weapon
     */
    get damage() {
        // get actor level if it exists
        const level = this.parent.actor ? this.parent.actor.system.attributes.level : 1;
        const dice = Math.floor(Math.pow(CONFIG.CELESTUS.weaponDmgBase, level));
        const dmgDie = this.twoHanded ? 12 : 6;
        let mult = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency) : 1;
        mult *= 1 + ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        mult = mult.toFixed(2);
        return {
            type: this.type,
            min: Math.floor(dice * mult),
            max: Math.floor(dice * dmgDie * mult),
            avg: Math.floor(dice * (dmgDie / 2 + 0.5) * mult),
            roll: `${dice}d${dmgDie}*${mult}`,
        };
    }

}

/** @extends {GearData} */
export class OffhandData extends GearData {
    static defineSchema() {
        let schema = super.defineSchema();
        schema.spread = new StringField({ required: true, initial: "none" }),
            schema.base = new SchemaField({
                phys: new NumberField({ required: true, integer: true, initial: 0 }),
                mag: new NumberField({ required: true, integer: true, initial: 0 }),
            })
        return schema;
    }

    /**
     * getter to get max armor values from item
     * @returns {Object} containing phys and mag values for armor granted from this item
     */
    get value() {
        // get actor level if it exists
        const level = this.parent.actor ? this.parent.actor.system.attributes.level : 1;
        const scalar = CONFIG.CELESTUS.offhand.scalar;
        return {
            phys: Math.round((this.base.phys * scalar / 100.0) * (CONFIG.CELESTUS.e ** level)),
            mag: Math.round((this.base.mag * scalar / 100.0) * (CONFIG.CELESTUS.e ** level)),
        }
    }
}


/**
 * Defines data structure for active effects
 * @extends {ActiveEffectData}
 */
export class EffectData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            damage: new ArrayField(new SchemaField({
                type: new StringField({ required: true, initial: "none" }), // damage type
                value: new NumberField({ required: true, integer: false, initial: 0 }), // damage roll as %of base@lvl
            })),
            // armor type that resists the effect, none/mag/phys/any
            resistedBy: new StringField({ required: true, initial: "none" }),
            combines: new ArrayField(new SchemaField({ // effect it combos with
                with: new StringField({ required: true, initial: "none" }), // status id of status it combos with
                makes: new StringField({ required: true, initial: "none " }) // status id of status the two create
            })
            ),
            removes: new ArrayField( // statuses it removes
                new StringField()
            ),
            blocks: new ArrayField( // statuses it prevents from ebing applied
                new StringField()
            ),
            triggers: new ArrayField( // statuses it brings with it
                new StringField()
            ),
        }
    }

    /** @override */
    async _preCreate(data, options, user) {
        const pre = await super._preCreate();
        if (pre === false) {
            return false;
        }
        // get actor this is trying to attach to
        const actor = this.parent.parent;
        // check if status is resisted by armor
        let resisted = false;
        if (!data.system) {
            return;
        }
        switch (data.system.resistedBy) {
            case "phys":
                if (actor.system.resources.phys_armor.value > 0) resisted = true;
                break;
            case "mag":
                if (actor.system.resources.mag_armor.value > 0) resisted = true;
                break;
            case "any":
                if (actor.system.resources.phys_armor.value > 0 || actor.system.resources.mag_armor.value > 0) resisted = true;
        }
        if (resisted === true) {
            canvasPopupText(actor, `Resisted ${data.name}`);
            return false;
        }

        // check if status is blocked if a statuseffect exists
        if (data.statuses && data.statuses.length > 0) {
            // check if status is blocked
            for (let effect of actor.effects) {
                console.log(effect.system.blocks);
                if (effect.system.blocks.find(b => b === data.statuses[0])) {
                    canvasPopupText(actor, `${data.name} blocked by ${effect.name}`);
                    return false;
                }
            }
        }
        // check if status needs to combine
        for (let combination of data.system.combines) {
            // check all effects on actor for status in combination
            let combiner = actor.effects.find(e => e.statuses.has(combination.with));
            // second incredient exists, combine
            if (combiner) {
                combiner.delete();
                const product = await actor.toggleStatusEffect(combination.makes, { active: true });
                if (typeof product != "boolean") {
                    product.update({ "origin": this.parent.parent.uuid });
                }
                return false;
            }
        }
        // removes all things the status clears
        for (let status of data.system.removes) {
            let target = actor.effects.find(e => e.statuses.has(status));
            if (target) {
                target.delete();
            }
        }
        // removes all things the status blocks
        for (let status of data.system.blocks) {
            let target = actor.effects.find(e => e.statuses.has(status));
            if (target) {
                target.delete();
            }
        }
        // if status has no duration, instantly remove it after applying its combinations and blocks
        if (data.duration.rounds === 0) {
            await canvasPopupText(actor, data.name);
            return false;
        }
    }
}

/** 
 * Defines important data fields for chat messages
 * @extends {TypeDataModel}
 */
export class ChatDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            actorID: new StringField(),
            itemID: new StringField(),
            isDamage: new BooleanField({ required: true, initial: false }),
            isAttack: new BooleanField({ required: true, initial: false }),
            damageType: new StringField(),
            isSkill: new BooleanField({ required: true, initial: false }),
            skill: new SchemaField({
                hasAttack: new BooleanField({ required: true, initial: false }),
                hasDamage: new BooleanField({ required: true, initial: true }),
            }),
        };
    }
}

/**
 * @extends {GearData}
 */
export class CelestusFeature extends GearData {
    static defineSchema() {
        let schema = super.defineSchema();
        return schema;
    }
}


/**
 * Data model for quick references
 * @extends { TypeDataModel }
 */
export class ReferenceData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // html description of armor
            description: new HTMLField()
        }
    }
}