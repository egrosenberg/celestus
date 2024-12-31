import { PlayerData, SkillData, ChatDataModel, ArmorData, EffectData, WeaponData, CelestusFeature } from "./dataModels.mjs"
import { CelestusActor } from "./actors.mjs"
import { addChatButtons, applyDamageHook, applyStatusHook, cleanupCombat, createCelestusMacro, previewDamage, rollAttack, rollDamage, rollItemMacro, startCombat, triggerTurn } from "./hooks.mjs"
import { CelestusActiveEffectSheet, CelestusItemSheet, CharacterSheet } from "./sheets.mjs"
import { armorData } from "./armor.mjs"
import { CelestusItem } from "./items.mjs"
import { CelestusEffect } from "./effects.mjs"
import { statuses } from "./data/statuses.mjs"

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
const preloadHandlebarsTemplates = async function () {
    return loadTemplates([
        // Actor partials.
        'systems/celestus/templates/actor/parts/actor-features.hbs',
        'systems/celestus/templates/actor/parts/actor-items.hbs',
        'systems/celestus/templates/actor/parts/actor-skills.hbs',
        'systems/celestus/templates/actor/parts/actor-effects.hbs',
        // Item partials
        //'systems/celestus/templates/item/parts/item-effects.hbs',
    ]);
};


// Registering System data Models
Hooks.on("init", () => {
    // important things for roll data
    game.celestus = {
        rollItemMacro,
    }

    // create Celestus entry in CONFIG
    CONFIG.CELESTUS = {
        // Set up data types
        /**
         * Damage Types
         * 
         * label: text for display
         * text: text code corresponding to label
         * style: magical/physical/healing, how to apply damage
         * skill: combat skill used for damage type
         * color: background color for damage rolls
         * glyph: glyphter icon to use for display
         */
        damageTypes: {
            physical: { label: "Physical", text: "physical", style: "physical", skill: "warlord", color: "#b3c0cc", glyph: "icon-spinning-sword" },
            fire: { label: "Fire", text: "fire", style: "magical", skill: "flamespeaker", color: "#db8b70", glyph: "icon-flamer" },
            water: { label: "Water", text: "water", style: "magical", skill: "tidecaller", color: "#86c0df", glyph: "icon-drop" },
            air: { label: "Air", text: "air", style: "magical", skill: "stormseeker", color: "#9c86df", glyph: "icon-lightning-helix" },
            earth: { label: "Earth", text: "earth", style: "magical", skill: "duneshaper", color: "#dba670", glyph: "icon-rock" },
            poison: { label: "Poison", text: "poison", style: "magical", skill: "duneshaper", color: "#c9df86", glyph: "icon-chemical-bolt" },
            psychic: { label: "Psychic", text: "psychic", style: "magical", skill: "voidcantor", color: "#df86df", glyph: "icon-croissants-pupil" },
            piercing: { label: "Piercing", text: "piercing", style: "direct", skill: "warlord", color: "#df8686", glyph: "icon-bloody-stash" },
            healing: { label: "Healing", text: "healing", style: "healing", skill: "tidecaller", color: "#92e298", glyph: "icon-nested-hearts" },
            phys_armor: { label: "Physical Armor", text: "phys_armor", style: "healing", skill: "duneshaper", color: "#dba670", glyph: "icon-edged-shield" },
            mag_armor: { label: "Magic Armor", text: "mag_armor", style: "healing", skill: "tidecaller", color: "#86dfdf", glyph: "icon-magic-shield" },
            t_phys_armor: { label: "Temp Physical Armor", text: "t_phys_armor", style: "healing", skill: "duneshaper", color: "#dba670", glyph: "icon-edged-shield" },
            t_mag_armor: { label: "Temp Magic Armor", text: "t_mag_armor", style: "healing", skill: "tidecaller", color: "#86dfdf", glyph: "icon-magic-shield" },
            none: { label: "None", text: "none", style: "none", skill: "none", color: "black", glyph: "" },
        },
        /**
         * combat skills
         * 
         * label: text for display
         * text: text code corresponding to label
         * damage: primary damage type associated with skill
         * glyph: glyphter icon to use for display
         */
        combatSkills: {
            flamespeaker: { label: "Flamespeaker", text: "flamespeaker", damage: "fire", glyph: "icon-fireflake" },
            tidecaller: { label: "Tidecaller", text: "tidecaller", damage: "water", glyph: "icon-waves" },
            stormseeker: { label: "Stormseeker", text: "stormseeker", damage: "air", glyph: "icon-fluffy-cloud" },
            duneshaper: { label: "Duneshaper", text: "duneshaper", damage: "earth", glyph: "icon-stone-sphere" },
            voidcantor: { label: "Voidcantor", text: "voidcantor", damage: "psychic", glyph: "icon-star-swirl" },
            deathbringer: { label: "Deathbringer", text: "deathbringer", damage: "physical", glyph: "icon-death-zone" },
            shroudstalker: { label: "Shroudstalker", text: "shroudstalker", damage: "piercing", glyph: "icon-nested-eclipses" },
            formshifter: { label: "Formshifter", text: "formshifter", damage: "acid", glyph: "icon-wolf-howl" },
            huntmaster: { label: "Huntmaster", text: "huntmaster", damage: "poison", glyph: "icon-pocket-bow" },
            warlord: { label: "Warlord", text: "warlord", damage: "physical", glyph: "icon-axe-sword" },
        },
        /**
         * civil skills
         * 
         * label: text for display
         * text: text code corresponding to label
         * color: html color for background of civil skill
         * glyph: glyphter icon to use for display
         */
        civilSkills: {
            scoundrel: { label: "Scoundrel", text: "scoundrel", color: "#f0f0f4", glyph: "icon-pay-money" },
            lore: { label: "Lore", text: "lore", color: "#ff9999", glyph: "icon-book-cover" },
            nature: { label: "Nature", text: "nature", color: "#b0e8b0", glyph: "icon-linden-leaf" },
            influence: { label: "Influence", text: "influence", color: "#ffccf1", glyph: "icon-lyre" },
        },
        /**
         * bonuses
         * 
         * label: text for display
         * text: text code corresponding to label
         * symbol: symbol to append when displaying
         */
        bonuses: {
            crit_chance: { label: "Crit Chance", text: "crit_chance", symbol: "" },
            crit_bonus: { label: "Crit Damage", text: "crit_bonus", symbol: '\u00D7' },
            accuracy: { label: "Accuracy", text: "accuracy", symbol: "" },
            evasion: { label: "Evasion", text: "evasion", symbol: "" },
            damage: { label: "Damage Increase", text: "damage", symbol: '\u00D7' },
        },
        abilityMod: { // ability modifer percentages per point above or below 10
            str: 0.05, // +5% damage per point
            dex: 0.05, // +5% damage per point
            int: 0.05, // +5% damage/healing per point
            con: 0.07, // +10% max hp per point
            mind: 1, // 1 memory slot per point
            wit: 0.01, // +1% crit chance (can use raw value to calc initiative)
        },
        baseAbilityMod: {
            str: 0.0,
            dex: 0.0,
            int: 0.0,
            con: 0.0,
            mind: 0,
            wit: 0.05,
        },
        // character stats
        abilities: {
            str: { label: "Strength", text: "str" },
            dex: { label: "Dexterity", text: "dex" },
            int: { label: "Intellect", text: "int" },
            con: { label: "Constitution", text: "con" },
            mind: { label: "Mind", text: "mind" },
            wit: { label: "Wits", text: "wit" },
            none: { label: "None", text: "none" },
        },
        baseAbilityPoints: 1,
        baseAttributeScore: 10,
        combatSkillMod: 0.05,   // amount to increase damage by for combat skills per level
        baseCritBonus: 0.6,   // base critical damage bonus expressed as a percentage
        baseCritChance: 0.05,   // base critical hit chance expressed as a percentage
        baseAccuracy: 0.95,
        twoHandMult: 0.9,
        enlightenedBonus: { // bonus from enlightened flag
            1: { str: 1, dex: 1, int: 1, wit: 1 },
            2: { str: 1, dex: 1, int: 1, wit: 2 },
            3: { str: 1, dex: 1, int: 1, wit: 2 },
            4: { str: 1, dex: 1, int: 1, wit: 3 },
            5: { str: 2, dex: 2, int: 2, wit: 3 },
            6: { str: 2, dex: 2, int: 2, wit: 4 },
            7: { str: 2, dex: 2, int: 2, wit: 4 },
            8: { str: 2, dex: 2, int: 2, wit: 5 },
            9: { str: 3, dex: 3, int: 3, wit: 5 },
            10: { str: 3, dex: 3, int: 3, wit: 6 },
            11: { str: 3, dex: 3, int: 3, wit: 6 },
            12: { str: 3, dex: 3, int: 3, wit: 7 },
            13: { str: 3, dex: 3, int: 3, wit: 7 },
            14: { str: 4, dex: 4, int: 4, wit: 8 },
            15: { str: 4, dex: 4, int: 4, wit: 8 },
            16: { str: 4, dex: 4, int: 4, wit: 9 },
            17: { str: 4, dex: 4, int: 4, wit: 9 },
            18: { str: 5, dex: 5, int: 5, wit: 10 },
            19: { str: 5, dex: 5, int: 5, wit: 10 },
            20: { str: 5, dex: 5, int: 5, wit: 11 },
            21: { str: 5, dex: 5, int: 5, wit: 12 },
            22: { str: 5, dex: 5, int: 5, wit: 12 },
            23: { str: 6, dex: 6, int: 6, wit: 13 },
        },
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
        flatDamageScalar: 0.07, // +.07*(level-1) damage
        weaponDmgBase: 1.165, // used to calculate # of dice a weapon uses (1.165^lvl dice)
        baseArmor: armorData,
        // info on different types of armor
        armor: {
            types: {
                robes: { label: "Robes", text: "robes" },
                light: { label: "Light", text: "light" },
                heavy: { label: "Heavy", text: "heavy" },
                jewel: { label: "Jewelry ", text: "jewel" },
                none: { label: "None", text: "none" },
            },
            slots: {
                helmet: { label: "Helmet", text: "helmet", jewel: false },
                chest: { label: "Chestplate", text: "chest", jewel: false },
                gloves: { label: "Gloves", text: "gloves", jewel: false },
                leggings: { label: "Leggings", text: "leggings", jewel: false },
                boots: { label: "Boots", text: "boots", jewel: false },
                amulet: { label: "Amulet", text: "amulet", jewel: true },
                ring: { label: "Ring", text: "ring", jewel: true },
                belt: { label: "Belt", text: "belt", jewel: true },
                none: { label: "None", text: "none" },
            },
        },
        // categories of skills
        skillTypes: {
            weapon: "Weapon (combat)",
            magic: "Magic (combat)",
            civil: "Civil",
        },
        // memorization statuses
        memTypes: {
            true: "Memorized",
            false: "Not Memorized",
            always: "Always Memorized",
        },
        featureTypes: {
            feature: "Feature",
            origin: "Origin",
            species: "Species",
            occupation: "Occupation",
        }
    };

    // set up data models
    CONFIG.Actor.dataModels = {
        player: PlayerData,
        npc: PlayerData
    };

    CONFIG.Item.dataModels = {
        skill: SkillData,
        armor: ArmorData,
        weapon: WeaponData,
        feature: CelestusFeature,
    }

    CONFIG.ActiveEffect.dataModels = {
        status: EffectData,
    }

    // set up sheets
    Actors.unregisterSheet('core', ActorSheet);
    Actors.registerSheet('celestus', CharacterSheet, {
        makeDefault: true,
        label: 'CELESTUS.SheetLabels.Actor',
        async: true,
    });
    Items.unregisterSheet('core', ItemSheet);
    Items.registerSheet('celestus', CelestusItemSheet, {
        makeDefault: true,
        label: 'CELESTUS.SheetLabels.Item',
        async: true,
    });

    // register active effect sheet
    DocumentSheetConfig.registerSheet(CelestusEffect, "celestus", CelestusActiveEffectSheet,
        {
            types: ["status", "base"],
            makeDefault: true,
            canBeDefault: true,
            label: "CELESTUS.SheetLabels.activeEffect",
        }
    );

    // set up resource attributes as trackable
    CONFIG.Actor.trackableAttributes = {
        player:
        {
            bar: ["resources.hp", "resources.phys_armor", "resources.mag_armor", "resources.ap", "resources.fp"],
            value: []
        }
    };

    CONFIG.Actor.documentClass = CelestusActor;
    CONFIG.Item.documentClass = CelestusItem;
    CONFIG.ActiveEffect.documentClass = CelestusEffect;

    CONFIG.ChatMessage.dataModels.base = ChatDataModel;

    CONFIG.statusEffects = statuses;

    // preload handlebars templates
    return preloadHandlebarsTemplates();

});

Hooks.on("ready", () => {
    $(document).on("click", ".attack", rollAttack);
    $(document).on("click", ".damage", rollDamage);
    $(document).on("click", ".apply-damage", applyDamageHook);
    $(document).on("click", ".apply-status", applyStatusHook);

    // hook macro creation on hotbar drop
    Hooks.on("hotbarDrop", (bar, data, slot) => {
        createCelestusMacro(data, slot);
        return false;
    });
});


// append apply damage button to damage rolls for GM
Hooks.on("renderChatMessage", addChatButtons);

// hook damage preview on token select
Hooks.on("controlToken", previewDamage);

// handle turn changes
Hooks.on("combatTurnChange", triggerTurn);

// handle combat start
Hooks.on("combatStart", startCombat);
// handle combat end
Hooks.on("preDeleteCombat", cleanupCombat);

// hbs helpers
Handlebars.registerHelper("repeat", (n, options) => {
    let output = ""
    for (let i = 0; i < n; i++) {
        output += options.fn(this);
    }
    return output;
});