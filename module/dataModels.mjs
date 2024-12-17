const {
    HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField
} = foundry.data.fields;

// Define data model for player character
export class PlayerData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            biography: new HTMLField(), // create biography field

            // configure resources
            resources: new SchemaField ({
                // configure health as a schema field
                hp: new SchemaField ({
                    val: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // current hp value
                    min: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // min hp value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0})  // max hp value
                }),
                // configure armor as a schema field
                phys_armor: new SchemaField ({
                    val: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // current armor value
                    min: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // min armor value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0})  // max armor value
                }),
                // configure magic armor as a schema field
                mag_armor: new SchemaField ({
                    val: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // current armor value
                    min: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // min armor value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0})  // max armor value
                }),
                ap: new NumberField({ required: true, integer: true, min: 0, initial: 4}), // action points
            }),
            attributes: new SchemaField ({
                crit_chance: new NumberField({ required: true, integer: true, min:0, initial: 5}), // chance to land a crit, expressed as an int percentage
                resistance: new SchemaField ({ // resitance values, expressed as int percentages
                    physical:   new NumberField({ required: true, integer: true, min: -500, initial: 0}),
                    fire    :   new NumberField({ required: true, integer: true, min: -500, initial: 0}),
                    water   :   new NumberField({ required: true, integer: true, min: -500, initial: 0}),
                    air     :   new NumberField({ required: true, integer: true, min: -500, initial: 0}),
                    earth   :   new NumberField({ required: true, integer: true, min: -500, initial: 0}),
                    poison  :   new NumberField({ required: true, integer: true, min: -500, initial: 0}),
                    psychic :   new NumberField({ required: true, integer: true, min: -500, initial: 0}),
                    healing :   new NumberField({ required: true, integer: true, min: -500, initial: 0}),
                })
            }),
            // combat abilities
            combat: new SchemaField ({
                flamespeaker    : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // fire
                tidecaller      : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // water/ healing
                stormseeker     : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // air
                duneshaper      : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // earth / poison
                voidcantor      : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // psychic (psionics)
                deathbringer    : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // physical/ lifesteal (will include blood)
                shroudstalker   : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // rogue, crit, movement (shadow magic)
                formshifter     : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // polymorph, gives bonus abillity points
                warlord         : new NumberField({ required: true, integer: true, min: 0, initial: 0}), // increases physical
            }),
            // configure ability/attributes
            abilities: new SchemaField ({
                str  : new NumberField({ trquired: true, integer: true, min: 0, initial: 10}), // Strength
                dex  : new NumberField({ trquired: true, integer: true, min: 0, initial: 10}), // Dexterity
                con  : new NumberField({ trquired: true, integer: true, min: 0, initial: 10}), // Constitution
                intl : new NumberField({ trquired: true, integer: true, min: 0, initial: 10}), // Intellect
                mind : new NumberField({ trquired: true, integer: true, min: 0, initial: 10}), // Mind
                wit  : new NumberField({ trquired: true, integer: true, min: 0, initial: 10}), // Wits
            }),
            // xp as a text field
            xp: new NumberField({ required: true, integer: true, min: 0, initial: 0})
        };
    }   
}
