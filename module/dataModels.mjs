const {
    HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField
} = foundry.data.fields;

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
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current hp value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 })  // max hp value
                }),
                // configure armor as a schema field
                phys_armor: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current armor value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // max armor value
                    temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // temporary armor (from skills)
                }),
                // configure magic armor as a schema field
                mag_armor: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current armor value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // max armor value
                    temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // temporary armor (from skills)
                }),
                ap: new SchemaField({ // action points
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 4 }), // current ap amount
                    max: new NumberField({ required: true, integer: true, min: 4, initial: 6 }), // max ap amount
                    start: new NumberField({ required: true, integer: true, min: 4, initial: 4 }), // starting ap amount
                }),
                jiriki: new SchemaField({ // jiriki points
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // current ap amount
                    max: new NumberField({ required: true, integer: true, min: 1, initial: 1 }), // max ap amount
                }),
            }),
            attributes: new SchemaField({
                crit_chance: new NumberField({ required: true, integer: false, min: 0, initial: 0.05 }), // chance to land a crit, expressed as a percentage
                crit_bonus: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // damage increase (on top of base) on crit (as percent)
                accuracy: new NumberField({ required: true, integer: false, min: 0, initial: 0.95 }), // base chance to hit (can go above 1)
                evasion: new NumberField({ required: true, integer: false, min: 0, initial: 0.0 }), // chance to dodge an attack (expressed as a percent)
                resistance: new SchemaField({ // resitance values, expressed int percentages 
                    physical: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    fire: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    water: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    air: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    earth: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    poison: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    psychic: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    healing: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    phys_armor: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    mag_armor: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    t_phys_armor: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                    t_mag_armor: new SchemaField({
                        value: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                        bonus: new NumberField({ required: true, integer: false, min: -500, initial: 0 }),
                    }),
                }),
                damage: new SchemaField({ // damage modifiers as additive bonus percent
                    physical: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    fire: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    water: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    air: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    earth: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    poison: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    psychic: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    piercing: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    healing: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    phys_armor: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    mag_armor: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    t_phys_armor: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                    t_mag_armor: new NumberField({ required: true, integer: false, min: 0, initial: 0 }),
                }),
                // movement
                movement: new NumberField({ required: true, integer: false, min: 0, initial: 20 }), // movement in map units (default ft)
                // xp & level
                xp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                level: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
            }),
            // combat abilities
            combat: new SchemaField({
                flamespeaker: new SchemaField({ // fire
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                tidecaller: new SchemaField({ // water/ healing
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                stormseeker: new SchemaField({ // air
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                duneshaper: new SchemaField({ // earth / poison
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                voidcantor: new SchemaField({ // psychic (psionics)
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                deathbringer: new SchemaField({ // physical/ lifesteal (will include blood)
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                shroudstalker: new SchemaField({ // rogue, crit, movement (shadow magic)
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                formshifter: new SchemaField({ // polymorph, gives bonus abillity points
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                warlord: new SchemaField({ // increases physical
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // total value
                    base: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // base value from leveling
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
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
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                dex: new SchemaField({ // Dexterity
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                con: new SchemaField({ // Constitution
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                int: new SchemaField({ // Intellect
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (percentage)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                mind: new SchemaField({ // Mind
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // modifier value (flat)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
                wit: new SchemaField({ // Wits
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }), // base value
                    mod: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // modifier value (flat)
                    bonus: new NumberField({ required: true, integer: true, min: 0, initial: 0 }), // bonus to base value from items/features
                }),
            }),
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
            cooldown: new SchemaField({
                value: new NumberField({ required: true, integer: true, min: -1, initial: 0 }),
                max: new NumberField({ required: true, integer: true, min: -1, initial: 0 }),
            }), // cooldown in rounds negative value means inf
            memorized: new BooleanField({ required: true, initial: false }),
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
                type: new StringField(), // damage type
                value: new NumberField({ required: true, integer: false, min: 0, initial: 0 }), // damage roll as %of base@lvl
            })),
            ability: new StringField(), // int/dex/str - ability used for scaling of damage
            attack: new BooleanField({ required: true, initial: false }),
            targets: new SchemaField({ // amount of targets required/allowed
                min: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            }),
        };
    }
};

/**
 * Defines data model for armor items
 * @extends { TypeDataModel }
 */
export class ArmorData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // type of armor (determines stat used as prereq)
            type: new StringField({ required: true, initial: "none" }),
            description: new HTMLField(),
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
                abilities: new SchemaField({
                    str: new NumberField({ required: true, integer: true, initial: 0 }),
                    dex: new NumberField({ required: true, integer: true, initial: 0 }),
                    con: new NumberField({ required: true, integer: true, initial: 0 }),
                    int: new NumberField({ required: true, integer: true, initial: 0 }),
                    mind: new NumberField({ required: true, integer: true, initial: 0 }),
                    wit: new NumberField({ required: true, integer: true, initial: 0 }),
                }),
            }),
        }
    }
};

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
        }
    }
}