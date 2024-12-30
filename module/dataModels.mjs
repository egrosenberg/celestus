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
export class PlayerData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            biography: new HTMLField(), // create biography field
            // configure resources
            resources: new SchemaField({
                // configure health as a schema field
                hp: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total hp value
                    flat: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current hp value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 })  // max hp value
                }),
                // configure armor as a schema field
                phys_armor: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total armor value
                    flat: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current armor
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // max armor value
                    temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // temporary armor (from skills)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // misc. bonus max armor
                }),
                // configure magic armor as a schema field
                mag_armor: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total armor value
                    flat: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current armor
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // max armor value
                    temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // temporary armor (from skills)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // misc. bonus max armor
                }),
                ap: new SchemaField({ // action points
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 4 }), // current ap amount
                    max: new NumberField({ required: true, integer: true, min: 4, initial: 6 }), // max ap amount
                    start: new NumberField({ required: true, integer: true, min: 4, initial: 4 }), // starting ap amount
                }),
                jiriki: new SchemaField({ // jiriki points
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
                unspentPoints: new NumberField({ required: true, integer: true, initial: 0 }), // derived
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

    /**
     * finds and returns equipped items
     * @returns {undefined | Object} object containing slots for each type of equipped item
     */
    get equipped() {
        const rings = this.parent.items.filter(i => (i.type === "armor" && i.system.equipped && i.system.slot == "ring"));
        const equippedWeapons = this.parent.items.filter(i => (i.type == "weapon" && i.system.equipped));
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
            helmet: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "helmet")),
            chest: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "chest")),
            gloves: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "gloves")),
            leggings: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "leggings")),
            boots: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "boots")),
            amulet: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "amulet")),
            ring1: rings[0],
            ring2: rings[1],
            belt: this.parent.items.find(i => (i.type === "armor" && i.system.equipped && i.system.slot == "belt")),
            left: leftHand,
            right: rightHand,
        };
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
        else if (equipped.left.system.twoHanded || !equipped.right) {
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
};



/**
 * Defines data model for skills
 * @extends { TypeDataModel }
 */
export class SkillData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description: new HTMLField(), // skill description
            ap: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // action point cost
            jp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // jiriki point cost
            cooldown: new SchemaField({ // cooldown in rounds negative value means inf
                value: new NumberField({ required: true, integer: true, min: -1, initial: 0 }),
                max: new NumberField({ required: true, integer: true, min: -1, initial: 0 }),
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
        if (this.type === "weapon" && this.parent.actor && this.parent.actor.system.equipped.left) {
            return this.parent.actor.system.equipped.left.system.range;
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
        if (this.type === "weapon" && this.parent.actor && this.parent.actor.system.equipped.left) {
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
        return super.defineSchema();
    }

    /**
     * getter to get max armor values from armor
     * @returns {Object} containing phys and mag values for armor granted from this armor
     */
    get value() {
        // if no type, return 0s
        if (this.type === "none") {
            return { phys: 0, mag: 0 };
        }
        // get actor level if it exists
        const level = this.parent.actor ? this.parent.actor.system.attributes.level : 1;
        return {
            phys: CONFIG.CELESTUS.baseArmor[this.type][this.slot][level].phys * this.efficiency,
            mag: CONFIG.CELESTUS.baseArmor[this.type][this.slot][level].mag * this.efficiency,
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
        const mult = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency) : 1;
        return {
            type: this.type,
            min: Math.floor(dice * mult),
            max: Math.floor(dice * dmgDie * mult),
            avg: Math.floor(dice * (dmgDie / 2 + 0.5) * mult),
            roll: `${dice}d${dmgDie}*${mult}`,
        };
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
            combines: new ArrayField( new SchemaField({ // effect it combos with
                    with: new StringField({ required: true, initial: "none" }), // status id of status it combos with
                    makes: new StringField({ required: true, initial: "none " }) // status id of status the two create
                })
            ),
            removes: new ArrayField( // statuses it removes
                new StringField ()
            ),
            blocks: new ArrayField( // statuses it prevents from ebing applied
                new StringField ()
            ),
            triggers: new ArrayField( // statuses it brings with it
                new StringField ()
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
        if (data.statuses && data.statuses.legnth > 0) {
            // check if status is blocked
            for (let effect of actor.effects) {
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
                await actor.toggleStatusEffect(combination.makes, true);
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