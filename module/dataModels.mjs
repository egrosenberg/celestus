import { calcMult, calcWeaponDamage, canvasPopupText } from "./helpers.mjs";
import { updateBossResources } from "./hooks.mjs";

const {
    HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, ObjectField
} = foundry.data.fields;



/**
 * Define data model for player character
 * @extends {TypeDataModel}
 */
export class ActorData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            biography: new HTMLField(), // create biography field
            t: new StringField({ required: true, initial: "humanoid" }),
            pointerTint: new StringField({ required: true, default: "#fff" }),
            portraitBorder: new BooleanField({ required: true, initial: true }),
            size: new StringField({required: true, initial: "medium"}),
            // configure resources
            resources: new SchemaField({
                // configure health as a schema field
                hp: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total hp value
                    flat: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current hp value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),  // max hp value
                    offset: new NumberField({ required: true, integer: true, initial: 0 }), // offset from max hp
                    percent: new NumberField({ required: true, integer: false, initial: 1 }), // current hp as percent of max hp, decimal percent
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
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 6 }), // max ap amount
                    start: new NumberField({ required: true, integer: true, min: 0, initial: 4 }), // starting ap amount
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
                    lifesteal: new SchemaField({ // heal from damage done
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    initiative: new SchemaField({ // bonus to initiative rolls
                        value: new NumberField({ required: true, integer: true, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: true, initial: 0 }),
                    }),
                }),
                resistance: new SchemaField(Object.keys((({ none, ...o }) => o)(CONFIG.CELESTUS.damageTypes)).reduce((obj, type) => {
                    obj[type] = new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // derived
                        bonus: new NumberField({ required: true, integer: false, min: -50, initial: 0 }),
                        base: new NumberField({ required: true, integer: false, min: -50, initial: 0 }),
                    })
                    return obj;
                }, {})),
                statusImmune: new SchemaField(CONFIG.statusEffects.reduce((obj, status) => {
                    obj[status.id] = new BooleanField({ required: true, initial: false });
                    return obj;
                }, {})),
                // language proficiencies
                languages: new SchemaField(Object.keys(CONFIG.CELESTUS.languages).reduce((obj, language) => {
                    obj[language] = new BooleanField({ required: true, initial: language === "Common" });
                    return obj;
                }, {})),
                // movement
                movement: new SchemaField({ // movement in map units (default ft)
                    base: new NumberField({ required: true, integer: false, min: 0, initial: 20 }),
                    bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }), // bonus as additive percent
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                }),
                // reach
                reach: new SchemaField({
                    base: new NumberField({ required: true, integer: true, initial: 5 }),
                    bonus: new NumberField({ required: true, integer: true, initial: 0 }),
                }),
                // xp & level
                xp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                level: new NumberField({ required: true, integer: true, min: 1, max: 20, initial: 1 }),
                unspentPoints: new NumberField({ required: true, integer: true, initial: 0 }), // derived unspent attribute points
                unspentCombat: new NumberField({ required: true, integer: true, initial: 0 }),
                unspentCivil: new NumberField({ required: true, integer: true, initial: 0 }),
                memory: new SchemaField({
                    total: new NumberField({ required: true, integer: true, initial: 0 }), // derived
                    spent: new NumberField({ required: true, integer: true, initial: 0 }), // derived
                }),
                exhaustion: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            }),
            // combat abilities
            combat: new SchemaField(Object.keys((({ none, ...o }) => o)(CONFIG.CELESTUS.combatSkills)).reduce((obj, ability) => {
                if (CONFIG.CELESTUS.combatSkills[ability]?.ignore) return obj;
                obj[ability] = new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, max: CONFIG.CELESTUS.abilityMax, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), //derived
                })
                return obj;
            }, {})),
            // civil abilities
            civil: new SchemaField(Object.keys((({ none, ...o }) => o)(CONFIG.CELESTUS.civilSkills)).reduce((obj, ability) => {
                if (CONFIG.CELESTUS.combatSkills[ability]?.ignore) return obj;
                obj[ability] = new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, max: CONFIG.CELESTUS.abilityMax, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                })
                return obj;
            }, {})),
            // configure ability/attributes
            abilities: new SchemaField(Object.keys((({ none, ...o }) => o)(CONFIG.CELESTUS.abilities)).reduce((obj, ability) => {
                obj[ability] = new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, max: CONFIG.CELESTUS.attributeMax, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                    total: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                    label: new StringField({ required: true, initial: ability }),
                });
                return obj;
            }, {})),
            // money / other currencies
            currency: new SchemaField({
                gold: new NumberField({ required: true, initial: 0, integer: true }),
                silver: new NumberField({ required: true, initial: 0, integer: true }),
                copper: new NumberField({ required: true, initial: 0, integer: true }),
            })
        };
    }

    /** override */
    prepareDerivedData() {
        let bonusMovement = 0;
        let bonusHP = 0;
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
            }
            else if (item.type === "offhand" && item.system.equipped) {
                // increase max armor
                this.resources.phys_armor.max += item.system.value.phys;
                this.resources.mag_armor.max += item.system.value.mag;
            }
            else if (item.type === "skill" && item.system.memorized === "true") {
                this.attributes.memory.spent += item.system.memSlots;
            }

            if (item.type !== "skill" && item.system.equipped) {
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
                for (let [type, value] of Object.entries(item.system.bonuses.resistance)) {
                    this.attributes.resistance[type].value += value;
                }
                for (let status of item.system.bonuses.statusImmune) {
                    if (typeof this.attributes.statusImmune[status] !== "undefined") {
                        this.attributes.statusImmune[status] = true;
                    }
                }
                this.attributes.bonuses.crit_chance.value += item.system.bonuses.crit_chance;
                this.attributes.bonuses.crit_bonus.value += item.system.bonuses.crit_bonus;
                this.attributes.bonuses.accuracy.value += item.system.bonuses.accuracy;
                this.attributes.bonuses.initiative.value += item.system.bonuses.initiative;
                this.attributes.bonuses.evasion.value += item.system.bonuses.evasion;
                bonusMovement += item.system.bonuses.movement;
                bonusHP += item.system.bonuses.hp;
            }
        }
        // iterate through resistances
        for (let [type, resist] of Object.entries(this.attributes.resistance)) {
            this.attributes.resistance[type].value += resist.bonus + resist.base;
        }

        /**
         * perform final operations
         */
        // check for inspired bonus
        if (this.parent.getFlag("celestus", "inspired")) {
            for (let ability of CONFIG.CELESTUS.inspiredAttributes) {
                this.abilities[ability].total += 1 + parseInt(this.attributes.level * CONFIG.CELESTUS.inspiredScalar);
                this.abilities[ability].bonus += 1 + parseInt(this.attributes.level * CONFIG.CELESTUS.inspiredScalar);
            }
        }
        // subtract from attributes based on exhaustion
        for (let [key, ability] of Object.entries(this.abilities)) {
            // lone wolf modification
            if (this.parent.getFlag("celestus", "lone-wolf")) {
                let spent = ability.value - CONFIG.CELESTUS.baseAttributeScore;
                spent = Math.min(spent * 2, CONFIG.CELESTUS.attributeMax - CONFIG.CELESTUS.baseAttributeScore);
                ability.total += spent + CONFIG.CELESTUS.baseAttributeScore - ability.value;
            }
            ability.total -= this.attributes.exhaustion;
            ability.bonus -= this.attributes.exhaustion;
        }
        // add flat misc armor bonuses
        this.resources.phys_armor.max += this.resources.phys_armor.bonus;
        this.resources.mag_armor.max += this.resources.mag_armor.bonus;
        // calculate max hp
        this.resources.hp.max += CONFIG.CELESTUS.maxHP[this.attributes.level];
        /**
         * Perform final additive operations
         */
        // final unspent skill points update for formshifter
        this.attributes.unspentPoints += this.combat.formshifter.value;
        // calculate memory
        this.attributes.memory.total += parseInt(Math.floor((this.attributes.level) / 2) + (this.abilities.mind.total) - 7);
        // calculate modifiers
        // ability scores
        for (let [key, ability] of Object.entries(this.abilities)) {
            ability.mod += ((ability.total - CONFIG.CELESTUS.baseAttributeScore) * CONFIG.CELESTUS.abilityMod[key]) + CONFIG.CELESTUS.baseAbilityMod[key];
        }
        // combat abilities
        for (let [key, ability] of Object.entries(this.combat)) {
            const mult = CONFIG.CELESTUS.combatSkills[key]?.modOverride ?? CONFIG.CELESTUS.combatSkillMod;
            ability.mod += ability.value * mult;
        }
        // calculate lifesteal
        this.attributes.bonuses.lifesteal.value += this.combat.deathbringer.mod + this.attributes.bonuses.lifesteal.bonus;
        // calculate crit chance
        this.attributes.bonuses.crit_chance.value += this.abilities.wit.mod + this.attributes.bonuses.crit_chance.bonus;
        this.attributes.bonuses.crit_chance.value += (this.weaponType === "ranged") ? this.combat.ranged.mod : 0;
        // calculate crit bonus
        this.attributes.bonuses.crit_bonus.value += 1 + CONFIG.CELESTUS.baseCritBonus + this.attributes.bonuses.crit_bonus.bonus + this.combat.shroudstalker.mod;
        this.attributes.bonuses.crit_bonus.value += (this.weaponType === "twohand") ? this.combat.twohand.mod : 0;
        // calculate accuracy
        this.attributes.bonuses.accuracy.value += CONFIG.CELESTUS.baseAccuracy + this.attributes.bonuses.accuracy.bonus;
        this.attributes.bonuses.accuracy.value += (this.weaponType === "onehand") ? this.combat.onehand.mod : 0;
        // calculate evasion
        this.attributes.bonuses.evasion.value += this.attributes.bonuses.evasion.bonus;
        this.attributes.bonuses.evasion.value += (this.weaponType === "dualwield") ? this.combat.dualwield.mod : 0;
        // calculate overall damage bonus
        this.attributes.bonuses.damage.value += this.attributes.bonuses.damage.bonus;
        // calculate movespeed
        this.attributes.movement.value += this.attributes.movement.base;

        /**
         * Perform multiplicative operations
         */
        // con operations
        // increase armor if actor has natural armor
        if (this.parent.getFlag("celestus", "natural-armor")) {
            this.resources.phys_armor.max *= 1 + (this.abilities.con.mod * CONFIG.CELESTUS.naturalArmorScale);
            this.resources.mag_armor.max *= 1 + (this.abilities.con.mod * CONFIG.CELESTUS.naturalArmorScale);
        }
        this.resources.hp.max *= 1 + this.abilities.con.mod;
        this.resources.hp.max += bonusHP;
        if (this.parent.getFlag("celestus", "durable")) {
            this.resources.hp.max *= CONFIG.CELESTUS.durableMult;
        }
        // lone wolf modifiers
        if (this.parent.getFlag("celestus", "lone-wolf")) {
            this.resources.ap.start += CONFIG.CELESTUS.loneWolf.ap;
            this.resources.ap.max += CONFIG.CELESTUS.loneWolf.ap;
            this.resources.hp.max *= CONFIG.CELESTUS.loneWolf.hpMult;
            this.resources.phys_armor.max *= CONFIG.CELESTUS.loneWolf.armorMult;
            this.resources.mag_armor.max *= CONFIG.CELESTUS.loneWolf.armorMult;
        }
        // ensure all resources are back to int
        this.resources.phys_armor.max = parseInt(this.resources.phys_armor.max);
        this.resources.mag_armor.max = parseInt(this.resources.mag_armor.max);
        this.resources.hp.max = parseInt(this.resources.hp.max);
        // movespeed
        this.attributes.movement.value *= (1 + this.attributes.movement.bonus) * (1 + this.combat.shroudstalker.mod);
        this.attributes.movement.value += bonusMovement;
        this.attributes.movement.value = Math.round(this.attributes.movement.value);

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
            helmet: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "helmet")),
            chest: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "chest")),
            gloves: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "gloves")),
            leggings: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "leggings")),
            boots: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "boots")),
            amulet: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "amulet")),
            ring: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "ring")),
            belt: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "belt")),
            other: this.parent.items.filter(i => (i.type === "armor" && i.system.slot === "none")),
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
     * finds and returns all consumable items
     */
    get consumable() {
        return this.parent.items.filter(i => i.type === "consumable");
    }
    /**
     * finds and returns all runes
     */
    get rune() {
        return this.parent.items.filter(i => i.type === "rune");
    }
    /**
     * finds and returns all loot
     */
    get loot() {
        return this.parent.items.filter(i => i.type === "loot");
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
            if (type.ignore) {
                bonuses[key] = 0;
                continue;
            }
            bonuses[key] = this.combat[type.skill].mod ?? 0;
        }
        return bonuses;
    }

    /**
     * Retrieves total damage riders from all effects
     * @returns {Object[]} type, value
     */
    get damageRiders() {
        let riders = [];
        for (const effect of this.parent.effects) {
            if (effect.active && effect.system?.damageRiders?.length) {
                for (const damage of effect.system.damageRiders) {
                    riders.push({
                        type: damage.type,
                        value: damage.value,
                    });
                }
            }
        }
        return riders;
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

    /**
     * categorizes combat abilities
     */
    get combatAbilities() {
        return {
            weapon: Object.entries(this.combat).filter(s => CONFIG.CELESTUS.combatSkills[s[0]]?.type === "weapon"),
            skill: Object.entries(this.combat).filter(s => CONFIG.CELESTUS.combatSkills[s[0]]?.type === "skill"),
        };
    }

    /**
     * checks what type of weapon(s) the actor is using
     * @returns {String} skill to use for weapons equipped
     */
    get weaponType() {
        const equipped = this.equipped;
        // no weapons equipped
        if (!equipped.left) return null;
        // check if there is an item in offhand
        if (equipped.right) {
            if (equipped.right.type !== "weapon") {
                // if not a weapon in right hand, left hand must be singlehanded
                return "onehand";
            }
            // check if two handed
            else if (equipped.right.system.twoHanded) {
                // single two handed weapon sharing both slots
                if (equipped.right.system.range === 0) {
                    // melee weapon, use twohand
                    return "twohand";
                }
                else {
                    // ranged weapon, use ranged
                    return "ranged";
                }
            }
            else {
                // singlehanded weapon in offhand, must be dual wielding
                return "dualwield";
            }
        }
        else {
            // right hand empty, must be single left hand
            return "onehand";
        }
    }

    /**
     * check actor's reach in feet
     */
    get reach() {
        const weapon = this.equipped.left;
        if (weapon?.system.reach) return this.attributes.reach.base + this.attributes.reach.bonus + 5;
        return this.attributes.reach.base + this.attributes.reach.bonus;
    }

    /**
     * Calculates bonus damage for weapons
     * @returns {false|Array[Object]} false if no weapon or array of damage info objects from equipped weapons
     */
    get bonusWeaponDamage() {
        const equipped = this.equipped;
        // return early if no equipped weapons
        if (!equipped.left) {
            return false;
        }
        // one weapon
        else if (equipped.left.system.twoHanded || !equipped.right || equipped.right.type === "offhand") {
            return [equipped.left.system.bonusDamage];
        }
        // two single handed
        else {
            const left = equipped.left.system.bonusDamage;
            const right = equipped.right.system.bonusDamage;
            return [left, right];
        }
    }

    /**
     * Gets status apply rolls from equipped weapons
     * @returns {false|Array[Object]} false if no weapon or array of damage status effect rolls
     */
    get weaponStatusRolls() {
        const equipped = this.equipped;
        // return early if no equipped weapons
        if (!equipped.left) {
            return false;
        }
        // one weapon
        else if (equipped.left.system.twoHanded || !equipped.right || equipped.right.type === "offhand") {
            return [equipped.left.system.statusApplyRolls];
        }
        // two single handed
        else {
            const left = equipped.left.system.statusApplyRolls;
            const right = equipped.right.system.statusApplyRolls;
            return [left, right];
        }
    }

    /**
     * All skills owned by actor, uncategorized
     * @returns {Item[]}
     */
    get allSkills() {
        return this.parent.items.filter(i => i.type === "skill");
    }

    /**
     * Calculates total damage from all equipped weapons and effects
     * @returns {undefined | Object} containing types breakdown of damage and total damage {total, parts}
     */
    get totalWeaponDamage() {
        return calcWeaponDamage(this.parent, 1, false);
    }

    /**
     * Compiles all "You can always..." options from features
     * @returns {String[]}
     */
    get youCanAlways() {
        const features = this.parent.items.filter(i => i.type === "feature");
        const always = [];
        for (const feature of features) {
            for (const option of feature.system.canAlways) {
                always.push(option);
            }
        }
        return always;
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
            // check for lone wolf bonus
            let base = ability.base;
            if (this.parent.getFlag("celestus", "lone-wolf") && key !== "formshifter") {
                base *= 2;
                base = Math.min(CONFIG.CELESTUS.abilityMax, base);
            }
            // calculate total
            ability.value += base;
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
        // one weapon
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
        const skills = {
            memorized: this.parent.items.filter(i => (i.type === "skill", i.system.memorized === "true")),
            always: this.parent.items.filter(i => (i.type === "skill", i.system.memorized === "always")),
        };
        if (this.parent.getFlag("celestus", "eiditic")) {
            skills.eiditic = this.parent.items.filter(i => (i.type === "skill", i.system.memorized === "false", i.system.type === "civil"));
            skills.unmemorized = this.parent.items.filter(i => (i.type === "skill", i.system.memorized === "false" && i.system.type !== "civil"));
        }
        else {
            skills.unmemorized = this.parent.items.filter(i => (i.type === "skill", i.system.memorized === "false"));
        }
        return skills;
    }

    /** 
     * Information about known skills count and max
     */
    get knownSkills() {
        const skills = this.skills;
        return {
            count: skills.memorized.length + skills.unmemorized.length + (skills.eiditic ? skills.eiditic.length : 0),
            max: this.attributes.level * 2 + 2
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
        const offhands = this.offhand.filter(o => o.system.equipped === true);
        rightHand = offhands[0] ?? rightHand;
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
            ap: new NumberField({ required: true, integer: true, initial: 0 }), // action point cost
            fp: new NumberField({ required: true, integer: true, initial: 0 }), // focus point cost
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
                lightbringer: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                formshifter: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                huntmaster: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                warlord: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                scoundrel: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                lore: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                nature: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                influence: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                religion: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            }),
            damage: new ArrayField(new SchemaField({
                type: new StringField({ required: true, initial: "none" }), // damage type
                value: new NumberField({ required: true, integer: false, initial: 0 }), // damage roll as %of base@lvl
            })),
            ability: new StringField({ required: true, initial: "none" }), // int/dex/str - ability used for scaling of damage
            attack: new BooleanField({ required: true, initial: false }),
            targets: new SchemaField({ // amount of targets required/allowed
                count: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                type: new StringField({ required: true, initial: "self" }),
                size: new NumberField({ required: true, min: 0, initial: 0 }),
                width: new NumberField({ required: true, min: 5, initial: 5 }),
            }),
            range: new NumberField({ required: true, initial: 0 }), // range of skill use, 0ft = self, 5ft = melee
            statusEffects: new ArrayField(new StringField()), // statusEffects applied by skill
            lifesteal: new NumberField({ required: true, initial: 0 }), // lifesteal that comes from skill
            weaponEfficiency: new NumberField({ required: true, initial: 1 }), // weapon damage scalar for weapon skills
            overridesWeaponDamage: new BooleanField({ required: true, initial: false }),
            overridesWeaponType: new BooleanField({ required: true, initial: false }),
            overridesWeaponRange: new BooleanField({ required: true, initial: false }),
            overrideDamageType: new StringField(),
            itemizeDamage: new BooleanField(), // should the individual damage components be rolled separately
            school: new StringField({ required: true, initial: "none" }), // type of school skill is
            tier: new NumberField({ required: true, integer: true, initial: 0 }),
            hasScript: new BooleanField({ required: true, initial: false }), // toggle for custom script
            scriptId: new StringField({ required: true, initial: "" }), // id of skill script to execute
            aoeLinger: new BooleanField({ required: true, initial: false }),
            linger: new SchemaField({
                duration: new NumberField({ required: true, integer: true, initial: 0 }),
                effects: new BooleanField({ required: true, initial: false }),
                targets: new StringField({ required: true, initial: "any" }),
                targetType: new StringField({ required: true, initial: "humanoid" }),
                clearOnLeave: new BooleanField({ required: true, initial: true }),
                lingerDuration: new NumberField({ required: true, integer: true, initial: 0 }), // 0 = store as non-temp
                surfaceType: new StringField({ required: true, initial: "none" }),
                children: new ArrayField( // array of ids of owned effects created by the aura
                    new StringField()
                ),
                texture: new FilePathField({ categories: ["IMAGE"] }),
            }),
            channelDuration: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
        };
    }

    /**
     * calculates final range value for display
     * @returns {String | false}
     */
    get finalRange() {
        let range = 0
        if (this.type === "weapon" && !this.overridesWeaponRange && this.parent.actor?.system?.equipped?.left) {
            range = this.parent.actor.system.equipped.left.system.range;
        }
        else {
            if (this.type === "magic" && this.parent.actor && this.parent.actor.getFlag("celestus", "farsight")) {
                range = this.range + CONFIG.CELESTUS.farsightBonus;
            }
            else {
                range = this.range;
            }
        }
        if (this.targets.type === "self") {
            return "Self";
        }
        else if (this.targets.type === "none" || this.targets.type === "radius" || this.targets.type === "line") {
            return false;
        }
        else {
            if (range > 0) {
                // include overall range bonus
                if (this.parent.actor?.getFlag("celestus", "rangeBonus")) {
                    range += this.parent.actor.getFlag("celestus", "rangeBonus");
                }
                return `${range} ft.`;
            }
            else {
                return "Touch";
            }
        }
    }
    /**
     * Calculate final AP cost, after any other modifiers
     */
    get finalAP() {
        const actor = this.parent.actor;
        if (!actor) return this.ap;
        let ap = this.ap;
        if (actor.getFlag("celestus", "elementalist")) {
            const standingOn = actor.getFlag("celestus", "standingOn");
            if (CONFIG.CELESTUS.surfaceTypes[standingOn]?.schools?.includes(this.school) && ap > 1) {
                ap--;
            }
        }
        const discount = actor.getFlag("celestus", "apDiscount");
        if (this.type !== "civil" && !isNaN(Number(discount)) && ap > 0) {
            ap -= Math.min(Number(discount), ap - 1);
        }
        return ap;
    }
    /**
     * Calculate final FP cost, after any other modifiers
     */
    get finalFP() {
        const actor = this.parent.actor;
        if (!actor) return this.fp;
        let fp = this.fp;
        const discount = actor.getFlag("celestus", "fpDiscount");
        if (!isNaN(Number(discount)) && fp > 0) {
            fp -= Math.min(Number(discount), fp);
        }
        return Math.max(fp, 0);
    }
    /**
     * prepares targeting mode for display
     * @returns {String | false}
     */
    get targetMode() {
        if (this.targets.type === "self" || this.targets.type === "none") {
            return false;
        }
        const targetType = CONFIG.CELESTUS.targetTypes[this.targets.type];
        if (targetType) {
            if (targetType.options.find(e => e === "size")) {
                return `${this.targets.size} ft. ${targetType.label}`;
            }
            else {
                return `${this.targets.count} ${targetType.label}`;
            }
        }
        else {
            return false;
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
            return "Actor is incapacitated!";
        }
        // check if skill on cooldown
        if (this.cooldown.value > 0 || this.cooldown.value < 0) {
            return "Skill is on cooldown!";
        }
        // check if skill is memorized
        if (this.memorized === "false" && actor.type === "player" && !(this.type === "civil" && actor.getFlag("celestus", "eiditic"))) {
            return "Skill is not memorized!";
        }
        // dont use civil skills in combat?
        if (this.type === "civil" && actor.inCombat) {
            return "Can't use civil skill in combat!";
        }
        // dont use skills that require verbal component if actor is silenced
        if (this.components.verbal && actor.getFlag("celestus", "silenced")) {
            return "actor is silenced";
        }
        // special cases for weapon skills
        if (this.type === "weapon") {
            // needs a weapon to use a weapon skill
            if (!actor.system.equipped.left) {
                return "Requires a weapon!";
            }
            // cant use weapon skills while disarmed
            if (actor.getFlag("celestus", "disarmed")) {
                return "Actor is disarmed!";
            }
        }
        // check if actor has available AP or FP
        if (this.finalAP > actor.system.resources.ap.value) {
            return "Insufficent action points available!";
        }
        if (this.finalFP > actor.system.resources.fp.value) {
            return "Insufficent focus points available!";
        }
        return false;
    }

    // if skill sheet needs a damage field
    get needsDamageField() {
        return (this.type !== "weapon" || this.overridesWeaponDamage)
    }
    // if player should edit the range field
    get needsRangeField() {
        return (this.type !== "weapon" || this.overridesWeaponRange)
    }

    // all prerequisites that are combat abilities
    get combatPrereqs() {
        return Object.entries(this.prereqs).filter(([k, v]) => CONFIG.CELESTUS.combatSkills[k]);
    }
    get civilPrereqs() {
        return Object.entries(this.prereqs).filter(([k, v]) => CONFIG.CELESTUS.civilSkills[k]);
    }

    get totalDamage() {
        const actor = this.parent.actor ?? game.user.character ?? _token?.actor;
        const actorLevel = actor?.system.attributes.level || 1;
        if (this.needsDamageField) {
            let total = {
                min: 0,
                max: 0,
                avg: 0
            };
            let parts = {};
            for (let part of this.damage) {
                const type = part.type;
                if (!parts[type]) {
                    parts[type] = {
                        min: 0,
                        max: 0,
                        avg: 0
                    }
                }
                const mult = actor ? calcMult(actor, part.type, this.ability, part.value, false, 0) : 1;
                const min = parseInt(CONFIG.CELESTUS.baseDamage.min[actorLevel] * mult);
                const max = parseInt(CONFIG.CELESTUS.baseDamage.max[actorLevel] * mult);
                const avg = parseInt(CONFIG.CELESTUS.baseDamage.avg[actorLevel] * mult);

                parts[type].min += min;
                parts[type].max += max;
                parts[type].avg += avg;
                total.min += min;
                total.max += max;
                total.avg += avg;

            }
            return {
                total: total,
                parts: parts
            };
        }
        else {
            if (!actor) return;
            return calcWeaponDamage(this.parent.actor, this.weaponEfficiency, this.overridesWeaponType ? this.overrideDamageType : false);
        }
    }
};

/**
 * Default item fields needed
 * @extends { TypeDataModel }
 */
export class CelestusItemData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description: new HTMLField(),
            type: new StringField({ required: true, initial: "none" }),
            price: new NumberField({ required: true, initial: 0 }),
            quantity: new NumberField({ integer: true, required: true, initial: 1 }),
            weight: new NumberField({ required: true, initial: 0 }),
            rarity: new StringField({ required: true, initial: "Mundane" }),
        }
    }

    /** total price of item(s) */
    get totalPrice() {
        return this.price * this.quantity;
    }

    /** Total weight of item(s) */
    get totalWeight() {
        return this.weight * this.quantity;
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
}

/**
 * Defines data model for all gear items
 * @extends { TypeDataModel }
 */
export class GearData extends CelestusItemData {
    static defineSchema() {
        return foundry.utils.mergeObject(super.defineSchema(), {
            // equiped or not
            equipped: new BooleanField({ required: true, initial: false }),
            // effeciency stat multiplies by base value for that slot and type
            efficiency: new NumberField({ required: true, integer: false, initial: 1 }),
            bonuses: new SchemaField({
                // combat abilities
                combat: new SchemaField(Object.keys((({ none, ...o }) => o)(CONFIG.CELESTUS.combatSkills)).reduce((obj, type) => {
                    if (CONFIG.CELESTUS.combatSkills[type]?.ignore) return obj;
                    obj[type] = new NumberField({ required: true, integer: false, min: 0, initial: 0 });
                    return obj;
                }, {})),
                civil: new SchemaField(Object.keys((({ none, ...o }) => o)(CONFIG.CELESTUS.civilSkills)).reduce((obj, type) => {
                    if (CONFIG.CELESTUS.combatSkills[type]?.ignore) return obj;
                    obj[type] = new NumberField({ required: true, integer: false, min: 0, initial: 0 });
                    return obj;
                }, {})),
                abilities: new SchemaField({
                    str: new NumberField({ required: true, integer: true, initial: 0 }),
                    dex: new NumberField({ required: true, integer: true, initial: 0 }),
                    con: new NumberField({ required: true, integer: true, initial: 0 }),
                    int: new NumberField({ required: true, integer: true, initial: 0 }),
                    mind: new NumberField({ required: true, integer: true, initial: 0 }),
                    wit: new NumberField({ required: true, integer: true, initial: 0 }),
                }),
                resistance: new SchemaField(Object.keys((({ none, ...o }) => o)(CONFIG.CELESTUS.damageTypes)).reduce((obj, type) => {
                    obj[type] = new NumberField({ required: true, integer: false, initial: 0 });
                    return obj;
                }, {})),
                statusImmune: new ArrayField(
                    new StringField()
                ),
                crit_bonus: new NumberField({ required: true, initial: 0 }),
                crit_chance: new NumberField({ required: true, initial: 0 }),
                accuracy: new NumberField({ required: true, initial: 0 }),
                evasion: new NumberField({ required: true, initial: 0 }),
                movement: new NumberField({ required: true, integer: true, initial: 0 }),
                hp: new NumberField({ required: true, integer: true, initial: 0 }),
                initiative: new NumberField({ required: true, integer: true, initial: 0 }),
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
            ownedEffects: new ArrayField(
                new StringField()
            ),
            // for item generation
            socketTypes: new ArrayField(
                new StringField(),
                { required: true, initial: ["", "", "", "", "", "", "", ""] }
            ),
            socketValues: new ArrayField(
                new StringField(),
                { required: true, initial: ["", "", "", "", "", "", "", ""] }
            ),
            plugIds: new ArrayField(
                new StringField(),
                { required: true, initial: ["", "", "", "", "", "", "", ""] }
            ),
            plugChanges: new ArrayField(
                new ObjectField(),
                { required: true, initial: [{}, {}, {}, {}, {}, {}, {}, {}] }
            ),
            level: new NumberField({ required: true, initial: 1, integer: true, min: 1, max: 20 }),
            socketSpread: new StringField(),
            grantedSkills: new ArrayField(new SchemaField({ // skills granted by this effect
                uuid: new StringField(),
                name: new StringField(),
            }),
                { required: true, initial: [] }
            ),
            ownedItems: new ArrayField( // items that have been created by this effect
                new StringField(),
                { required: true, initial: [] }
            ),
            // # of runes
            runeSlots: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),
            // ids of slotted runes
            slottedRunes: new ArrayField(new StringField(), {required: true, initial: []}),
        });
    }
    /** @override */
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false) return false;

        options.system = {};
        const grantedEffects = data.effects;
        if (grantedEffects && data.system?.equipped) {
            const grantedIds = [];
            for (const effect of grantedEffects) {
                if (effect.disabled) {
                    continue;
                }
                //let effectData = effect.toJSON();
                //effectData.type = "status";
                if (this.parent?.parent?.documentName === "Actor") {
                    effect.origin = this.parent.parent.uuid;
                }
                const [newEffect] = await this.parent.parent?.createEmbeddedDocuments("ActiveEffect", [effect]);
                if (newEffect) {
                    // record that this item "owns" this effect
                    grantedIds.push(newEffect._id);
                }
            }
            options.system.ownedEffects = grantedIds;
        }
        // grant skills
        const grantedSkills = data.system?.grantedSkills;
        if (grantedSkills && data.system?.equipped === true) {
            const grantedIds = [];
            for (const item of grantedSkills) {
                const sourceItem = await fromUuid(item.uuid);
                const newItems = await this.parent.parent?.createEmbeddedDocuments("Item", [sourceItem.toJSON()]);
                if (newItems) {
                    // mark new Item as always prepped
                    await newItems[0].update({ "system.memorized": "always" });
                    // record that this effect "owns" this item
                    grantedIds.push(newItems[0].id);
                }
            }
            options.system.ownedItems = grantedIds;
        }
    }

    /** checks if gear piece has any actual prereqs */
    get hasPrereqs() {
        for (const [key, value] of Object.entries(this.prereqs)) {
            if (value > 0) return true;
        }
        return false;
    }
};


/**
 * Defines data model for all armor items
 * @extends { TypeDataModel }
 */
export class ArmorData extends GearData {
    static defineSchema() {
        let schema = super.defineSchema();
        // slot of armor (helmet / chest / gloves / leggings / boots)
        schema.slot = new StringField({ required: true, initial: "none" }),
        schema.spread = new StringField({ required: true, initial: "none" });
        schema.base = new SchemaField({
            phys: new NumberField({ required: true, integer: true, initial: 0 }),
            mag: new NumberField({ required: true, integer: true, initial: 0 }),
        });
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
            phys: Math.round((this.base.phys * scalar / 100.0) * (CONFIG.CELESTUS.e ** level) * this.efficiency),
            mag: Math.round((this.base.mag * scalar / 100.0) * (CONFIG.CELESTUS.e ** level) * this.efficiency),
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
        schema.reach = new BooleanField({ required: true, initial: false });
        schema.appliedStatuses = new ArrayField(
            new StringField(), // status to apply
        );
        schema.bonusElements = new ArrayField(new SchemaField({
            type: new StringField({ required: true, initial: "none" }), // damage type
            value: new NumberField({ required: true, integer: false, initial: 0 }), //  % of base damage
        }));
        return schema;
    }

    /**
     * Calculate damage roll based on actor level
     * @returns {Object} containing min, max, average, and roll formula for base damage of this weapon
     */
    get damage() {
        // get actor level if it exists
        const level = this.parent.actor ? this.parent.actor.system.attributes.level : 1;
        const dice = 1 + Math.round(CONFIG.CELESTUS.weaponDmgScalar * Math.pow(CONFIG.CELESTUS.e, level));
        const dmgDie = this.twoHanded ? 12 : 6;
        // calculate bonus from weapon combat ability
        let weaponType = this.parent.actor?.system.weaponType;
        let abilityBonus = weaponType ? this.parent?.actor?.system?.combat[weaponType]?.value * CONFIG.CELESTUS.combatSkillMod : 0;
        let flatBonus = abilityBonus + (this.parent?.actor?.system.attributes.bonuses.damage.value ?? 0);
        flatBonus += ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        // calculate mult
        let mult = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency, false, flatBonus) : 1;
        let multCrit = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency, true, flatBonus) : 1;
        // optionally multiply by flat damage boost for npcs
        mult *= this.efficiency;
        multCrit *= this.efficiency;
        mult = mult.toFixed(2);
        multCrit = multCrit.toFixed(2);
        return {
            type: this.type,
            min: Math.floor((level + dice) * mult),
            max: Math.floor((level + dice * dmgDie) * mult),
            avg: Math.floor((level + dice * (dmgDie / 2 + 0.5)) * mult),
            roll: `(${level}+${dice}d${dmgDie}[none])*${mult}`,
            crit: `(${level}+${dice}d${dmgDie}[none])*${multCrit}`,
        };
    }

    /** 
     * Calculates damage irrespective of equipment status and weapon style
     */
    get displayDamage() {
        // get actor level if it exists
        const level = this.parent.actor ? this.parent.actor.system.attributes.level : 1;
        const dice = 1 + Math.round(CONFIG.CELESTUS.weaponDmgScalar * Math.pow(CONFIG.CELESTUS.e, level));
        const dmgDie = this.twoHanded ? 12 : 6;

        let flatBonus = (this.parent?.actor?.system.attributes.bonuses.damage.value ?? 0);
        flatBonus += ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        // calculate mult
        let mult = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency, false, flatBonus) : 1;
        let multCrit = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency, true, flatBonus) : 1;
        // optionally multiply by flat damage boost for npcs
        mult *= this.efficiency;
        multCrit *= this.efficiency;
        mult = mult.toFixed(2);
        multCrit = multCrit.toFixed(2);
        return {
            type: this.type,
            min: Math.floor((level + dice) * mult),
            max: Math.floor((level + dice * dmgDie) * mult),
            avg: Math.floor((level + dice * (dmgDie / 2 + 0.5)) * mult),
            roll: `(${level}+${dice}d${dmgDie})*${mult}`,
            crit: `(${level}+${dice}d${dmgDie})*${multCrit}`,
        };
    }

    /**
     * @returns {String} Melee | Ranged
     */
    get rangeType() {
        return this.range > 0 ? "Ranged" : "Melee";
    }

    /**
     * Get list of statuses needed to be rolled
     * @returns {Object{String,Number}[]}
     */
    get statusApplyRolls() {
        let ret = [];
        for (const status of this.appliedStatuses) {
            ret.push({
                id: status,
                chance: CONFIG.CELESTUS.statusChance[(this.twoHanded) ? "twoHand" : "oneHand"]
            })
        }
        return ret;
    }

    /**
     * Calculate damage rolls for all bonus elements
     * @returns {Object[]} array of objects containing type, min, max, average, and roll formula
     */
    get bonusDamage() {
        // base case
        if (this.bonusElements.length < 1) return [];

        // Calculate base damage first
        // get actor level if it exists
        const level = this.parent.actor ? this.parent.actor.system.attributes.level : 1;
        const nDice = 1 + Math.round(CONFIG.CELESTUS.weaponDmgScalar * Math.pow(CONFIG.CELESTUS.e, level));
        const dmgDieAvg = this.twoHanded ? 6.5 : 3.5;
        // calculate bonus from weapon combat ability
        let weaponType = this.parent.actor?.system.weaponType;
        let abilityBonus = weaponType ? this.parent?.actor?.system?.combat[weaponType]?.value * CONFIG.CELESTUS.combatSkillMod : 0;
        let flatBonus = abilityBonus + (this.parent?.actor?.system.attributes.bonuses.damage.value ?? 0);
        flatBonus += ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        // calculate mult
        let mult = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency, false, flatBonus) : 1;
        let multCrit = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency, true, flatBonus) : 1;
        // optionally multiply by flat damage boost for npcs
        mult *= 1 + ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        mult *= this.efficiency;
        mult = mult.toFixed(2);
        multCrit *= 1 + ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        multCrit = multCrit.toFixed(2);
        // final base dmg calcs
        const baseAvg = (level + (nDice * dmgDieAvg));

        // create an array to return
        let damage = []
        // iterate through bonus damage
        for (const element of this.bonusElements) {
            if (element.type === "none") continue;
            const flat = baseAvg * element.value;
            damage.push({
                type: element.type,
                min: Math.max(Math.floor(flat * mult), 1),
                max: Math.max(Math.floor((flat + CONFIG.CELESTUS.weaponBonusDmgDie) * mult) - 1, 1),
                avg: Math.max(Math.floor((flat + (CONFIG.CELESTUS.weaponBonusDmgDie / 2 + 0.5)) * mult) - 1, 1),
                roll: `((${flat}*${mult}-1)+1d${CONFIG.CELESTUS.weaponBonusDmgDie}[none])`,
                crit: `((${flat}*${multCrit}-1)+1d${CONFIG.CELESTUS.weaponBonusDmgDie}[none])`,
            });
        }
        return damage;
    }


    /**
     * Calculate damage rolls for all bonus elements irrespective of weapon type
     * used for display
     * @returns {Object[]} array of objects containing type, min, max, average, and roll formula
     */
    get displayBonusDamage() {
        // base case
        if (this.bonusElements.length < 1) return [];

        // Calculate base damage first
        // get actor level if it exists
        const level = this.parent.actor ? this.parent.actor.system.attributes.level : 1;
        const nDice = 1 + Math.round(CONFIG.CELESTUS.weaponDmgScalar * Math.pow(CONFIG.CELESTUS.e, level));
        const dmgDieAvg = this.twoHanded ? 6.5 : 3.5;

        let flatBonus = (this.parent?.actor?.system.attributes.bonuses.damage.value ?? 0);
        flatBonus += ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        // calculate mult
        let mult = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency, false, flatBonus) : 1;
        let multCrit = this.parent.actor ? calcMult(this.parent.actor, this.type, this.ability, this.efficiency, true, flatBonus) : 1;
        // optionally multiply by flat damage boost for npcs
        mult *= 1 + ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        mult *= this.efficiency;
        mult = mult.toFixed(2);
        multCrit *= 1 + ((this.parent?.actor?.system.dmgBoost ?? 0) * 0.5);
        multCrit = multCrit.toFixed(2);
        // final base dmg calcs
        const baseAvg = (level + (nDice * dmgDieAvg));

        // create an array to return
        let damage = []
        // iterate through bonus damage
        for (const element of this.bonusElements) {
            if (element.type === "none") continue;
            const flat = baseAvg * element.value;
            damage.push({
                type: element.type,
                min: Math.max(Math.floor(flat * mult), 1),
                max: Math.max(Math.floor((flat + CONFIG.CELESTUS.weaponBonusDmgDie) * mult) - 1, 1),
                avg: Math.max(Math.floor((flat + (CONFIG.CELESTUS.weaponBonusDmgDie / 2 + 0.5)) * mult) - 1, 1),
                roll: `((${flat}*${mult}-1)+1d${CONFIG.CELESTUS.weaponBonusDmgDie})`,
                crit: `((${flat}*${multCrit}-1)+1d${CONFIG.CELESTUS.weaponBonusDmgDie})`,
            });
        }
        return damage;
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
            phys: Math.round((this.base.phys * scalar / 100.0) * (CONFIG.CELESTUS.e ** level) * this.efficiency),
            mag: Math.round((this.base.mag * scalar / 100.0) * (CONFIG.CELESTUS.e ** level) * this.efficiency),
        }
    }
}

/**
 * Consumable items, potions etc.
 * @extends { CelestusItemData }
 */
export class ConsumableItem extends CelestusItemData {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.hasDamage = new BooleanField({ required: true, initial: false });
        schema.hasStatuses = new BooleanField({ required: true, initial: false });
        schema.damage = new ArrayField(new SchemaField({
            type: new StringField({ required: true, initial: "physical" }),
            value: new StringField({ required: true, initial: "" }) // formula
        }));
        schema.itemizeDamage = new BooleanField({ required: true, initial: false });
        schema.statusEffects = new ArrayField(new StringField());
        schema.ap = new NumberField({ required: true, initial: 0 });
        return schema;
    }
}

/**
 * Defines data structure for active effects
 * @extends {TypeDataModel}
 */
export class EffectData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // does damage use the no attr scalar?
            damageFlatScalar: new BooleanField({ required: true, initial: false }),
            damage: new ArrayField(new SchemaField({
                type: new StringField({ required: true, initial: "none" }), // damage type
                value: new NumberField({ required: true, integer: false, initial: 0 }), // damage roll as %of base@lvl
            })),
            damageRiders: new ArrayField(new SchemaField({
                type: new StringField({ required: true, initial: "none" }), // damage type
                value: new NumberField({ required: true, integer: false, initial: 0 }), // damage roll as %of weapon damage
            })),
            // armor type that resists the effect, none/mag/phys/any
            resistedBy: new StringField({ required: true, initial: "none" }),
            combines: new ArrayField(new SchemaField({ // effect it combos with
                with: new StringField({ required: true, initial: "none" }), // status id of status it combos with
                makes: new StringField({ required: true, initial: "none" }) // status id of status the two create
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
            aura: new SchemaField({
                has: new BooleanField({ required: true, initial: false }),
                targetsSelf: new BooleanField({ required: true, initial: true }),
                radius: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                targets: new StringField({ required: true, initial: "any" }),
                targetType: new StringField({ required: true, initial: "humanoid" }),
                clearOnLeave: new BooleanField({ required: true, initial: true }),
                lingerDuration: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // 0 = store as non-temp
                children: new ArrayField( // array of ids of owned effects created by the aura
                    new StringField()
                ),
            }),
            grantedSkills: new ArrayField(new SchemaField({ // skills granted by this effect
                uuid: new StringField(),
                name: new StringField(),
            })),
            ownedItems: new ArrayField( // items that have been created by this effect
                new StringField()
            ),
            channeling: new StringField(), // uuid of skill being channeled
        }
    }

    /** @override */
    async _preCreate(data, options, user) {
        const pre = await super._preCreate(data, options, user);
        if (pre === false) {
            return false;
        }
        // get actor this is trying to attach to
        const actor = this.parent.parent;
        // get AE source
        let origin;
        if (data.origin) origin = await fromUuid(data.origin);
        // check if status is resisted by armor
        let resisted = false;
        if (!data.system) {
            return;
        }
        const targetsSelf = data.system?.aura?.targetsSelf;
        if ((targetsSelf || data.origin !== actor.uuid) || !data.system?.aura?.has) {
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
        }
        // things that only matter if there is an origin actor
        if (origin && origin.documentName === "Actor") {
            // check for tormentor
            if (origin.getFlag("celestus", "tormentor")) {
                // check if effect contains a tormentor status
                let tormentor = false;
                if (data.statuses && data.statuses.length > 0) {
                    for (const status of data.statuses) {
                        if (CONFIG.CELESTUS.tormentorStatuses.find(s => s === status)) {
                            tormentor = true;
                        }
                    }
                }
                if (tormentor) {
                    resisted = false;
                    if (data.duration) {
                        this.parent.updateSource({ "duration.rounds": data.duration.rounds + 1 })
                    }
                }
            }
        }
        const broadcast = CONFIG.CELESTUS.broadcastPopups;
        if (resisted === true && !actor.getFlag("celestus", "glasscannon")) {
            canvasPopupText(actor, `Resisted ${data.name}`, "#fff", broadcast);
            return false;
        }

        // check if status is blocked if a statuseffect exists
        if (data.statuses && data.statuses.length > 0) {
            for (const status of data.statuses) {
                // check if actor is immune
                if (actor.system.attributes.statusImmune[status] === true) {
                    canvasPopupText(actor, `Immune to ${CONFIG.statusEffects.find(s => s.id === status).name}`);
                    return false;
                }
                // check if status is blocked
                for (let effect of actor.effects) {
                    if (effect.system.blocks.find(b => b === status)) {
                        canvasPopupText(actor, `${data.name} blocked by ${effect.name}`, "#fff", broadcast);
                        return false;
                    }
                }
            }
        }
        // check if status needs to combine
        if (data.system?.combines) {
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
        }
        // removes all things the status clears
        if (data.system?.removes) {
            for (let status of data.system.removes) {
                let target = actor.effects.find(e => e.statuses.has(status));
                if (target) {
                    target.delete();
                }
            }
        }
        // removes all things the status blocks
        if (data.system?.blocks) {
            for (let status of data.system.blocks) {
                let target = actor.effects.find(e => e.statuses.has(status));
                if (target) {
                    target.delete();
                }
            }
        }
        // removes all other instances of this status
        if (data.statuses) {
            for (let status of data.statuses) {
                let target = actor.effects.find(e => e.statuses.has(status));
                if (target) {
                    target.delete();
                }

            }
        }
        // if status has no duration, instantly remove it after applying its combinations and blocks
        if (data.duration?.rounds === 0) {
            await canvasPopupText(actor, data.name, "#fff", broadcast);
            return false;
        }
        canvasPopupText(actor, `+${data.name}`, "#fff", broadcast);
        // if has parent and parent is combatant in the middle of turn, roll damage
        if (this.parent.parent?.documentName === "Actor") {
            // get current active combatant if exists
            const active = canvas.scene?.tokens.get(game?.combat?.current?.tokenId);
            if (active && active.actorId === this.parent.parent.id) {
                // roll damage
                const effect = this.parent;
                let effectsDamageFormula = "";
                let first = true;
                let dType;
                const attr = this.damageFlatScalar ? "none" : 0;
                for (let part of effect.system.damage) {
                    const origin = await fromUuid(effect.origin);
                    const level = origin ? origin.system.attributes.level : this.parent.parent.system.attributes.level;
                    // damage type
                    const type = part.type;

                    // base damage roll corresponding to actor level
                    const base = CONFIG.CELESTUS.baseDamage.formula[level].replace("none", type);

                    const mult = calcMult(origin, type, attr, part.value, false, 0);

                    if (first) first = false;
                    else effectsDamageFormula += " + "
                    effectsDamageFormula += `floor((${base}) * ${mult})[${type}]`;

                    if (!dType) dType = type;
                    else dType = "Mixed";
                }
                if (effectsDamageFormula) {
                    const r = new Roll(effectsDamageFormula)
                    r.toMessage({
                        speaker: { alias: `${this.parent.parent.name} - Status Damage` },
                        'system.isDamage': true,
                        'system.damageType': dType,
                        'system.actorID': this.parent.parent.uuid,
                    });
                }
            }
        }
        return pre;
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
            isConsumable: new BooleanField({ required: true, initial: false }),
            skill: new SchemaField({
                hasAttack: new BooleanField({ required: true, initial: false }),
                hasDamage: new BooleanField({ required: true, initial: true }),
            }),
            type: new StringField(),
        };
    }
}

/**
 * @extends {GearData}
 */
export class CelestusFeature extends GearData {
    static defineSchema() {
        let schema = super.defineSchema();
        // You can always...
        schema.canAlways = new ArrayField(new StringField());
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

/**
 * runes
 * @extends { CelestusItemData }
 */
export class RuneData extends CelestusItemData {
    static defineSchema() {
        return foundry.utils.mergeObject (super.defineSchema(), {
            // ids of plugs to apply for each slot
            plugs: new SchemaField({
                weapon: new ArrayField(new StringField({required: true, initial: "none"})),
                armor: new ArrayField(new StringField({required: true, initial: "none"})),
                amulet: new ArrayField(new StringField({required: true, initial: "none"})),
                offhand: new ArrayField(new StringField({required: true, initial: "none"})),
            }),
            // All changes for specified type (set on update)
            changes: new SchemaField({
                weapon: new ArrayField(new ObjectField()),
                armor: new ArrayField(new ObjectField()),
                amulet: new ArrayField(new ObjectField()),
                offhand: new ArrayField(new ObjectField()),
            }),
        });
    }

    /**
     * Checks if this rune is currently slotted
     * @returns {Item | Boolean | undefined} item that it is slotted in or some falsy value (may be undefined)
     */
    get slotted() {
        if (!(this.parent.parent?.documentName === "Actor")) return false;
        return this.parent.parent.items.find(i => i.system?.slottedRunes?.includes(this.parent.id));
    }
}

/**
 * Data model / info for tokens
 * @extends {TokenDocument}
 */
export class TokenData extends TokenDocument {
    /** @override */
    static defineSchema() {
        let schema = super.defineSchema();
        schema.pointerColor = new NumberField();
        schema.direction = new NumberField({ required: true, initial: 0 }); // radians
        schema.pointerPIXI = new ObjectField(); // pixi object
        return schema;
    }
}