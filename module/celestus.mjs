import { PlayerData, SkillData, ChatDataModel, ArmorData, EffectData, WeaponData, CelestusFeature, OffhandData, NpcData, ReferenceData } from "./dataModels.mjs"
import { CelestusActor, CelestusToken } from "./actors.mjs"
import { addChatButtons, applyDamageHook, applyStatusHook, cleanupCombat, createCelestusMacro, drawTokenHover, drawTemplate, previewDamage, removeRollAuthor, renderHotbarOverlay, rollAttack, rollCrit, rollDamage, rollItemMacro, spreadAura, startCombat, triggerTurn, rotateOnMove, renderDamageComponents, renderResourcesUi, resourceInteractFp, resourceInteractAp } from "./hooks.mjs"
import { CelestusActiveEffectSheet, CelestusItemSheet, CharacterSheet } from "./sheets.mjs"
import { CelestusItem } from "./items.mjs"
import { CelestusEffect } from "./effects.mjs"
import { statuses } from "./data/statuses.mjs"
import { npcStatSpread } from "./data/npc-stat-spreads.mjs"
import { CelestusMeasuredTemplate } from "./measure.mjs"
// json
import itemSocketSpreadJson from './data/item-socket-spreads.mjs';
import itemArmorPlugsJson from './data/item-armor-plugs.mjs';
import itemWeaponPlugsJson from './data/item-weapon-plugs.mjs';
import itemSocketJson from './data/item-sockets.mjs';
import { scripts } from "./resources/skill-scripts.mjs"

// import * as itemSocketSpreadJson from './data/item-socket-spreads.json' with { type: "json" };
// import * as itemArmorPlugsJson from './data/item-armor-plugs.json' with { type: "json" };
// import * as itemSocketJson from './data/item-sockets.json' with { type: "json" };

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
        'systems/celestus/templates/actor/parts/actor-npc-skills.hbs',
        // Item partials
        'systems/celestus/templates/item/parts/item-creation.hbs',
        'systems/celestus/templates/item/parts/item-bonuses.hbs',
        // item descriptions
        'systems/celestus/templates/rolls/item-parts/armor-description.hbs',
        'systems/celestus/templates/rolls/item-parts/feature-description.hbs',
        'systems/celestus/templates/rolls/item-parts/offhand-description.hbs',
        'systems/celestus/templates/rolls/item-parts/skill-description.hbs',
        'systems/celestus/templates/rolls/item-parts/weapon-description.hbs',
    ]);
};


// Registering System data Models
Hooks.on("init", () => {
    // important things for roll data
    game.celestus = {
        rollItemMacro,
    }
    // override initiative rolls
    game.system.initiative = "1d20+@abilities.wit.total+@attributes.bonuses.initiative.value";

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
            shadow: { label: "Shadow", text: "shadow", style: "direct", skill: "shroudstalker", color: "#90a1d5", glyph: "icon-bloody-stash" },
            piercing: { label: "Piercing", text: "piercing", style: "direct", skill: "warlord", color: "#df8686", glyph: "icon-bloody-stash" },
            healing: { label: "Healing", text: "healing", style: "healing", skill: "tidecaller", color: "#92e298", glyph: "icon-nested-hearts" },
            phys_armor: { label: "Physical Armor", text: "phys_armor", style: "healing", skill: "duneshaper", color: "#ebccad", glyph: "icon-edged-shield" },
            mag_armor: { label: "Magic Armor", text: "mag_armor", style: "healing", skill: "tidecaller", color: "#86dfdf", glyph: "icon-magic-shield" },
            t_phys_armor: { label: "Temp Physical Armor", text: "t_phys_armor", style: "healing", skill: "duneshaper", color: "#ebccad", glyph: "icon-edged-shield" },
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
            onehand: { label: "Dueling", text: "onehand", damage: "physical", glyph: "icon-gladius", type: "weapon" },
            dualwield: { label: "Dual Wielding", text: "dualwield", damage: "physical", glyph: "icon-crossed-swords", type: "weapon", modOverride: 0.01 },
            twohand: { label: "Heavy-Handed", text: "twohand", damage: "physical", glyph: "icon-sharp-axe", type: "weapon" },
            ranged: { label: "Marksman", text: "ranged", damage: "physical", glyph: "icon-crossbow", type: "weapon", modOverride: 0.01 },
            retributive: { label: "Retributive", text: "retributive", damage: "physical", glyph: "icon-spiked-shoulder-armor", type: "weapon" },
            flamespeaker: { label: "Flamespeaker", text: "flamespeaker", damage: "fire", glyph: "icon-fireflake", type: "skill" },
            tidecaller: { label: "Tidecaller", text: "tidecaller", damage: "water", glyph: "icon-waves", type: "skill" },
            stormseeker: { label: "Stormseeker", text: "stormseeker", damage: "air", glyph: "icon-fluffy-cloud", type: "skill" },
            duneshaper: { label: "Duneshaper", text: "duneshaper", damage: "earth", glyph: "icon-stone-sphere", type: "skill" },
            voidcantor: { label: "Voidcantor", text: "voidcantor", damage: "psychic", glyph: "icon-psionics", type: "skill" },
            deathbringer: { label: "Deathbringer", text: "deathbringer", damage: "piercing", glyph: "icon-death-zone", type: "skill" },
            shroudstalker: { label: "Shroudstalker", text: "shroudstalker", damage: "shadow", glyph: "icon-nested-eclipses", type: "skill" },
            formshifter: { label: "Formshifter", text: "formshifter", damage: "phys_armor", glyph: "icon-wolf-howl", type: "skill" },
            huntmaster: { label: "Huntmaster", text: "huntmaster", damage: "poison", glyph: "icon-pocket-bow", type: "skill" },
            warlord: { label: "Warlord", text: "warlord", damage: "physical", glyph: "icon-axe-sword", type: "skill" },
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
            religion: { label: "Religion", text: "religion", color: "#fffbcd", glyph: "icon-angel-outfit" },
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
            lifesteal: { label: "Lifesteal", text: "lifesteal" },
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
            str: { label: "Strength", text: "str", percent: true },
            dex: { label: "Dexterity", text: "dex", percent: true },
            int: { label: "Intellect", text: "int", percent: true },
            con: { label: "Constitution", text: "con", percent: true },
            mind: { label: "Mind", text: "mind", percent: false },
            wit: { label: "Wits", text: "wit", percent: true },
            none: { label: "None", text: "none" },
        },
        baseAbilityPoints: 1,
        baseAttributeScore: 10,
        attributeMax: 40,
        npcAttributeScalar: 1.9 / 10,
        npcArmorScalar: 20 / 100,
        npcAbilityScalar: 0.173,
        npcAbilityBase: 0.4,
        combatSkillMod: 0.05,   // amount to increase damage by for combat skills per level
        abilityMax: 10,
        baseCritBonus: 0.6,   // base critical damage bonus expressed as a percentage
        baseCritChance: 0.05,   // base critical hit chance expressed as a percentage
        baseMarkedBonus: 0.20,
        baseAccuracy: 0.95,
        dualwieldMult: 0.5,
        inspiredScalar: 1 / 7,
        statusChance: {
            oneHand: 10,
            twoHand: 20
        },
        weaponBonusDmgDie: 4,
        inspiredAttributes: ["str", "dex", "con", "int"],
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
        weaponDmgScalar: 0.153206, // used to calculate # of dice a weapon uses (1+0.153206*e^lvl dice)
        // info on different types of armor
        armor: {
            spreads: {
                none: { label: "Custom", phys: 0, mag: 0 },
                mage: { label: "Robes", phys: 15, mag: 90 },
                heavy: { label: "Heavy", phys: 90, mag: 15 },
                light: { label: "Light", phys: 50, mag: 30 },
                amulet: { label: "Amulet", phys: 0, mag: 100 },
                ring: { label: "Ring", phys: 0, mag: 100 },
                belt: { label: "Belt", phys: 100, mag: 0 },
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
            scalars: {
                helmet: 2.9,
                chest: 5.8,
                leggings: 3.9,
                gloves: 2.9,
                boots: 2.9,
                belt: 1.9,
                amulet: 2.3,
                ring: 1.6,
                none: 0,
            },
        },
        offhand: {
            spreads: {
                none: { label: "Custom", phys: 0, mag: 0 },
                shield: { label: "Shield", phys: 90, mag: 60 }
            },
            scalar: 9.68,
        },
        e: 1.27,
        equipmentSlots: {
            helmet: "Helmet",
            chest: "Chest",
            gloves: "Gloves",
            leggings: "Leggings",
            boots: "Boots",
            amulet: "Amulet",
            ring: "Ring",
            ring1: "Ring",
            ring2: "Ring",
            belt: "Belt",
            left: "Mainhand",
            right: "Offhand",
            none: "None",
        },
        npcStats: npcStatSpread,
        gearTypes: [
            "armor",
            "weapon",
            "offhand",
            "feature"
        ],
        socketable: [
            "armor",
            "weapon",
            "offhand"
        ],
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
            origin: "Background",
            species: "Ancestry",
            occupation: "Occupation",
            talent: "Talent"
        },
        damageCol: {
            hp: {
                gain: "#99cc00",
                lose: "#cc0000",
            },
            mag_armor: {
                gain: "#00ffff",
                lose: "#000066",
            },
            phys_armor: {
                gain: "#ffcc00",
                lose: "#806600",
            }
        },
        targetTypes: {
            none: { label: "None", options: [] },
            self: { label: "Self", options: [] },
            creature: { label: "Creatures", options: ["count"] },
            point: { label: "Point", options: [] },
            sphere: { label: "Sphere", measure: "circle", options: ["size"] },
            radius: { label: "Radius", measure: "circle", options: ["size"] },
            cylinder: { label: "Cylinder", measure: "circle", options: ["size"] },
            cone: { label: "Cone", measure: "cone", options: ["size"], angle: 60 },
            line: { label: "Line", measure: "ray", options: ["size"] },
        },
        auraTargets: {
            any: "All Creatures",
            ally: "Allies",
            enemy: "Enemies",
            type: "Creature Type",
        },
        creatureTypes: {
            humanoid: "Humanoid",
            undead: "Undead",
            animal: "Animal",
            monstrosity: "Monstrosity",
            fiend: "Fiend",
            fey: "Fey",
            elemental: "Elemental",
            aberration: "Aberration",
            ooze: "Ooze",
            dragon: "Dragon",
            splinter: "Splinter",
        },
        effectResists: {
            none: "None",
            mag: "Magic Armor",
            phys: "Physical Armor",
            any: "Any Armor",
        },
        skillTiers: {
            0: "Apprentice",
            1: "Novice",
            2: "Adept",
            3: "Expert",
            4: "Master"
        },
        // talent related constants
        tormentorStatuses: [
            "bleed",
            "burn",
            "burn+",
            "poison",
            "acid",
            "suffocate",
            "root"
        ],
        farsightBonus: 15,
        executeAp: 2,
        durableMult: 1.1,
        naturalArmorScale: 0.5,
        renewingArmorScale: 0.25,
        loneWolf: {
            ap: 2,
            hpMult: 1.3,
            armorMult: 1.6,
        },
        // item generation related constants
        itemRarities: {
            "Common": "Common",
            "Uncommon": "Uncommon",
            "Rare": "Rare",
            "Epic": "Epic",
            "Legendary": "Legendary",
            "Angelic": "Angelic",
            "Custom": "Custom",
        },
        socketTypes: {
            "None": "None",
            "Primary": "Primary",
            "RuneEmpty": "RuneEmpty",
            "Normal": "Normal",
            "Small": "Small",
            "Large": "Large",
            "Legendary": "Legendary",
            "Base": "Base",
            "BaseCommon": "BaseCommon",
            "BaseUncommon": "BaseUncommon",
            "BaseRare": "BaseRare",
            "BaseEpic": "BaseEpic",
        },
        itemSocketSpreads: itemSocketSpreadJson.types,
        itemPlugs: {
            armor: itemArmorPlugsJson.plugs,
            weapon: itemWeaponPlugsJson.plugs,
        },
        itemSockets: itemSocketJson.sockets,
        // canvas constants
        rangeOverlayCol: 0xffffff,
    };

    // set up data models
    CONFIG.Actor.dataModels = {
        player: PlayerData,
        npc: NpcData
    };

    CONFIG.Item.dataModels = {
        skill: SkillData,
        armor: ArmorData,
        weapon: WeaponData,
        offhand: OffhandData,
        feature: CelestusFeature,
        quickref: ReferenceData,
    }

    CONFIG.ActiveEffect.dataModels = {
        status: EffectData,
    }

    CONFIG.MeasuredTemplate.objectClass = CelestusMeasuredTemplate;
    CONFIG.Token.objectClass = CelestusToken;

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

    // set up PIXI stuff
    CONFIG.CELESTUS.reachOverlay = new PIXI.Graphics();
    CONFIG.CELESTUS.backstabOverlayTexture = PIXI.Texture.from('systems/celestus/svg/backstab-overlay.svg');
    CONFIG.CELESTUS.backstabOverlaySprite = new PIXI.Sprite(CONFIG.CELESTUS.backstabOverlayTexture);
    CONFIG.CELESTUS.backstabAreaTexture = PIXI.Texture.from('systems/celestus/svg/backstab-area.svg');
    CONFIG.CELESTUS.backstabAreaSprite = new PIXI.Sprite(CONFIG.CELESTUS.backstabAreaTexture);
    CONFIG.CELESTUS.backstabAreaSprite.tint = 0x0000FF;
    CONFIG.CELESTUS.backstabAreaSprite.alpha = 0.4;
    CONFIG.CELESTUS.backstabAreaSprite.zIndex = 1;
    CONFIG.CELESTUS.backstabAreaSprite.anchor.x = 0.5;
    CONFIG.CELESTUS.backstabAreaSprite.anchor.y = 0.5;

    // skill scripts
    CONFIG.CELESTUS.scripts = scripts;

    // create resources ui container
    let resourceUi = document.createElement("div");
    resourceUi.id = "ui-resources";
    resourceUi.classList.add("celestus");
    resourceUi.classList.add("resources-ui");
    $(resourceUi).on('click', '.ap-interact', resourceInteractAp);
    $(resourceUi).on('click', '.fp-interact', resourceInteractFp);
    document.getElementById("ui-bottom").appendChild(resourceUi);

    renderResourcesUi();

    // preload handlebars templates
    return preloadHandlebarsTemplates();

});

Hooks.on("ready", () => {
    $(document).on("click", ".attack", rollAttack);
    $(document).on("click", ".roll-crit", rollCrit);
    $(document).on("click", ".damage", rollDamage);
    $(document).on("click", ".apply-damage", applyDamageHook);
    $(document).on("click", ".apply-status", applyStatusHook);
    $(document).on("click", ".draw-template", drawTemplate);

});


// hook macro creation on hotbar drop
Hooks.on("hotbarDrop", (bar, data, slot) => {
    createCelestusMacro(data, slot);
    return false;
});

// append apply damage button to damage rolls for GM
Hooks.on("renderChatMessage", addChatButtons);
Hooks.on("renderChatMessage", renderDamageComponents);
// remove author from roll chat messages
Hooks.on("renderChatMessage", removeRollAuthor);

Hooks.on("renderHotbar", renderHotbarOverlay);
Hooks.on("renderHotbar", (application, html, data) => {
    // macro item hover
    html.on('mouseover', '.macro', async (ev) => {
        let actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character ?? _token?.actor ?? null;
        if ($('.item-hover').length) return;
        // get item from object
        let item = actor?.items.find(i => i.name === game.macros?.get($(ev.currentTarget).data("macroId"))?.name);
        if (!item) {
            const id = game.packs.get("celestus.skills").index.find(i => i.name === game.macros?.get($(ev.currentTarget).data("macroId"))?.name)?.uuid;
            if (id) {
                item = await fromUuid(id);
            }
            if (!item) return;
        }
        // render item description to html
        const path = `./systems/celestus/templates/rolls/item-parts/${item.type}-description.hbs`;
        const msgData = {
            name: item.name,
            flavor: item.system.description,
            portrait: item.img,
            item: item,
            system: item.system,
            config: CONFIG.CELESTUS,
        }
        let msg = await renderTemplate(path, msgData);
        // do text enrichment
        msg = await TextEditor.enrichHTML(
            msg,
            {
                // Only show secret blocks to owner
                secrets: item.isOwner,
                async: true,
                // For Actors and Items
                rollData: item.getRollData()
            }
        );
        // add item description to document
        const div = $(msg);
        div.addClass("item-hover");
        const uiPosition = $("#ui-middle").offset();
        div.css("left", uiPosition.left + $("#ui-middle").width() - 270);
        div.css("top", uiPosition.top);
        $("#ui-middle").append(div);
    })

    // item hover leave
    html.on('mouseleave', '.macro', () => {
        if ($(".item-hover").length) {
            $(".item-hover").remove();
            return;
        }
    })
})
// hook damage preview on token select
Hooks.on("controlToken", previewDamage);
Hooks.on("controlToken", (d, c) => { renderHotbarOverlay(c) });
Hooks.on("controlToken", renderResourcesUi);

// handle turn changes
Hooks.on("combatTurnChange", triggerTurn);

// handle combat start
Hooks.on("combatStart", startCombat);
// handle combat end
Hooks.on("preDeleteCombat", cleanupCombat);

// handle combat end
Hooks.on("updateToken", spreadAura);
Hooks.on("preUpdateToken", rotateOnMove);

// draw backstab overlay
Hooks.on("hoverToken", drawTokenHover);

// hbs helpers
Handlebars.registerHelper("repeat", (n, options) => {
    let output = ""
    let offset = parseInt(options.hash.offset);
    offset = isNaN(offset) ? 0 : offset;
    for (let i = 0; i < n; i++) {
        output += options.fn(this).replace('@index', i + offset);
    }
    return output;
});
Handlebars.registerHelper("percent", (n, options) => {
    let number = parseFloat(n);
    if (isNaN(number)) {
        return "";
    }
    number = Math.round(number * 100);
    const signStr = options.hash.sign ? (number >= 0 ? "+" : "") : "";
    return `${signStr}${number}${options.hash.symbol ? "%" : ""}`;
});
Handlebars.registerHelper("diff", (a, b) => {
    a = parseFloat(a);
    b = parseFloat(b);
    if (isNaN(a) || isNaN(b)) {
        return "";
    }
    return a - b;
});
Handlebars.registerHelper("sum", (a, b) => {
    a = parseFloat(a);
    b = parseFloat(b);
    if (isNaN(a) || isNaN(b)) {
        return "";
    }
    return a + b;
});

// attempt to bind to elevation ruler
const timeout = 10000;

// This is the promise code, so this is the useful bit
function awaitElevationRuler(timeout) {
    var start = Date.now();
    return new Promise(waitRuler);

    function waitRuler(resolve, reject) {
        if (CONFIG.elevationruler?.SPEED)
            resolve(true);
        else if (timeout && (Date.now() - start) >= timeout)
            reject(new Error("CELESTUS: ElevationRuler not detected."));
        else
            setTimeout(waitRuler.bind(this, resolve, reject), 30);
    }
}
awaitElevationRuler(timeout).then(function () {
    CONFIG.elevationruler.SPEED.CATEGORIES = [
        {
            name: "0 AP",
            color: Color.from(0x00ffff),
            multiplier: 0,
        },
        {
            name: "1 AP",
            color: Color.from(0x00ff00),
            multiplier: 1,
        },
        {
            name: "2 AP",
            color: Color.from(0xffff00),
            multiplier: 2
        },
        {
            name: "3 AP",
            color: Color.from(0xffbf00),
            multiplier: 3
        },
        {
            name: "4 AP",
            color: Color.from(0xff0000),
            multiplier: 4,
        },
        {
            name: "Maximum",
            color: Color.from(0x0000ff),
            multiplier: 5
        }
    ]
    CONFIG.elevationruler.SPEED.tokenSpeed = function (token) {
        return token.actor?.system?.attributes?.movement.value ?? 0;
    }
    CONFIG.elevationruler.SPEED.maximumCategoryDistance = function (token, speedCategory, tokenSpeed) {
        tokenSpeed ??= SPEED.tokenSpeed(token);
        if (tokenSpeed <= 1) {
            return Number.POSITIVE_INFINITY;
        }
        const mult = speedCategory?.multiplier ?? Number.POSITIVE_INFINITY;
        const mobile = (token.actor.getFlag("celestus", "mobile") ?? false) ? 1 : 0;
        return Math.min(mult + mobile, 5) * tokenSpeed;
    };
});