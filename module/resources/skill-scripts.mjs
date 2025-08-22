/**
 * Object containing scripts to run when executing skills
 * each script has the same signature
 * @param {Actor} origin: actor that is using the skill
 * @param {Token[]} targets: array of tokens to target with the skill
 */
export const scripts = {
  /**
   * Resets all cooldowns of combat skills that have positive cooldowns
   */
  skinGraft: async function (origin, targets) {
    for (const item of origin.items) {
      if (
        item.type === "skill" &&
        item.system.type !== "civil" &&
        item.system.cooldown.max > 0
      ) {
        await item.update({ "system.cooldown.value": 0 });
      }
    }
  },
  /**
   * Restore armor equal to the values granted by the equipped shield
   */
  shieldsUp: async function (origin, targets) {
    const equipped = origin.system.equipped;
    if (equipped.right?.type === "offhand") {
      // get base values
      const armor = equipped.right.system.value;
      const cPhys = origin.system.resources.phys_armor;
      const cMag = origin.system.resources.mag_armor;
      // calculate new values
      const newPhys = Math.min(cPhys.flat + armor.phys, cPhys.max);
      const newMag = Math.min(cMag.flat + armor.mag, cMag.max);
      // update values
      await origin.update({ "system.resources.phys_armor.flat": newPhys });
      await origin.update({ "system.resources.mag_armor.flat": newMag });
    }
  },
  /**
   * Restores all magic armor on targets
   */
  oceanBless: async function (origin, targets) {
    for (const target of targets) {
      await target.actor.update({
        "system.resources.mag_armor.flat":
          target.actor.system.resources.mag_armor.max,
      });
    }
  },
  /**
   * Create an effect on the origin actor based on the amount of creature surrounding it
   */
  thickOfIt: async function (origin, targets) {
    const active = origin.getActiveTokens()?.[0];
    if (!active) return;
    let count = 0;
    const scene = active.scene;
    const scale = scene.grid.distance / scene.grid.size;
    for (const token of scene.tokens) {
      const dist =
        Math.sqrt((active.x - token.x) ** 2 + (active.y - token.y) ** 2) *
        scale;
      if (dist <= 15) count++;
    }
    if (count > 0) {
      await origin.createEmbeddedDocuments("ActiveEffect", [
        {
          name: "In The Thick Of It",
          img: "icons/skills/social/diplomacy-unity-alliance.webp",
          type: "status",
          duration: { rounds: 3 },
          origin: origin.uuid,
          changes: [
            {
              key: "system.attributes.bonuses.damage.bonus",
              mode: 2,
              value: `+${count * 0.1}`,
            },
          ],
        },
      ]);
    }
  },
  /**
   * Swap vitality percentages of origin and target
   * (error if more than one target, error if target has phys armor)
   */
  vitalExchange: async function (origin, targets) {
    if (targets.length !== 1)
      return ui.notifications.warn(
        "CELESTUS | Only select one target to swap hp percents with (don't select the source actor)",
      );
    const target = targets[0].actor;
    if (!target)
      return ui.notifications.error("CELESTUS | Target token has no actor");
    // check for physical armor
    if (target.system.resources.phys_armor.value > 0)
      return ui.notifications.warn(
        "CELESTUS | Vital Exchange target has physical armor present",
      );
    // calculate percentages
    const percentOrigin = Math.max(
      origin.system.resources.hp.flat / origin.system.resources.hp.max,
      0,
    );
    const percentTarget = Math.max(
      target.system.resources.hp.flat / target.system.resources.hp.max,
      0,
    );
    // update to corresponding percentages
    await origin.update({
      "system.resources.hp.flat": Math.round(
        origin.system.resources.hp.max * percentTarget,
      ),
    });
    await target.update({
      "system.resources.hp.flat": Math.round(
        target.system.resources.hp.max * percentOrigin,
      ),
    });
  },
  /**
   * Draw a 15-foot radius template around each token with the dead condition
   */
  massCorpseplosion: async function (origin, targets) {
    // throw error if no canvas scene
    if (!canvas.scene)
      return ui.notifications.warn(
        "CELESTUS | No active scene to draw templates on",
      );
    // find active token
    const active = origin.getActiveTokens()?.[0];
    if (!active)
      return ui.notifications.warn(
        "CELESTUS | Unable to find token to use skill",
      );

    // get max dist
    let maxDist = 60;
    if (origin.getFlag("celestus", "farsight")) {
      maxDist += CONFIG.CELESTUS.farsightBonus;
    }

    // iterate through all tokens on canvas
    for (const token of canvas.scene.tokens) {
      // only draw template if token is dead
      if (!token.actor.effects.find((e) => e.name === "Dead")) continue;
      // check if token is within 60 feet of origin
      const dist = canvas.scene.grid.measurePath([
        active.center,
        token.object.center,
      ]);
      if (dist.distance > maxDist) continue;
      // check if point is within vision
      if (
        !canvas.visibility.testVisibility(token.object.center, {
          object: active,
        })
      )
        continue;
      // prepare base template
      const templateData = {
        user: game.user?.id,
        x: token.object.center.x,
        y: token.object.center.y,
        distance: 15,
        fillColor: "#ffffff",
        t: "circle",
        flags: { celestus: { clearThis: true } },
      };

      // create template
      const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
        parent: canvas.scene,
      });

      await canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [
        template.toObject(),
      ]);
    }
  },
  /**
   * Creates a 5-foot radius spiritfire surface under each target
   */
  narakanSpite: async function (origin, targets) {
    const canvasScale =
      (canvas.scene.grid.size / canvas.scene.grid.distance) * 2;
    for (const target of targets) {
      // prepare base template
      const templateData = {
        user: game.user?.id,
        x: target.center.x,
        y: target.center.y,
        distance: target.w / canvasScale + 2.5,
        t: "circle",
      };

      // create template
      const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
        parent: canvas.scene,
      });

      const [surface] = await canvas.scene?.createEmbeddedDocuments(
        "MeasuredTemplate",
        [template.toObject()],
      );

      if (surface) {
        await surface.setFlag("celestus", "origin", origin.uuid);
        await surface.setFlag("celestus", "temporary", true);
        if (game.combat) {
          await surface.setFlag("celestus", "linger", true);
          await surface.setFlag(
            "celestus",
            "lingerStartRound",
            game.combat.current.round,
          );
          await surface.setFlag(
            "celestus",
            "lingerStartTurn",
            game.combat.current.turn,
          );
        }
        await surface.setFlag("celestus", "surfaceType", "spiritfire");
        await surface.testAll({ tokens: true });
      }
    }
  },
  /**
   * Creates a 5-foot radius blood puddle under origin
   */
  bloodSac: async function (origin) {
    if (!origin) return;
    const canvasScale =
      (canvas.scene.grid.size / canvas.scene.grid.distance) * 2;
    const combat = game.combat;
    for (const token of origin.getActiveTokens()) {
      // prepare base template
      const templateData = {
        user: game.user?.id,
        x: token.center.x,
        y: token.center.y,
        distance: token.w / canvasScale + 2.5,
        t: "circle",
      };

      // create template
      const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
        parent: canvas.scene,
      });

      const [surface] = await canvas.scene?.createEmbeddedDocuments(
        "MeasuredTemplate",
        [template.toObject()],
      );

      if (surface) {
        await surface.setFlag("celestus", "origin", origin.uuid);
        await surface.setFlag("celestus", "temporary", true);
        if (combat) {
          await surface.setFlag("celestus", "linger", true);
          await surface.setFlag(
            "celestus",
            "lingerStartRound",
            combat.current.round,
          );
          await surface.setFlag(
            "celestus",
            "lingerStartTurn",
            combat.current.turn,
          );
        }
        await surface.setFlag("celestus", "surfaceType", "blood");
        await surface.testAll({ tokens: true });
      }
    }
  },
  /**
   * Restores target's hp to full and clears all temporary active effects
   */
  sacrifice: async function (origin, targets) {
    if (!targets) return;
    for (const target of targets) {
      // set target's hp to max
      await target.actor.update({
        "system.resources.hp.flat": target.actor.system.resources.hp.max,
      });
      // clear all temporary statues effects
      for (const effect of target.actor.effects) {
        if (effect.isTemporary && !effect.getFlag("celestus", "isChild")) {
          await effect.delete();
        }
      }
    }
  },
  /**
   * Creates an oil surface under each hostile creature within a 60-foot radius of the origin
   */
  rockfall: async function (origin, targets) {
    const canvasScale =
      (canvas.scene.grid.size / canvas.scene.grid.distance) * 2;

    // iterate through all targets
    for (const token of targets) {
      // prepare base template
      const templateData = {
        user: game.user?.id,
        x: token.center.x,
        y: token.center.y,
        distance: token.w / canvasScale + 5,
        t: "circle",
      };

      // create template
      const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
        parent: canvas.scene,
      });

      const [surface] = await canvas.scene?.createEmbeddedDocuments(
        "MeasuredTemplate",
        [template.toObject()],
      );

      if (surface) {
        await surface.setFlag("celestus", "origin", origin.uuid);
        await surface.setFlag("celestus", "temporary", true);
        if (game.combat) {
          await surface.setFlag("celestus", "linger", true);
          await surface.setFlag(
            "celestus",
            "lingerStartRound",
            combat.current.round,
          );
          await surface.setFlag(
            "celestus",
            "lingerStartTurn",
            combat.current.turn,
          );
        }
        await surface.setFlag("celestus", "surfaceType", "oil");
        await surface.testAll({ tokens: true });
      }
    }
  },
  /**
   * Creates an oil surface under each target
   */
  combust: async function (origin, targets) {
    const canvasScale =
      (canvas.scene.grid.size / canvas.scene.grid.distance) * 2;

    // iterate through all targets
    for (const token of targets) {
      // prepare base template
      const templateData = {
        user: game.user?.id,
        x: token.center.x,
        y: token.center.y,
        distance: token.w / canvasScale + 10,
        t: "circle",
      };

      // create template
      const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
        parent: canvas.scene,
      });

      const [surface] = await canvas.scene?.createEmbeddedDocuments(
        "MeasuredTemplate",
        [template.toObject()],
      );

      if (surface) {
        await surface.setFlag("celestus", "origin", origin.uuid);
        await surface.setFlag("celestus", "temporary", true);
        if (game.combat) {
          await surface.setFlag("celestus", "linger", true);
          await surface.setFlag(
            "celestus",
            "lingerStartRound",
            combat.current.round,
          );
          await surface.setFlag(
            "celestus",
            "lingerStartTurn",
            combat.current.turn,
          );
        }
        await surface.setFlag("celestus", "surfaceType", "fire");
        await surface.testAll({ tokens: true });
      }
    }
  },
  /**
   * Sums up hp and armor percentages and redistributes them equally
   */
  redistribute: async function (origin, targets) {
    if (!targets.length) return;
    let numPhys = targets.length;
    let numMag = targets.length;
    let numHp = targets.length;
    let physArmorTotal = 0;
    let magArmorTotal = 0;
    let hpTotal = 0;
    for (const target of targets) {
      if (target.actor?.system?.resources?.hp.flat < 1) {
        numPhys--;
        numMag--;
        numHp--;
        continue;
      }
      if (target.actor.system.resources.hp.max) {
        hpTotal +=
          target.actor.system.resources.hp.flat /
          target.actor.system.resources.hp.max;
      } else {
        numHp--;
      }
      if (target.actor.system.resources.phys_armor.max) {
        physArmorTotal +=
          target.actor.system.resources.phys_armor.flat /
          target.actor.system.resources.phys_armor.max;
      } else {
        numPhys--;
      }
      if (target.actor.system.resources.mag_armor.max) {
        magArmorTotal +=
          target.actor.system.resources.mag_armor.flat /
          target.actor.system.resources.mag_armor.max;
      } else {
        numMag--;
      }
    }
    // calculate new averages
    const avgPhysArmor = physArmorTotal / numPhys;
    const avgMagArmor = magArmorTotal / numMag;
    const avgHp = hpTotal / numHp;
    for (const target of targets) {
      if (target.actor?.system?.resources?.hp.flat < 1) continue;
      if (target.actor.system.resources.hp.max) {
        await target.actor.update({
          "system.resources.hp.flat": Math.round(
            target.actor.system.resources.hp.max * avgHp,
          ),
        });
      }
      if (target.actor.system.resources.hp.max) {
        await target.actor.update({
          "system.resources.phys_armor.flat": Math.round(
            target.actor.system.resources.phys_armor.max * avgPhysArmor,
          ),
        });
      }
      if (target.actor.system.resources.hp.max) {
        await target.actor.update({
          "system.resources.mag_armor.flat": Math.round(
            target.actor.system.resources.mag_armor.max * avgMagArmor,
          ),
        });
      }
    }
  },
  /**
   * kill target if their hp percent is 20 or less
   */
  execute: async function (origin, targets) {
    if (!targets.length) return;
    for (const target of targets) {
      if (target.actor.system.resources.hp.percent < 20) {
        if (target.actor.type === "player") {
          await target.actor.update({
            "system.resources.hp.flat": -target.actor.system.resources.hp.max,
          });
        } else {
          await target.actor.update({ "system.resources.hp.flat": 0 });
        }
        await target.actor.toggleStatusEffect("dead", { active: true });
      }
    }
  },
  /**
   * Draws a 5-foot radius circle under each token
   */
  draw5RadiusEach: async function (origin, targets) {
    const canvasScale =
      (canvas.scene.grid.size / canvas.scene.grid.distance) * 2;

    // iterate through all targets
    for (const token of targets) {
      // prepare base template
      const templateData = {
        user: game.user?.id,
        x: token.center.x,
        y: token.center.y,
        distance: token.w / canvasScale + 5,
        t: "circle",
        flags: { celestus: { clearThis: true } },
      };

      // create template
      const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
        parent: canvas.scene,
      });

      const [surface] = await canvas.scene?.createEmbeddedDocuments(
        "MeasuredTemplate",
        [template.toObject()],
      );

      if (surface) {
        await surface.setFlag("celestus", "temporary", true);
        await surface.setFlag("celestus", "surfaceType", "none");
        await surface.testAll({ tokens: true });
      }
    }
  },
  /**
   * Modified draw5RadiusEach that creates blood surfaces
   */
  gorestorm: async function (origin, targets) {
    const canvasScale =
      (canvas.scene.grid.size / canvas.scene.grid.distance) * 2;

    // iterate through all targets
    for (const token of targets) {
      // prepare base template
      const templateData = {
        user: game.user?.id,
        x: token.center.x,
        y: token.center.y,
        distance: token.w / canvasScale + 5,
        t: "circle",
      };

      // create template
      const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
        parent: canvas.scene,
      });

      const [surface] = await canvas.scene?.createEmbeddedDocuments(
        "MeasuredTemplate",
        [template.toObject()],
      );

      if (surface) {
        await surface.setFlag("celestus", "temporary", true);
        if (game.combat) {
          await surface.setFlag("celestus", "linger", true);
          await surface.setFlag(
            "celestus",
            "lingerStartRound",
            game.combat.current.round,
          );
          await surface.setFlag(
            "celestus",
            "lingerStartTurn",
            game.combat.current.turn,
          );
        }
        await surface.setFlag("celestus", "surfaceType", "blood");
        await surface.testAll({ tokens: true });
      }
    }
  },
  /**
   * Destroy's targets' physical armor if it is lower than the origins
   */
  devastate: async function (origin, targets) {
    const originArmor = origin.system.resources.phys_armor.value;
    for (const token of targets) {
      if (token.actor.system.resources.phys_armor.value <= originArmor) {
        token.actor.update({ "system.resources.phys_armor.flat": 0 });
        token.actor.update({ "system.resources.phys_armor.temp": 0 });
      }
    }
  },
  /**
   * Prompt user to select surface they are standing on from dropdown
   * Create an AE on actor that has a damage rider associated with the surface
   */
  elementalArrows: function (origin) {
    // prompt user
    let selectOptions = "";
    for (const [type, details] of Object.entries(
      CONFIG.CELESTUS.surfaceTypes,
    )) {
      selectOptions += `<option value="${type}">${details.label}</option>`;
    }

    const duration = 3;
    let effectiveness = 0.5 + 0.025 * origin.system.attributes.level;

    // create application popup
    new foundry.applications.api.DialogV2({
      window: { title: "Elemental Arrowheads" },
      content: `
                <h3>What surface type is the character on?</h3>
                <div class="form-group">
                    <label>Surface Type</label>
                    <div class="form-fields">
                        <select name="surfaceType">
                            ${selectOptions}
                        </select>
                    </div>
                </div>
            `,
      buttons: [
        {
          action: "submit",
          label: "Confirm",
          default: true,
          callback: (event, button, dialog) =>
            button.form.elements.surfaceType.value,
        },
      ],
      submit: async (result) => {
        if (!result) return;
        // get surface info
        const surface = CONFIG.CELESTUS.surfaceTypes[result];
        if (!surface) return;
        // conditional half for blood surfaces
        if (result.includes("blood")) effectiveness /= 2;
        // create ActiveEffect data
        const data = {
          name: surface.arrowheads.name,
          type: "status",
          duration: { rounds: duration },
          img: "icons/magic/symbols/elements-air-earth-fire-water.webp",
          system: {
            damageRiders: [
              { type: surface.arrowheads.damage, value: effectiveness },
            ],
          },
        };
        // create effect on actor
        await origin.createEmbeddedDocuments("ActiveEffect", [data]);
      },
    }).render({ force: true });
  },
  /**
   * Give temp phys and mag armor equal to max
   */
  unshakeable: async function (origin) {
    await origin.update({
      "system.resources.phys_armor.temp":
        origin.system.resources.phys_armor.max,
    });
    await origin.update({
      "system.resources.mag_armor.temp": origin.system.resources.mag_armor.max,
    });
  },
};
