export let statuses = [
    {
        id: "dead",
        name: "Dead",
        img: "icons/svg/skull.svg"
    },
    {
        id: "unconscious",
        name: "Unconscious",
        img: "icons/svg/unconscious.svg"
    },
    {
        id: "burn",
        name: "Burning",
        img: "icons/svg/fire.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            damage: [{ type: "fire", value: 1 }],
            resistedBy: "mag",
            removes: ["warm", "wet", "chill", "oil"],
            blocks: ["warm"],
        },
        changes: [
            {
                key: "system.attributes.resistance.water.bonus",
                value: "+0.1",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.fire.bonus",
                value: "-0.15",
                mode: 2,
            },
        ],
    },
    {
        id: "warm",
        name: "Warm",
        img: "systems/celestus/svg/thermometer-hot.svg",
        type: "status",
        duration: { rounds: 3 },
        system: {
            resistedBy: "none",
            combines: [{ with: "warm", makes: "burn" }, { with: "oil", makes: "burn" }],
            removes: ["wet", "chill"],
        },
        changes: [
            {
                key: "system.attributes.resistance.water.bonus",
                value: "+0.1",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.fire.bonus",
                value: "-0.15",
                mode: 2,
            },
        ],
    },
    {
        id: "burn+",
        name: "Spiritfire",
        img: "systems/celestus/svg/burning-skull.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            damage: [{ type: "fire", value: 1 }],
            resistedBy: "mag",
            blocks: ["warm", "wet", "chill", "oil", "burn"],
        },
        changes: [
            {
                key: "system.attributes.resistance.fire.bonus",
                value: "-0.2",
                mode: 2,
            },
        ],
    },
    {
        id: "shock",
        name: "Shocked",
        img: "systems/celestus/svg/round-struck.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            resistedBy: "mag",
            combines: [{ with: "wet", makes: "stun" }, { with: "shock", makes: "stun" }],
        },
        changes: [
            {
                key: "system.resources.ap.start",
                value: "-1",
                mode: 2,
            },
            {
                key: "system.attributes.bonuses.evasion.mod",
                value: "-0.3",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.earth.bonus",
                value: "+0.1",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.air.bonus",
                value: "-0.15",
                mode: 2,
            },
        ]
    },
    {
        id: "stun",
        name: "Stunned",
        img: "systems/celestus/svg/electric.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            resistedBy: "mag",
            removes: ["wet"],
            blocks: ["shock", "frozen", "petrify", "sleep", "fear", "charm"],
        },
        changes: [
            {
                key: "system.attributes.bonuses.evasion.mod",
                value: "-1",
                mode: 2,
            },
            {
                key: "system.attributes.movement.mod",
                value: "-1",
                mode: 5,
            },
            {
                key: "system.attributes.resistance.earth.bonus",
                value: "+0.1",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.air.bonus",
                value: "-0.15",
                mode: 2,
            },
            {
                key: "flags.celestus.incapacitated",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "soothe",
        name: "Soothed",
        img: "systems/celestus/svg/magic-shield.svg",
        type: "status",
        duration: { rounds: 0 },
        system: {
            removes: ["burn", "frozen", "poison", "stun", "suffocate", "petrify", "oil", "shock"]
        }

    },
    {
        id: "petrify",
        name: "Petrified",
        img: "systems/celestus/svg/golem-head.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            resistedBy: "mag",
            removes: ["wet", "oil"],
            blocks: ["frozen", "burn", "burn+", "stun", "poison", "fear", "prone", "chill", "warm", "bleed", "taunt", "sleep",],
        },
        changes: [
            {
                key: "system.attributes.bonuses.evasion.mod",
                value: "-1",
                mode: 2,
            },
            {
                key: "system.attributes.movement.mod",
                value: "-1",
                mode: 5,
            },
            {
                key: "system.attributes.resistance.fire.bonus",
                value: "+0.1",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.earth.bonus",
                value: "-0.2",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.air.bonus",
                value: "+0.1",
                mode: 2,
            },
            {
                key: "flags.celestus.incapacitated",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "poison",
        name: "Poisoned",
        img: "icons/svg/poison.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            damage: [{ type: "poison", value: 1 }],
            resistedBy: "mag",
        },
    },
    {
        id: "acid",
        name: "Acid",
        img: "icons/svg/acid.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            damage: [{ type: "phys_armor", value: "-1" }]
        }
    },
    {
        id: "oil",
        name: "Oily",
        img: "systems/celestus/svg/oily-spiral.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            damage: [],
            combines: [{ "warm": "burn" }],
            removes: ["wet"],
            blocks: ["invisible"],
            triggers: ["slow"],
        },
        changes: [
            {
                key: "system.attributes.resistance.water.bonus",
                value: "+0.1",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.fire.bonus",
                value: "-0.2",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.earth.bonus",
                value: "-0.1",
                mode: 2,
            },
            {
                key: "flags.celestus.flammable",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "root",
        name: "Rooted",
        img: "systems/celestus/svg/tentacle-strike.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "mag",
        },
        changes: [
            {
                key: "system.attributes.movement.bonus",
                value: "-1",
                mode: 5,
            },
            {
                key: "system.attributes.bonuses.evasion.bonus",
                value: "-0.5",
                mode: 2,
            },
            {
                key: "flags.celestus.grounded",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "maim",
        name: "Maimed",
        img: "systems/celestus/svg/nailed-foot.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            resistedBy: "phys",
        },
        changes: [
            {
                key: "system.attributes.movement.bonus",
                value: "-1",
                mode: 5,
            },
            {
                key: "system.attributes.bonuses.evasion.bonus",
                value: "-0.3",
                mode: 2,
            },
        ],
    },
    {
        id: "fortify",
        name: "Fortified",
        img: "systems/celestus/svg/edged-shield.svg",
        type: "status",
        duration: { rounds: 0 },
        system: {
            removes: ["poison", "bleed", "burn", "burn+", "acid", "decay"],
        },
    },
    {
        id: "regen",
        name: "Regenerating",
        img: "icons/svg/regen.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            damage: [{ type: "healing", value: 1.25 }],
            removes: ["bleed", "poison", "burn", "warm"],
        }
    },
    {
        id: "heal",
        name: "Healing",
        img: "systems/celestus/svg/heart-plus.svg",
        type: "status",
        duration: { rounds: 3 },
        system: {
            damage: [{ type: "healing", value: 1 }],
        }
    },
    {
        id: "wet",
        name: "Wet",
        img: "systems/celestus/svg/drop.svg",
        type: "status",
        duration: { rounds: 3 },
        system: {
            resistedBy: "none",
            combines: [{ with: "chill", makes: "frozen" }, { with: "shock", makes: "stun" }],
            removes: ["warm", "burn", "invisible", "oil"],
        },
        changes: [
            {
                key: "system.attributes.resistance.water.bonus",
                value: "-0.1",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.air.bonus",
                value: "-0.2",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.fire.bonus",
                value: "+0.1",
                mode: 2,
            },
        ],
    },
    {
        id: "chill",
        name: "Chilled",
        img: "systems/celestus/svg/thermometer-cold.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "mag",
            combines: [{ with: "wet", makes: "frozen" }, { with: "chill", makes: "frozen" }],
            removes: ["warm", "burn"],
        },
        changes: [
            {
                key: "system.attributes.resistance.water.bonus",
                value: "-0.2",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.air.bonus",
                value: "-0.1",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.fire.bonus",
                value: "+0.1",
                mode: 2,
            },
            {
                key: "system.attributes.bonuses.evasion.bonus",
                value: "-0.3",
                mode: 2,
            },
            {
                key: "system.attributes.movement.bonus",
                value: "-0.35",
                mode: 2,
            }
        ],
    },
    {
        id: "frozen",
        name: "Frozen",
        img: "icons/svg/frozen.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            damage: [],
            resistedBy: "mag",
            removes: ["wet", "oil"],
            blocks: ["stun", "chill", "poison", "charm", "fear", "bleed", "petrify", "taunt", "sleep", "burn"],
        },
        changes: [
            {
                key: "system.attributes.movement.bonus",
                value: "-1",
                mode: 5,
            },
            {
                key: "system.attributes.resistance.water.bonus",
                value: "-0.2",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.fire.bonus",
                value: "+0.2",
                mode: 2,
            },
            {
                key: "system.attributes.resistance.earth.bonus",
                value: "+0.2",
                mode: 2,
            },
            {
                key: "system.attributes.bonuses.evasion.bonus",
                value: "-1",
                mode: 2,
            },
        ],
    },
    {
        id: "psychosis",
        name: "Psychosis",
        img: "systems/celestus/svg/bleeding-eye.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            damage: [{ type: "psychic", value: 1 }],
            resistedBy: "mag",
        },
        changes: [
            {
                key: "system.attributes.resistance.psychic.bonus",
                value: "-0.15",
                mode: 2,
            },
        ],
    },
    {
        id: "enlighten",
        name: "Clear Minded",
        img: "systems/celestus/svg/third-eye.svg",
        type: "status",
        duration: { rounds: 3 },
        system: {
            blocks: ["rage", "charm", "fear", "sleep", "taunt", "mad", "daze", "psychosis"],
        },
        changes: [
            {
                key: "flags.celestus.enlightened",
                value: "true",
                mode: 5,
            }
        ],
    },
    {
        id: "rage",
        name: "Raging",
        img: "systems/celestus/svg/mighty-force.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            blocks: ["charm", "fear", "sleep", "mad"],
        },
        changes: [
            {
                key: "flags.celestus.silenced",
                value: "true",
                mode: 5,
            },
            {
                key: "system.attributes.bonuses.crit_chance.bonus",
                value: "+1",
                mode: 2,
            }
        ],
    },
    {
        id: "haste",
        name: "Hasted",
        img: "icons/svg/wingfoot.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            removes: ["slow", "maim"],
        },
        changes: [
            {
                key: "system.resources.ap.start",
                value: "+1",
                mode: 2,
            },
            {
                key: "system.attributes.movement.bonus",
                value: "+0.5",
                mode: 2,
            }
        ],
    },
    {
        id: "fly",
        name: "Flying",
        img: "icons/svg/wing.svg",
        type: "status",
        duration: { rounds: 4 },
        changes: [
            {
                key: "flags.celestus.flying",
                value: "true",
                mode: 5,
            }
        ],
    },
    {
        id: "invisible",
        name: "Invisible",
        img: "icons/svg/invisible.svg",
        type: "status",
        duration: { rounds: 5 },
        changes: [
            {
                key: "flags.celestus.invisible",
                value: "true",
                mode: 5,
            }
        ],
    },
    {
        id: "patched",
        name: "Patched Up",
        img: "systems/celestus/svg/caduceus.svg",
        type: "status",
        duration: { rounds: 0 },
        system: {
            removes: ["maim", "atrophy", "blind", "prone", "bleed", "disease", "silence",],
        }
    },
    {
        id: "slow",
        name: "Slowed",
        img: "icons/svg/anchor.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            removes: ["haste"],
        },
        changes: [
            {
                key: "system.attributes.bonuses.evasion.bonus",
                value: "-0.3",
                mode: 2,
            },
            {
                key: "system.attributes.movement.bonus",
                value: "-0.5",
                mode: 2,
            }
        ],
    },
    {
        id: "bleed",
        name: "Bleeding",
        img: "icons/svg/blood.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "phys",
            damage: [{ type: "piercing", value: 1 }],
        }
    },
    {
        id: "blind",
        name: "Blind",
        img: "systems/celestus/svg/sight-disabled.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "mag",
        },
        changes: [
            {
                key: "system.attributes.bonuses.accuracy.bonus",
                value: "-0.35",
                mode: 2,
            },
            {
                key: "system.attributes.bonuses.evasion.bonus",
                value: "-0.5",
                mode: 2,
            }
        ],
    },
    {
        id: "charm",
        name: "Charmed",
        img: "systems/celestus/svg/charm.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "mag",
        },
    },
    {
        id: "atrophy",
        name: "Atrophied",
        img: "systems/celestus/svg/drop-weapon.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            resistedBy: "phys",
        },
        changes: [
            {
                key: "flags.celestus.disarmed",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "decay",
        name: "Decaying",
        img: "icons/svg/degen.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "phys",
        },
        changes: [
            {
                key: "system.attributes.resistance.healing.bonus",
                value: "+2",
                mode: 2,
            },
        ],
    },
    {
        id: "disease",
        name: "Diseased",
        img: "icons/svg/biohazard.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "phys",
        },
        changes: [
            {
                key: "system.abilities.con.bonus",
                value: "-2",
                mode: 2,
            },
            {
                key: "system.attributes.bonuses.damage.bonus",
                value: "-0.35",
                mode: 2,
            }
        ],
    },
    {
        id: "prone",
        name: "Prone",
        img: "icons/svg/falling.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            resistedBy: "phys",
        },
        changes: [
            {
                key: "flags.celestus.incapacitated",
                value: "true",
                mode: 5,
            },
            {
                key: "system.attributes.movement.mod",
                value: "-1",
                mode: 5,
            },
        ]
    },
    {
        id: "suffocate",
        name: "Suffocating",
        img: "systems/celestus/svg/lungs.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            damage: [{ type: "mag_armor", value: -1 }],
        },
    },
    {
        id: "silence",
        name: "Silenced",
        img: "systems/celestus/svg/silenced.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "mag",
        },
        changes: [
            {
                key: "flags.celestus.silenced",
                value: "true",
                mode: 5,
            }
        ],
    },
    {
        id: "fear",
        name: "Terrified",
        img: "icons/svg/terror.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            resistedBy: "mag",
            removes: ["charm", "mad"],
        },
    },
    {
        id: "mad",
        name: "Mad",
        img: "systems/celestus/svg/delighted.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            removes: ["charm", "fear"],
            resistedBy: "mag",
        },
    },
    {
        id: "sleep",
        name: "Asleep",
        img: "icons/svg/sleep.svg",
        type: "status",
        duration: { rounds: 2 },
        system: {
            resistedBy: "mag",
        },
        changes: [
            {
                key: "system.attributes.bonuses.evasion.mod",
                value: "-1",
                mode: 2,
            },
            {
                key: "system.attributes.movement.mod",
                value: "-1",
                mode: 5,
            },
            {
                key: "flags.celestus.incapacitated",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "mark",
        name: "Marked",
        img: "systems/celestus/svg/convergence-target.svg",
        type: "status",
        duration: { rounds: 5 },
        system: {
            blocks: ["invisible"],
        },
        changes: [
            {
                key: "flags.celestus.marked",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "daze",
        name: "Dazed",
        img: "systems/celestus/svg/knocked-out.svg",
        type: "status",
        duration: { rounds: 1 },
        system: {
            resistedBy: "mag",
            blocks: ["fear", "charm", "taunt", "sleep",],
        },
        changes: [
            {
                key: "system.attributes.bonuses.evasion.mod",
                value: "-1",
                mode: 2,
            },
            {
                key: "system.attributes.movement.mod",
                value: "-1",
                mode: 5,
            },
            {
                key: "system.attributes.resistance.psychic.bonus",
                value: "-0.25",
                mode: 2,
            },
            {
                key: "flags.celestus.incapacitated",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "inspire",
        name: "Inspired",
        img: "icons/svg/light.svg",
        type: "status",
        duration: { rounds: 3 },
        changes: [
            {
                key: "flags.celestus.inspired",
                value: "true",
                mode: 5,
            },
        ],
    },
    {
        id: "torch",
        name: "Torch",
        img: "systems/celestus/svg/torch.svg",
        type: "status",
        duration: { },
        temporary: false,
        changes: [
            {
                key: "ATL.light.dim",
                value: 40,
                mode: 5,
            },
            {
                key: "ATL.light.bright",
                value: 20,
                mode: 5,
            },
            {
                key: "ATL.light.color",
                value: "#f98026",
                mode: 5,
            },
            {
                key: "ATL.light.alpha",
                value: 0.4,
                mode: 5,
            },
            {
                key: "ATL.light.animation",
                value: '{"type": "torch","speed": 1,"intensity": 1}',
                mode: 5,
            }
        ],
    },
];