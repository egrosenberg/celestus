import { PlayerData } from "./dataModels.mjs"

// Registering System data Models
Hooks.on("init", () =>
{
    // create Celestus entry in CONFIG
    CONFIG.CELESTUS = {
        // Set up data types
        damageTypes: {
            physical:   { label: "Physical" },
            fire:       { label: "Fire"     },
            water:      { label: "Water"    },
            air:        { label: "Air"      },
            earth:      { label: "Earth"    },
            poison:     { label: "Poison"   },
            psychic:    { label: "Psychic"  },
            piercing:   { label: "Piercing" },
            healing:    { label: "Healing"  }
        },
        baseCritMultiplier: 160,    // base critical damage multiplier expressed as int percentage
        baseCritChance:     5,      // base critical hit chance expressed as int percentage

    };
    
    // set up data models
    CONFIG.Actor.dataModels = 
    {
        player: PlayerData,
        npc: PlayerData
    };
    
    // set up resource attributes as trackable
    CONFIG.Actor.trackableAttributes = 
    {
        player: 
        {
            bar: ["resources.hp", "resources.phys_armor", "resources.mag_armor"],
            value: ["val"]
        }
    };
});
