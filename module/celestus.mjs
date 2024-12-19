import { PlayerData, SkillData, ChatDataModel } from "./dataModels.mjs"
import { CelestusActor } from "./actors.mjs"
import { addChatButtons, applyDamageHook, calcModifiers, rollAttack, rollDamage } from "./hooks.mjs"

// Registering System data Models
Hooks.on("init", () => {
    // create Celestus entry in CONFIG
    CONFIG.CELESTUS = {
        // Set up data types
        /**
         * Damage Types
         * 
         * label: label for display
         * text: text code corresponding to label
         * style: magical/physical/healing, how to apply damage
         * skill: combat skill used for damage type
         */
        damageTypes: {
            physical: { label: "Physical", text: "physical", style: "physical", skill: "warlord" },
            fire: { label: "Fire", text: "fire", style: "magical", skill: "flamespeaker" },
            water: { label: "Water", text: "water", style: "magical", skill: "tidecaller" },
            air: { label: "Air", text: "air", style: "magical", skill: "stormseeker" },
            earth: { label: "Earth", text: "earth", style: "magical", skill: "duneshaper" },
            poison: { label: "Poison", text: "poison", style: "magical", skill: "duneshaper" },
            psychic: { label: "Psychic", text: "psychic", style: "magical", skill: "voidcantor" },
            piercing: { label: "Piercing", text: "piercing", style: "direct", skill: "warlord" },
            healing: { label: "Healing", text: "healing", style: "healing", skill: "tidecaller" },
            phys_armor: { label: "Physical Armor", text: "phys_armor", style: "healing", skill: "duneshaper" },
            mag_armor: { label: "Magical Armor", text: "mag_armor", style: "healing", skill: "tidecaller" },
            t_phys_armor: { label: "Temp Physical Armor", text: "t_phys_armor", style: "healing", skill: "duneshaper" },
            t_mag_armor: { label: "Temp Magical Armor", text: "t_mag_armor", style: "healing", skill: "tidecaller" },
        },
        abilityMod: { // ability modifer percentages per point above or below 10
            str: 0.05, // +5% damage per point
            dex: 0.05, // +5% damage per point
            int: 0.05, // +5% damage/healing per point
            con: 0.10, // +10% max hp per point
            mind: 1, // 1 memory slot per point
            wit: 0.01, // +1% crit chance (can use raw value to calc initiative)
        },
        baseAbilityMod: {
            str: 0.0,
            dex: 0.0,
            int: 0.0,
            con: 0.0,
            mind: 3,
            wit: 0.05,
        },
        combatSkillMod: 0.05,   // amount to increase damage by for combat skills per level
        baseCritBonus: 0.6,   // base critical damage bonus expressed as a percentage
        baseCritChance: 0.05,   // base critical hit chance expressed as a percentage
        maxHP: { // base max hp amounts
            1: 30,
            2: 45,
            3: 65,
            4: 85,
            5: 110,
            6: 135,
            7: 165,
            8: 200,
            9: 235,
            10: 285,
            11: 345,
            12: 415,
            13: 560,
            14: 685,
            15: 840,
            16: 1015,
            17: 1255,
            18: 1790,
            19: 2240,
            20: 2815,
            21: 3545,
            22: 4480,
            23: 5670,
            24: 7190,
            25: 9130,
        },
        baseDamage: { // base damage for spells / abilities
            formula: { // die roll formual
                1: "2d6 + 0",
                2: "2d6 + 2",
                3: "2d6 + 4",
                4: "2d6 + 6",
                5: "3d6 + 6",
                6: "3d6 + 9",
                7: "4d6 + 9",
                8: "4d6 + 14",
                9: "4d6 + 18",
                10: "5d6 + 20",
                11: "5d6 + 25",
                12: "6d6 + 30",
                13: "7d6 + 35",
                14: "8d6 + 40",
                15: "9d6 + 50",
                16: "10d6 + 60",
                17: "11d6 + 70",
                18: "12d6 + 100",
                19: "13d6 + 120",
                20: "14d6 + 150",
                21: "15d6 + 190",
                22: "16d6 + 240",
                23: "17d6 + 290",
                24: "18d6 + 360",
                25: "20d6 + 440",
            },
            min: { // minimum damage from formula
                1: 2,
                2: 4,
                3: 6,
                4: 8,
                5: 9,
                6: 12,
                7: 13,
                8: 18,
                9: 22,
                10: 25,
                11: 30,
                12: 36,
                13: 42,
                14: 48,
                15: 59,
                16: 70,
                17: 81,
                18: 112,
                19: 133,
                20: 164,
                21: 205,
                22: 256,
                23: 307,
                24: 378,
                25: 460,
            },
            max: { // max damage from formula
                1: 12,
                2: 14,
                3: 16,
                4: 18,
                5: 24,
                6: 27,
                7: 33,
                8: 38,
                9: 42,
                10: 50,
                11: 55,
                12: 66,
                13: 77,
                14: 88,
                15: 104,
                16: 120,
                17: 136,
                18: 172,
                19: 198,
                20: 234,
                21: 280,
                22: 336,
                23: 392,
                24: 468,
                25: 560,
            },
            avg: { // average damage from formula
                1: 7,
                2: 9,
                3: 11,
                4: 13,
                5: 17,
                6: 20,
                7: 23,
                8: 28,
                9: 32,
                10: 38,
                11: 43,
                12: 51,
                13: 60,
                14: 68,
                15: 82,
                16: 95,
                17: 109,
                18: 142,
                19: 166,
                20: 199,
                21: 243,
                22: 296,
                23: 350,
                24: 423,
                25: 510,
            }
        },
    };

    // set up data models
    CONFIG.Actor.dataModels = {
        player: PlayerData,
        npc: PlayerData
    };

    CONFIG.Item.dataModels = {
        skill: SkillData,
    }

    // set up resource attributes as trackable
    CONFIG.Actor.trackableAttributes = {
        player:
        {
            bar: ["resources.hp", "resources.phys_armor", "resources.mag_armor", "resources.ap", "resources.jiriki"],
            value: []
        }
    };

    CONFIG.Actor.documentClass = CelestusActor;

    CONFIG.ChatMessage.dataModels.base = ChatDataModel;
});

Hooks.on("ready", () => {
    $(document).on("click", ".attack", rollAttack);
    $(document).on("click", ".damage", rollDamage);
    $(document).on("click", ".apply-damage", applyDamageHook);
});

// hook stats calc on actor update
Hooks.on("updateActor", calcModifiers);

// append apply damage button to damage rolls for GM
Hooks.on("renderChatMessage", addChatButtons);