const
{
    HTLMField, SchemaField, NumberField, StringField, FilePathField, ArrayField
} = foundry.data.fields;

// Define data for player character
export class PlayerData extends foundry.abstract.TypeDataModel
{
    static defineSchema()
    {
        return
        {
            biography: new HTMLField(), // create biography field

            // configure resources
            resources: new SchemaField
            ({
                // configure health as a schema field
                hp: new SchemaField
                ({
                    val: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // current hp value
                    min: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // min hp value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0})  // max hp value
                }),
                // configure armor as a schema field
                phys_armor: new SchemaField
                ({
                    val: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // current armor value
                    min: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // min armor value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0})  // max armor value
                }),
                // configure magic armor as a schema field
                mag_armor: new SchemaField
                ({
                    val: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // current armor value
                    min: new NumberField({ required: true, integer: true, min: 0, initial: 0}), // min armor value
                    max: new NumberField({ required: true, integer: true, min: 0, initial: 0})  // max armor value
                }),
            }),
            // configure ability/attributes
            abilities: new SchemaField
            ({
                str  : new NumberField){ trquired: true, integer: true, min: 0, initial: 10}), // Strength
                dex  : new NumberField){ trquired: true, integer: true, min: 0, initial: 10}), // Dexterity
                con  : new NumberField){ trquired: true, integer: true, min: 0, initial: 10}), // Constitution
                intl : new NumberField){ trquired: true, integer: true, min: 0, initial: 10}), // Intellect
                mind : new NumberField){ trquired: true, integer: true, min: 0, initial: 10}), // Mind
                wit  : new NumberField){ trquired: true, integer: true, min: 0, initial: 10}), // Wits
            })
            // xp as a text field
            xp: new NumberField({ required: true, integer: true, min: 0, initial: 0})
        };
    }
    
}

// Registering System data Models
Hooks.on("init", () =>
{
    CONFIG.Actor.dataModels = 
    {
        player: PlayerData,
        npc: PlayerData
    }
    
    // set up resource attributes as trackable
    CONFIG.Actor.trackableAttributes = 
    {
        player: 
        {
            bar: ["resources.hp", "resources.phys_armor", "resources.mag_armor"],
            value: ["val"]
        }
    }
    console.log("test");
});
