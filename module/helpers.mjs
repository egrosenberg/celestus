/** awaits a certain time */
export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Creates a prompt allowing a user to create a damage roll with no actor or sheet
 */
export function improviseDamage() {
  let select = "";
  for (const [type, info] of Object.entries(CONFIG.CELESTUS.damageTypes)) {
    select += `<option value="${type}">${info.label}</option>`;
  }

  new foundry.applications.api.DialogV2({
    window: { title: "Improvise damage roll", width: 400 },
    content: `
        <div class="form-group" style="min-width: 400px">
            <label>Damage Level</label>
            <div class="form-fields">
                <input type="text" name="level" value="1" />
            </div>
        </div>
        <div class="form-group" style="min-width: 400px">
            <label>Damage Multiplier</label>
            <div class="form-fields">
                <input type="text" name="mult" value="1" />
            </div>
        </div>
        <div class="form-group" style="min-width: 400px">
            <label>Damage Type</label>
            <div class="form-fields">
                <select name="damageType" />
                    ${select}
                </select>
            </div>
        </div>
    `,
    buttons: [
      {
        action: "submit",
        label: "Roll",
        default: true,
        callback: (event, button, dialog) => button.form.elements,
      },
    ],
    submit: async (values) => {
      const level = values.level.value;
      const type = values.damageType.value;
      const scalar = (
        1 +
        values.mult.value * (level - 1) * CONFIG.CELESTUS.flatDamageScalar
      ).toFixed(2);
      let f = `floor((${CONFIG.CELESTUS.baseDamage.formula[level]})*${scalar})[${type}]`;
      f = f.replace("none", type);
      const r = new Roll(f);
      await r.toMessage({
        speaker: { alias: `${game.user.name} - Improvised Damage` },
        "system.isDamage": true,
        "system.damageType": type,
      });
    },
  }).render({ force: true });
}

/**
 * Calculates the multiplier for a specified damage roll
 *
 * @param {Actor} actor: actor who will be dealing the damage
 * @param {String} type: elemental type of damage
 * @param {String} ability: ability to scale damage with ("none" if no scalar)
 * @param {Number} base: damage multiplier from damage source percent
 * @param {String} flat: flat damage bonus as percent
 * @param {Boolean} crit: is damage roll for a critical hit
 * @returns {Number} multiplier to apply to damage roll
 */
export function calcMult(actor, type, ability, base, crit, flat = 0) {
  // elemental damage bonus percentage
  let elementBonus = 0;
  if (type !== "none") {
    elementBonus = actor.system.elementBonus[type];
  }
  // bonus from ability associated with skill
  let abilityBonus = 0;
  // if there is no ability to scale with, use base level scaling mult
  if (ability === "none") {
    abilityBonus =
      (actor.system.attributes.level - 1) * CONFIG.CELESTUS.flatDamageScalar;
  } else if (ability !== "0") {
    abilityBonus = actor.system.abilities[ability]?.mod ?? 0;
  }
  const critBonus = crit ? actor.system.attributes.bonuses.crit_bonus.value : 1;

  const damageBonus =
    CONFIG.CELESTUS.damageTypes[type]?.style === "healing"
      ? 0
      : actor.system.attributes.bonuses.damage.value;

  let mult =
    1 *
    base *
    (1 + elementBonus) *
    (1 + abilityBonus) *
    (1 + flat + damageBonus) *
    critBonus;
  return mult.toFixed(2);
}

/**
 * Displays text that fades out on all tokens controlled by actor
 * copies the effect done by statusEffects
 * @param {Actor} actor to display text on
 * @param {String} text to display
 * @param {Color} color for display
 * @param {Boolean} broadcast should this message be broadcast to all clients?
 */
export function canvasPopupText(
  actor,
  text,
  color = "#ffffff",
  broadcast = false
) {
  const tokens = actor?.getActiveTokens(true);
  for (let t of tokens) {
    if (!t.visible || !t.renderable) continue;
    canvas.interface.createScrollingText(t.center, text, {
      anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
      direction: CONST.TEXT_ANCHOR_POINTS.TOP,
      distance: 2 * t.h,
      fontSize: 28,
      stroke: 0x000000,
      strokeThickness: 4,
      jitter: 0.25,
      fill: color,
    });
    if (broadcast) {
      game.socket.emit("system.celestus", {
        type: "canvasPopupText",
        data: {
          position: t.center,
          text: text,
          distance: 2 * t.h,
          color: color,
        },
      });
    }
  }
}
/**
 *
 * @param {Actor} actor actor initiating the roll
 * @param {String} ability for actor to roll with
 */
export async function rollAbility(actor, ability) {
  let label, abilityMod, isAttribute;
  if (CONFIG.CELESTUS.civilSkills[ability] !== undefined) {
    label = game.i18n.localize("CELESTUS.abilities." + ability);
    abilityMod = actor.system.civil[ability].value * 5;
  } else if (CONFIG.CELESTUS.combatSkills[ability] !== undefined) {
    label = game.i18n.localize("CELESTUS.abilities." + ability);
    abilityMod = actor.system.combat[ability].value;
  } else if (typeof CONFIG.CELESTUS.abilities[ability] !== undefined) {
    label = game.i18n.localize("CELESTUS.attributes." + ability);
    abilityMod =
      actor.system.abilities[ability].value -
      CONFIG.CELESTUS.baseAttributeScore;
    isAttribute = true;
  } else {
    return;
  }
  const path = "./systems/celestus/templates/rolls/abilityRollPrompt.hbs";
  const msgData = {
    attributes: CONFIG.CELESTUS.abilities,
    ability: label,
    attributeSelect: !isAttribute,
  };
  let msg = await foundry.applications.handlebars.renderTemplate(path, msgData);
  new foundry.applications.api.DialogV2({
    window: { title: `${label} check` },
    content: msg,
    buttons: [
      {
        action: "normal",
        label: "Normal",
        default: true,
        callback: (event, button, dialog) => [
          "normal",
          button.form.elements.attribute?.value,
          button.form.elements.situational?.value,
        ],
      },
      {
        action: "advantage",
        label: "Advantage",
        callback: (event, button, dialog) => [
          "advantage",
          button.form.elements.attribute?.value,
          button.form.elements.situational?.value,
        ],
      },
    ],
    submit: (result) => {
      const [mode, attribute, situational] = result;
      let attributeBonus = actor.system.abilities[attribute]?.value ?? 0;
      if (attributeBonus > 0)
        attributeBonus -= CONFIG.CELESTUS.baseAttributeScore;
      let flavor, rollBonus;
      if (isAttribute) {
        flavor = `${label} check`;
        rollBonus = `${abilityMod} + ${situational}`;
      } else {
        flavor = `${label} (${game.i18n.localize("CELESTUS.attributes." + attribute)}) check`;
        rollBonus = `${abilityMod} + ${attributeBonus} + ${situational}`;
      }
      if (mode === "normal") {
        let r = new Roll(`1d100 +  ${rollBonus}`, {}, { flavor });
        r.toMessage({
          speaker: { alias: actor.name },
        });
      } else if (mode === "advantage") {
        let r = new Roll(`2d100kh1 + ${rollBonus}`, {}, { flavor });
        r.toMessage({
          speaker: { alias: actor.name },
        });
      }
    },
  }).render({ force: true });
}

/**
 * Prompts user and asks if damage roll is a crit
 * @returns {Boolean} true if crit, false if not
 */
export async function promptDamage() {
  const promise = new Promise(async (resolve) => {
    await new foundry.applications.api.DialogV2({
      window: { title: "Roll Damage:" },
      content: `
                <div class="form-group">
                    <label>Situation Bonus: </label>
                    <div class="form-fields">
                        <input type="number" name="situational" value="1" data-tooltip="Situational Damage Multiplier"/>
                    </div>
                </div>
            `,
      buttons: [
        {
          action: "normal",
          label: "Normal",
          default: true,
          callback: (event, button, dialog) => [
            false,
            button.form.elements.situational.value,
          ],
        },
        {
          action: "crit",
          label: "Critical",
          callback: (event, button, dialog) => [
            true,
            button.form.elements.situational.value,
          ],
        },
      ],
      submit: (result) => {
        resolve(result);
      },
    }).render({ force: true });
  });
  return await promise;
}

/**
 *
 * @param {Actor} actor
 * @param {Object[]} damage array of damage elements for base damage
 * @param {Object[][]} bonusDamage Array of bonus damage element arrays
 * @param {Object[][]} statuses array of statusApplyRolls from weapons
 * @param {Boolean} isCrit
 * @param {Number} scalar Overall weapon damage scalar
 * @param {String} typeOverride damage type id of damage type override (empty string or otherwise falsy for none)
 * @param {Number} situational bonus to multiply by
 */
export async function rollWeaponDamage(
  actor,
  damage,
  bonusDamage,
  statuses,
  isCrit,
  scalar,
  typeOverride,
  situational
) {
  const type = damage[0].type;

  // roll to apply statuses
  if (statuses && statuses.length > 0) {
    let statusList =
      statuses.length > 1 ? statuses[0].concat(statuses[1]) : statuses[0];
    let statusRolls = [];

    if (statusList.length > 0) {
      for (const status of statusList) {
        const roll = new Roll("1d100");
        await roll.evaluate();
        const statusEffect = CONFIG.statusEffects.find(
          (s) => s.id === status.id
        );
        statusRolls.push({
          name: statusEffect.name,
          icon: statusEffect.img,
          roll: roll.total,
          success: roll.total > 100 - status.chance,
          id: status.id,
        });
      }

      const path =
        "./systems/celestus/templates/rolls/weapon-roll-statuses.hbs";
      const msgData = {
        statuses: statusRolls,
        actorId: actor.uuid,
      };
      let msg = await foundry.applications.handlebars.renderTemplate(
        path,
        msgData
      );
      // do text enrichment
      msg = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        msg,
        {
          async: true,
        }
      );
      await ChatMessage.create({
        speaker: { alias: `${actor.name} - Weapon Statuses` },
        content: msg,
        "system.type": "weaponStatuses",
        "system.actorID": actor.uuid,
      });
    }
  }

  // create final roll
  const formula = calcWeaponDamage(
    actor,
    scalar,
    typeOverride,
    isCrit,
    situational
  ).roll;
  const r = new Roll(formula);
  await r.toMessage({
    speaker: { alias: `${actor.name} - Weapon Damage` },
    "system.isDamage": true,
    "system.damageType": typeOverride || type,
    "system.actorID": actor.uuid,
  });
}

/**
 * Calculates min, max, and average damage values for an actor
 * @param {Actor} actor
 * @param {Number} scalar Overall weapon damage scalar
 * @param {String} typeOverride damage type id of damage type override (empty string or otherwise falsy for none)
 * @param {Boolean} isCrit if damage is crit (only needed for actually creating a roll)
 * @param {Number} situational bonus to multiply by
 * @returns {undefined | Object} containing types breakdown of damage and total damage {total, parts, roll}
 */
export function calcWeaponDamage(
  actor,
  scalar,
  typeOverride,
  isCrit = false,
  situational = 1
) {
  if (!actor) return;
  scalar ??= 1;
  const damage = actor.system.weaponDamage;
  const bonusDamage = actor.system.bonusWeaponDamage;
  const damageRiders = actor.system.damageRiders;

  // calculate rider damage rolls and stats
  const riderBase =
    CONFIG.CELESTUS.baseDamage.formula[actor.system.attributes.level];
  const riderMin =
    CONFIG.CELESTUS.baseDamage.min[actor.system.attributes.level];
  const riderMax =
    CONFIG.CELESTUS.baseDamage.max[actor.system.attributes.level];
  const riderAvg =
    CONFIG.CELESTUS.baseDamage.avg[actor.system.attributes.level];
  let riderInfo = [];
  for (const rider of damageRiders) {
    // calculate bonus from weapon combat ability
    let weaponType = actor.system.weaponType;
    let abilityBonus = weaponType
      ? actor.system?.combat[weaponType]?.value * CONFIG.CELESTUS.combatSkillMod
      : 0;
    const mult = calcMult(
      actor,
      rider.type,
      "none",
      scalar,
      isCrit,
      abilityBonus
    );
    const dType = typeOverride || rider.type;
    const baseFormula = riderBase.replace("none", dType);
    riderInfo.push({
      type: dType,
      min: Math.round(riderMin * mult * situational * rider.value * scalar),
      max: Math.round(riderMax * mult * situational * rider.value * scalar),
      avg: Math.round(riderAvg * mult * situational * rider.value * scalar),
      roll: ` + floor(((${baseFormula})*${mult})*${scalar}*${situational}*${rider.value})[${dType}]`,
    });
  }

  if (!damage || damage.length === 0) {
    return;
  }

  // initialize empty objects
  let types = {};
  let total = {
    min: 0,
    max: 0,
    avg: 0,
  };

  // create a roll formula
  let formula = "";
  if (damage && damage.length > 0) {
    if (damage.length === 1) {
      const type = typeOverride || damage[0].type;
      formula +=
        `floor((${isCrit ? damage[0].crit : damage[0].roll})*${scalar}*${situational})[${type}]`.replace(
          "none",
          type
        );
      if (!types[type]) {
        types[type] = {
          min: 0,
          max: 0,
          avg: 0,
        };
      }
      types[type].min += Math.floor(damage[0].min * scalar * situational);
      types[type].max += Math.floor(damage[0].max * scalar * situational);
      types[type].avg += Math.floor(damage[0].avg * scalar * situational);
      total.min += Math.floor(damage[0].min * scalar * situational);
      total.max += Math.floor(damage[0].max * scalar * situational);
      total.avg += Math.floor(damage[0].avg * scalar * situational);
      // roll any bonus damage types
      if (bonusDamage[0]) {
        for (const element of bonusDamage[0]) {
          const elementType = typeOverride || element.type;
          formula +=
            ` + floor((${isCrit ? element.crit : element.roll})*${scalar}*${situational})[${elementType}]`.replace(
              "none",
              elementType
            );
          if (!types[elementType]) {
            types[elementType] = {
              min: 0,
              max: 0,
              avg: 0,
            };
          }
          types[elementType].min += Math.floor(
            element.min * scalar * situational
          );
          types[elementType].max += Math.floor(
            element.max * scalar * situational
          );
          types[elementType].avg += Math.floor(
            element.avg * scalar * situational
          );
          total.min += Math.floor(element.min * scalar * situational);
          total.max += Math.floor(element.max * scalar * situational);
          total.avg += Math.floor(element.avg * scalar * situational);
        }
      }
      for (const rider of riderInfo) {
        if (!types[rider.type]) {
          formula += rider.roll;
          types[rider.type] = {
            min: 0,
            max: 0,
            avg: 0,
          };
        }
        types[rider.type].min += rider.min;
        types[rider.type].max += rider.max;
        types[rider.type].avg += rider.avg;
        total.min += rider.min;
        total.max += rider.max;
        total.avg += rider.avg;
      }
    } else {
      const dType1 = typeOverride || damage[0].type;
      formula +=
        `floor((${isCrit ? damage[0].crit : damage[0].roll})*${scalar}*${situational})[${dType1}]`.replace(
          "none",
          dType1
        );
      if (!types[dType1]) {
        types[dType1] = {
          min: 0,
          max: 0,
          avg: 0,
        };
      }
      types[dType1].min += Math.floor(damage[0].min * scalar * situational);
      types[dType1].max += Math.floor(damage[0].max * scalar * situational);
      types[dType1].avg += Math.floor(damage[0].avg * scalar * situational);
      total.min += Math.floor(damage[0].min * scalar * situational);
      total.max += Math.floor(damage[0].max * scalar * situational);
      total.avg += Math.floor(damage[0].avg * scalar * situational);
      // roll any bonus damage types
      if (bonusDamage[0]) {
        for (const element of bonusDamage[0]) {
          const elementType = typeOverride || element.type;
          formula +=
            ` + floor((${isCrit ? element.crit : element.roll})*${scalar}*${situational})[${elementType}]`.replace(
              "none",
              elementType
            );
          if (!types[elementType]) {
            types[elementType] = {
              min: 0,
              max: 0,
              avg: 0,
            };
          }
          types[elementType].min += Math.floor(
            element.min * scalar * situational
          );
          types[elementType].max += Math.floor(
            element.max * scalar * situational
          );
          types[elementType].avg += Math.floor(
            element.avg * scalar * situational
          );
          total.min += Math.floor(element.min * scalar * situational);
          total.max += Math.floor(element.max * scalar * situational);
          total.avg += Math.floor(element.avg * scalar * situational);
        }
      }
      for (const rider of riderInfo) {
        if (!types[rider.type]) {
          formula += rider.roll;
          types[rider.type] = {
            min: 0,
            max: 0,
            avg: 0,
          };
        }
        types[rider.type].min += rider.min;
        types[rider.type].max += rider.max;
        types[rider.type].avg += rider.avg;
        total.min += rider.min;
        total.max += rider.max;
        total.avg += rider.avg;
      }
      const dType2 = typeOverride || damage[1].type;
      formula +=
        ` + floor((${isCrit ? damage[1].crit : damage[1].roll})*${scalar * CONFIG.CELESTUS.dualwieldMult}*${situational})[${dType2}]`.replace(
          "none",
          dType2
        );
      if (!types[dType2]) {
        types[dType2] = {
          min: 0,
          max: 0,
          avg: 0,
        };
      }
      types[dType2].min += Math.floor(
        damage[1].min * scalar * situational * CONFIG.CELESTUS.dualwieldMult
      );
      types[dType2].max += Math.floor(
        damage[1].max * scalar * situational * CONFIG.CELESTUS.dualwieldMult
      );
      types[dType2].avg += Math.floor(
        damage[1].avg * scalar * situational * CONFIG.CELESTUS.dualwieldMult
      );
      total.min += Math.floor(
        damage[1].min * scalar * situational * CONFIG.CELESTUS.dualwieldMult
      );
      total.max += Math.floor(
        damage[1].max * scalar * situational * CONFIG.CELESTUS.dualwieldMult
      );
      total.avg += Math.floor(
        damage[1].avg * scalar * situational * CONFIG.CELESTUS.dualwieldMult
      );
      // roll any bonus damage types
      if (bonusDamage[1]) {
        for (const element of bonusDamage[1]) {
          const elementType = typeOverride || element.type;
          formula +=
            ` + floor((${isCrit ? element.crit : element.roll})*${scalar * CONFIG.CELESTUS.dualwieldMult}*${situational})[${elementType}]`.replace(
              "none",
              elementType
            );
          if (!types[elementType]) {
            types[elementType] = {
              min: 0,
              max: 0,
              avg: 0,
            };
          }
          types[elementType].min += Math.floor(
            element.min * scalar * situational
          );
          types[elementType].max += Math.floor(
            element.max * scalar * situational
          );
          types[elementType].avg += Math.floor(
            element.avg * scalar * situational
          );
          total.min += Math.floor(element.min * scalar * situational);
          total.max += Math.floor(element.max * scalar * situational);
          total.avg += Math.floor(element.avg * scalar * situational);
        }
      }
      for (const rider of riderInfo) {
        if (!types[rider.type]) {
          formula += rider.roll;
          types[rider.type] = {
            min: 0,
            max: 0,
            avg: 0,
          };
        }
        types[rider.type].min += rider.min;
        types[rider.type].max += rider.max;
        types[rider.type].avg += rider.avg;
        total.min += rider.min;
        total.max += rider.max;
        total.avg += rider.avg;
      }
    }
  }
  return {
    total: total,
    parts: types,
    roll: formula,
  };
}

/**
 * extracts damage types and subtotals from a message object
 * @param {Message} msg
 * @returns {Object}
 */
export function itemizeDamage(msg) {
  let total = 0;
  let damage = [];
  const splitDamage = msg.getFlag("celestus", "splitDamage");
  // iterate through rolls
  for (const roll of msg.rolls) {
    // iterate through components of roll
    for (const term of roll.terms) {
      if (isNaN(term.total)) continue;
      const partial = damage.find((e) => e.type === term.options?.flavor);
      if (partial && !splitDamage) {
        partial.amount += term.total;
      } else {
        damage.push({
          amount: term.total,
          type: term.options?.flavor || "none",
        });
      }
      total += term.total;
    }
  }
  return { total: total, terms: damage };
}

export async function applyWeaponStatus(ev) {
  const target = _token.actor;
  if (!target) return;

  // get info from press
  const t = ev.currentTarget;
  const statusId = $(t).data("statusId");
  const actorId = $(t).data("actorId");

  // apply status effect
  const statusEffect = await ActiveEffect.fromStatusEffect(statusId);
  statusEffect.updateSource({ origin: actorId });
  await target.createEmbeddedDocuments("ActiveEffect", [statusEffect]);
}

export async function executeSkillScript(origin, skill) {
  const selected = canvas.tokens.controlled;
  if (
    skill.system.targets.type === "creature" &&
    selected.length > skill.system.targets.count
  ) {
    return ui.notifications.warn(
      `CELESTUS | Error: please select ${skill.system.targets.count} targets`
    );
  }
  // prompt for confirmation
  const proceed = await foundry.applications.api.DialogV2.confirm({
    content: "Are you sure you want to execute? This action cannot be undone.",
    rejectClose: false,
    modal: true,
  });
  if (!proceed) {
    return;
  }
  // attempt to find script and execute it
  if (!CONFIG.CELESTUS.scripts[skill.system.scriptId]) {
    return ui.notifications.warn(
      `CELESTUS | Error: could not find script with id "${skill.system.scriptId}"`
    );
  }
  CONFIG.CELESTUS.scripts[skill.system.scriptId](origin, selected);
}

/**
 * Rotates token to point towards a point on the canvas
 * @param {Token} token
 * @param {Int,Int} point {x,y} values for point to rotate towards
 */
export async function rotateTokenTowards(token, point) {
  if (!point.x || !point.y) return;
  const scale = token.scene.grid.size;
  const distX = point.x - (token.x + (token.document.width * scale) / 2);
  const distY = point.y - (token.y + (token.document.height * scale) / 2);
  const newAngle = Math.atan(distY / distX) + (distX > 0 ? Math.PI : 0);

  await token.document.setFlag("celestus", "rotation", newAngle - Math.PI / 2);
  token.drawPointer();
}

/**
 * Checks if both a and b match or if a isn't present
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function matchIfPresent(a, b) {
  return typeof a === "undefined" || a === b;
}

/**
 * Updates a numberfield with an inputted string
 * If string starts with +/- will add/subtract,
 * otherwise will just evaluate string
 * @param {Actor} actor to update
 * @param {String} key: key in object to update / start with
 * @param {String} input string from sheet
 */
export async function updateWithMath(actor, key, input) {
  const current = byString(actor, key);
  let operator = "";
  // check if given addition or subtraction
  if (input[0] === "+" || input[0] === "-") {
    operator = input[0];
    input = input.slice(1);
  }
  // evaluate input
  const roll = new Roll(input);
  let total = roll.evaluateSync().total;
  // perform math if needed
  if (operator === "+") {
    total = current + total;
  } else if (operator === "-") {
    total = current - total;
  }
  // update resource value
  await actor.update({ [key]: Number(total) });
}

/**
 * Finds a specific key value of a stat spread, checking parents until it finds a value
 * @param {String} name stat spread name
 * @param {String} key which stat to grab
 * @returns {any|undefined}
 */
export function findSpreadStat(name, key) {
  const spreads = CONFIG.CELESTUS.npcStats;
  let target = name;
  while (true) {
    let current = spreads[target];
    if (!current) return null;
    // check for key
    if (typeof current[key] !== "undefined") {
      return current[key];
    }
    // if no key value, check parent
    target = current.parent;
    if (!target) return null;
  }
}

/**
 * Find the closest point on a line to a point in space
 * @param {Point} point to find base calculation on
 * @param {Line} line to find closest point on
 * @returns {Point}
 */
export function closestPoint(point, line) {
  var AB = { x: line.x2 - line.x1, y: line.y2 - line.y1 };
  var AP = { x: point.x - line.x1, y: point.y - line.y1 };
  var len = AB.x * AB.x + AB.y * AB.y;
  var dot = AP.x * AB.x + AP.y * AB.y;
  var t = Math.min(1, Math.max(0, dot / len));
  dot =
    (line.x2 - line.x1) * (point.y - line.y1) -
    (line.y2 - line.y1) * (point.x - line.x1);
  return {
    x: line.x1 + AB.x * t,
    y: line.y1 + AB.y * t,
  };
}

/**
 * Tests if two line segments intersect
 * each line contains x1, x2, y1, y2 coordinates
 * @param {Object} line1
 * @param {Object} line2
 * @returns {Boolean}
 */
export function lineLineTest(line1, line2) {
  // calculate distance to point of intersection
  const uA1 =
    (line2.x2 - line2.x1) * (line1.y1 - line2.y1) -
    (line2.y2 - line2.y1) * (line1.x1 - line2.x1);
  const uA2 =
    (line2.y2 - line2.y1) * (line1.x2 - line1.x1) -
    (line2.x2 - line2.x1) * (line1.y2 - line1.y1);
  const uA = uA1 / uA2;
  const uB1 =
    (line1.x2 - line1.x1) * (line1.y1 - line2.y1) -
    (line1.y2 - line1.y1) * (line1.x1 - line2.x1);
  const uB2 =
    (line2.y2 - line2.y1) * (line1.x2 - line1.x1) -
    (line2.x2 - line2.x1) * (line1.y2 - line1.y1);
  const uB = uB1 / uB2;

  // uA and uB should both be in the range 0-1 for a collision
  return uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1;
}

/**
 * Tests if point is inside polygon
 * @param {Number[]} shape as an array of numbers x0,y0,x1,y1,...
 * @param {Object} point x, y
 * @param {Object} offset x,y offset of points for shape
 * @returns {Boolean}
 */
export function polyPointTest(shape, point, offset) {
  offset = {
    x: offset?.x ?? 0,
    y: offset?.y ?? 0,
  };

  const testX = point.x - offset.x;
  const testY = point.y - offset.y;

  const nPoints = shape.length / 2;
  let intersects = false;
  let i, j;
  // check if point is within bounds
  let minX, minY, maxX, maxY;
  for (let n = 0; n < nPoints; n++) {
    let x = shape[n * 2];
    let y = shape[n * 2 + 1];
    if (x < minX) {
      minX = x;
    } else if (x > maxX) {
      maxX = x;
    }
    if (y < minY) {
      minY = y;
    } else if (y > maxY) {
      maxY = y;
    }
  }
  if (testX < minX || testX > maxX || testY < minY || testY > maxY)
    return false;

  for (i = 0, j = nPoints - 1; i < nPoints; j = i++) {
    let x1 = shape[i * 2];
    let y1 = shape[i * 2 + 1];
    let x2 = shape[j * 2];
    let y2 = shape[j * 2 + 1];
    if (
      y1 > testY != y2 > testY &&
      testX < ((x2 - x1) * (testY - y1)) / (y2 - y1) + x1
    )
      intersects = !intersects;
  }
  return intersects;
}

/**
 * Tests if line segment intersects a polygon
 * @param {Number[]} points as an array of numbers x0,y0,x1,y1,...
 * @param {Object} line x1,y1,x2,y2
 * @param {Object?} offset x,y offset of points for shape
 * @returns {Boolean}
 */
export function polyLineTest(points, line, offset) {
  offset = {
    x: offset?.x ?? 0,
    y: offset?.y ?? 0,
  };
  // iterate through each point
  const nPoints = points.length / 2;
  let j = 0;
  for (let i = 0; i < nPoints; i++) {
    // get next vertex (loop back at end)
    j = i + 1;
    if (j === nPoints) j = 0;

    // create a line from points i and j
    const testLine = {
      x1: points[i * 2] + offset.x,
      y1: points[i * 2 + 1] + offset.y,
      x2: points[j * 2] + offset.x,
      y2: points[j * 2 + 1] + offset.y,
    };

    // test for line-line intersection
    const intersect = lineLineTest(line, testLine);
    if (intersect) return true;
  }
  return false;
}

/**
 * Tests if two polygons intersect
 * @param {Number[]} shape1 as an array of numbers x0,y0,x1,y1,...
 * @param {Number[]} shape2 as an array of numbers x0,y0,x1,y1,...
 * @param {Object?} offset distance between shape1 and shape2 origins (shape2x-shape1x, shape2y-shape1y)
 * @returns {Number|Boolean} 0 = intersect, > 0 = shape2 inside shape1, < 0 = shape1 inside shape2, false = no interaction
 */
export function polyPolyTest(shape1, shape2, offset) {
  offset = {
    x: offset?.x ?? 0,
    y: offset?.y ?? 0,
  };
  // iterate through each point in shape1
  const nPoints1 = shape1.length / 2;
  let j = 0;
  for (let i = 0; i < nPoints1; i++) {
    // get next vertex (loop back at end)
    j = i + 1;
    if (j === nPoints1) j = 0;

    // create a line from points i and j
    const testLine = {
      x1: shape1[i * 2] - offset.x,
      y1: shape1[i * 2 + 1] - offset.y,
      x2: shape1[j * 2] - offset.x,
      y2: shape1[j * 2 + 1] - offset.y,
    };

    // test for line-poly intersection
    const intersect = polyLineTest(shape2, testLine);
    if (intersect) return 0;
  }

  let inside2 = true;
  // check if shape1 is inside shape2
  for (let i = 0; i < nPoints1; i++) {
    // create a test point
    const testPoint = {
      x: shape1[i * 2] - offset.x,
      y: shape1[i * 2 + 1] - offset.y,
    };

    // test for line-poly intersection
    const inside = polyPointTest(shape2, testPoint);
    if (!inside) {
      inside2 = false;
      break;
    }
  }
  if (inside2) return -1;
  // check if shape2 is inside shape1
  const nPoints2 = shape2.length / 2;
  let inside1 = true;
  for (let i = 0; i < nPoints2; i++) {
    // create a test point
    const testPoint = {
      x: shape2[i * 2] + offset.x,
      y: shape2[i * 2 + 1] + offset.y,
    };

    // test for line-poly intersection
    const inside = polyPointTest(shape1, testPoint);
    if (!inside) {
      inside1 = false;
      break;
    }
  }
  if (inside1) return 1;

  return false;
}

/**
 * Tests for intersection between circle and polygon
 * @param {Number[]} points of polygon x1,y1 x2,y2 ...
 * @param {Point} center x,y position of circle
 * @param {Number} radius of circle
 * @returns {Number|Boolean} 0 = intersect, > 0 = circle inside polygon, < 0 = polygon inside circle, false = no interaction
 */
export function polyCircleTest(points, center, radius) {
  let lineIntersect = false;
  let pointsInCircle = 0;
  let verticalIntersect = 0;
  // iterate through all points / lines
  const nPoints = points.length / 2;
  let j = 1;
  for (let i = 0; i < nPoints; i++) {
    // get next vertex (loop back at end)
    j = i + 1;
    if (j === nPoints) j = 0;

    // test if point is inside circle
    const dist = Math.sqrt(
      (points[i * 2] - center.x) ** 2 + (points[i * 2 + 1] - center.y) ** 2
    );
    if (dist <= radius) pointsInCircle++;

    // create a line from points i and j
    const testLine = {
      x1: points[i * 2],
      y1: points[i * 2 + 1],
      x2: points[j * 2],
      y2: points[j * 2 + 1],
    };

    // test if upwards ray from center intersects with line
    const vert = {
      x1: center.x,
      y1: center.y,
      x2: center.x,
      y2: canvas?.scene?.height ?? Math.pow(10, 100),
    };
    if (lineLineTest(vert, testLine)) verticalIntersect++;

    // only test for line intersection if we haven't already
    if (!lineIntersect) {
      // find closest point to center
      const closest = closestPoint(center, testLine);
      // find distance
      const distX = closest.x - center.x;
      const distY = closest.y - center.y;
      const distance = Math.sqrt(distX ** 2 + distY ** 2);

      if (distance <= radius) lineIntersect = true;
    }
  }
  if (pointsInCircle === nPoints) return -1;
  if (lineIntersect) return 0;
  if (verticalIntersect % 2 !== 0) return 1;
  return false;
}

/**
 * Transforms rectangle dimensions to polygon points
 * @param {Number} x base x position of rectangle
 * @param {Number} y base y position of rectangle
 * @param {Number} width width of rectangle
 * @param {Number} height height of rectangle
 * @returns {Number[]} points as an array of numbers x0,y0,x1,y1,...
 */
export function rectToPoly(x, y, width, height) {
  return [x, y, x, y + height, x + width, y + height, x + width, y];
}

/**
 * Access nested object variable from string
 * by Ray Bellis
 * https://stackoverflow.com/a/6491621/23494595
 * @param {Object} o
 * @param {String} s
 * @returns
 */
export function byString(o, s) {
  s = s.replace(/\[(\w+)\]/g, ".$1"); // convert indexes to properties
  s = s.replace(/^\./, ""); // strip a leading dot
  var a = s.split(".");
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in o) {
      o = o[k];
    } else {
      return;
    }
  }
  return o;
}

/**
 * Calculate function by Felix Bohm
 * https://code.tutsplus.com/what-they-didnt-tell-you-about-es5s-array-extras--net-28263t
 * @param {String} calculation
 * @returns {Number}
 */
export function calculate(calculation) {
  //build an array containing the individual parts

  var parts = calculation.match(
    // digits |operators|whitespace

    /(?:\-?[\d\.]+)|[-\+\*\/]|\s+/g
  );

  //test if everything was matched

  if (calculation !== parts.join("")) {
    throw new Error("couldn't parse calculation");
  }

  //remove all whitespace

  parts = parts.map(Function.prototype.call, String.prototype.trim);

  parts = parts.filter(Boolean);

  //build a separate array containing parsed numbers

  var nums = parts.map(parseFloat);

  //build another array with all operations reduced to additions

  var processed = [];

  for (var i = 0; i < parts.length; i++) {
    if (nums[i] === nums[i]) {
      //nums[i] isn't NaN

      processed.push(nums[i]);
    } else {
      switch (parts[i]) {
        case "+":
          continue; //ignore

        case "-":
          processed.push(nums[++i] * -1);

          break;

        case "*":
          processed.push(processed.pop() * nums[++i]);

          break;

        case "/":
          processed.push(processed.pop() / nums[++i]);

          break;

        default:
          throw new Error("unknown operation: " + parts[i]);
      }
    }
  }

  //add all numbers and return the result

  return processed.reduce(function (result, elem) {
    return result + elem;
  });
}
