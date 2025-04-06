/**
* Types of surfaces
* label: text for display
* color: color to use for measuredTemplates representing it
* schools: skill schools associated with surface
* duration: default duration in rounds to linger when created from combination
* onEnd: surface type to change to on duration max instead of dying
* statuses: ids of statusEffects this gives
* combines: object of surfaces it interacts with and interaction mode
*              corrupt: if intersect, change other type
*              override: if other is contained within this, delete other
*              combine: Object describing combination mode
*                  makes: product
*                  corrupts: boolean, if this transforms whole target surface to type
*                                  if this is fully within other shape this goes away
* damageCombines: object of damage types it reacts to damage-type: surface-type
* texture: path to tileable texture to render over template
*/
export const surfaceTypes = {
    none: {
        label: "None",
        color: "#ffffff"
    },
    fire: {
        label: "Fire",
        color: "#ff4000",
        schools: ["flamespeaker"],
        duration: 2,
        statuses: ["burn"],
        combines: {
            oil: { mode: "corrupt" },
            poison: { mode: "corrupt" },
            water: { mode: "combine", makes: "fog" },
            ice: { mode: "combine", makes: "water", corrupts: true },
            frozen_blood: { mode: "combine", makes: "blood", corrupts: true },
            frozen_poison: { mode: "combine", makes: "fire", corrupts: true },
        },
        arrowheads: { name: "Flaming Arrowheads", damage: "fire" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements/Elements_01-512x512-25.webp"
    },
    spiritfire: {
        label: "Spirit Fire",
        color: "#00ffff",
        schools: ["flamespeaker"],
        duration: 2,
        statuses: ["burn+"],
        combines: {
            oil: { mode: "corrupt" },
            poison: { mode: "corrupt" },
            fire: { mode: "corrupt" },
            water: { mode: "override" },
            ice: { mode: "combine", makes: "water", corrupts: true },
            frozen_blood: { mode: "combine", makes: "blood", corrupts: true },
            frozen_poison: { mode: "combine", makes: "spiritfire", corrupts: true },
        },
        arrowheads: { name: "Flaming Arrowheads", damage: "fire" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Spiritfire-2-25.webp"
    },
    water: {
        label: "Water",
        color: "#3333cc",
        schools: ["tidecaller"],
        duration: 99,
        combines: {
            oil: { mode: "override" },
            fire: { mode: "override" },
            blood: { mode: "override" },
            poison: { mode: "override" },
        },
        damageCombines: {
            air: "electric_water",
        },
        arrowheads: { name: "Frozen Arrowheads", damage: "water" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements/Elements_20-512x512-25.webp"
    },
    ice: {
        label: "Ice",
        color: "#99ccff",
        schools: ["tidecaller"],
        duration: 3,
        onEnd: "water",
        combines: {
            oil: { mode: "override" },
            fire: { mode: "override" },
            water: { mode: "corrupt" },
            electric_water: { mode: "corrupt" },
            poison: { mode: "combine", makes: "frozen_poison", corrupts: true },
            blood: { mode: "combine", makes: "frozen_blood", corrupts: true },
            electric_blood: { mode: "combine", makes: "frozen_blood", corrupts: true },
        },
        damageCombines: {
            fire: "water",
        },
        arrowheads: { name: "Frozen Arrowheads", damage: "water" },
       texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Ice-25.webp"
    },
    electric_water: {
        label: "Electrified Water",
        color: "#3333cc",
        schools: ["stormseeker", "tidecaller"],
        duration: 4,
        statuses: ["shock"],
        combines: {
            oil: { mode: "override" },
            fire: { mode: "override" },
            blood: { mode: "override" },
            poison: { mode: "override" },
            water: { mode: "combine", makes: "electric_water", corrupts: true },
            blood: { mode: "combine", makes: "electric_blood", corrupts: true },
        },
        arrowheads: { name: "Frozen Arrowheads", damage: "water" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Lightning-water-25-100.webp"
    },
    oil: {
        label: "Oil",
        color: "#d28f79",
        schools: ["duneshaper"],
        duration: 2,
        statuses: ["slow"],
        combines: {
            ice: { mode: "override" },
            water: { mode: "override" },
            blood: { mode: "override" },
            poison: { mode: "override" },
        },
        damageCombines: {
            fire: "fire",
        },
        arrowheads: { name: "Oily Arrowheads", damage: "earth" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Oil-mud-50.webp"
    },
    poison: {
        label: "Poison",
        color: "#33cc33",
        schools: ["duneshaper"],
        duration: 2,
        statuses: ["poison"],
        combines: {
            ice: { mode: "override" },
            water: { mode: "override" },
            blood: { mode: "override" },
            oil: { mode: "override" },
        },
        damageCombines: {
            fire: "fire",
        },
        arrowheads: { name: "Toxic Arrowheads", damage: "poison" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Poison-25.webp"
    },
    frozen_poison: {
        label: "Frozen Poison",
        color: "#33cc33",
        schools: ["duneshaper", "tidecaller"],
        duration: 2,
        combines: {
            ice: { mode: "override" },
            poison: { mode: "corrupt" },
            oil: { mode: "override" },
            blood: { mode: "combine", makes: "frozen_blood", corrupts: true },
            electric_blood: { mode: "combine", makes: "frozen_blood", corrupts: true },
            water: { mode: "combine", makes: "ice", corrupts: true },
            electric_water: { mode: "combine", makes: "ice", corrupts: true },
        },
        damageCombines: {
            fire: "fire",
        },
        arrowheads: { name: "Toxic Arrowheads", damage: "poison" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Frozen-poison-25.webp"
    },
    blood: {
        label: "Blood",
        color: "#cc0000",
        schools: ["deathbringer"],
        duration: 99,
        combines: {
            ice: { mode: "override" },
            water: { mode: "override" },
            fire: { mode: "override" },
        },
        damageCombines: {
            air: "electric_blood",
        },
        arrowheads: { name: "Bloodied Arrowheads", damage: "piercing" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Blood-3-25.webp"
    },
    electric_blood: {
        label: "Electrified Blood",
        color: "#cc0000",
        schools: ["stormseeker", "deathbringer"],
        statuses: ["shock"],
        combines: {
            ice: { mode: "override" },
            water: { mode: "override" },
            fire: { mode: "override" },
            water: { mode: "combine", makes: "electric_water", corrupts: true },
            blood: { mode: "combine", makes: "electric_blood", corrupts: true },
        },
        arrowheads: { name: "Bloodied Arrowheads", damage: "piercing" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Lightning-blood-25-100.webp"
    },
    frozen_blood: {
        label: "Frozen Blood",
        color: "#cc0000",
        schools: ["deathbringer", "tidecaller"],
        combines: {
            ice: { mode: "override" },
            fire: { mode: "override" },
            water: { mode: "combine", makes: "ice", corrupts: true },
            electric_water: { mode: "combine", makes: "ice", corrupts: true },
            poison: { mode: "combine", makes: "frozen_poison", corrupts: true },
            blood: { mode: "corrupt" },
            electric_blood: { mode: "corrupt" },
        },
        arrowheads: { name: "Bloodied Arrowheads", damage: "piercing" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Frozen-blood-25.webp"
    },
    fog: {
        label: "Fog",
        color: "#cccccc",
        schools: ["stormseeker"],
        damageCombines: {
            air: "electric_fog",
        },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Fog-2-50.webp"
    },
    electric_fog: {
        label: "Electric Fog",
        color: "#cccccc",
        schools: ["stormseeker"],
        statuses: ["shock"],
        arrowheads: { name: "Electrified Arrowheads", damage: "air" },
        texture: "systems/celestus/assets/CC/Screaming%20Brain%20Studios/Elements-Modified/Lightning-cloud-2-50.webp"
    },
};