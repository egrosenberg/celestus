import { calcMult, canvasPopupText, findSpreadStat } from "./helpers.mjs";
import { renderHotbarOverlay, renderResourcesUi, renderTokenInfo, updateBossResources } from "./hooks.mjs";

const BASE_AS = 10; // base ability score value

export class CelestusActor extends Actor {

    /** @override */
    _onCreate(data, options, userId) {
        // check super and if allowed
        const allowed = super._onCreate(data, options, userId);
        if (allowed === false) return false;
        // give actor all basic actions
        this._giveBasicActions();
    }

    /** @override */
    async _preUpdate(changed, options, user) {
        // call super
        const allowed = await super._preUpdate(changed, options, user);
        if (allowed === false) return false;

        const broadcast = CONFIG.CELESTUS.broadcastPopups;
        // offset resource values
        const resources = changed.system?.resources;
        if (resources) {
            options.resourceChange = {}
            for (const key of ["hp", "phys_armor", "mag_armor"]) {
                const val = resources[key];
                if (!val) continue;
                if (val.flat !== undefined) {
                    const max = val.max ?? this.system.resources[key]?.max ?? 0;
                    val.offset = val.flat - max;
                    const old = this.system.resources[key]?.flat ?? 0;
                    if (key === "hp") {
                        if (this.getFlag("celestus", "undying")) {
                            val.offset = Math.max(val.offset, 1 - this.system.resources.hp.max);
                        }
                        val.percent = val.flat / this.system.resources.hp.max;
                        // check if hp went from negative to positive
                        if (old < 1 && val.flat > 0) {
                            this.updateSource({ "system.attributes.exhaustion": this.system.attributes.exhaustion + 1 })
                        }
                    }
                    const diff = val.flat - old;
                    options.resourceChange[key] = diff;
                    if (diff !== 0) {
                        const str = (diff > 0) ? "+" + diff.toString() : diff.toString();
                        canvasPopupText(this, str, CONFIG.CELESTUS.damageCol[key][diff > 0 ? "gain" : "lose"], broadcast);
                    }
                }
            }
        }

        // handle size changes
        const size = changed.system?.size;
        if (size) {
            // update default token size
            const dist = CONFIG.CELESTUS.size[size];
            if (dist) {
                this.prototypeToken.update({width: dist, height: dist});
            }
        }

        // handle setting npc stats from stat spread preset
        if (this.type === "npc") {
            const statSpread = changed.system?.spread;
            if (statSpread && this.system.spread != statSpread) {
                if (CONFIG.CELESTUS.npcStats[statSpread]) {
                    let abilities = {};
                    for (let key of ["str", "dex", "con", "int", "mind", "wit"]) {
                        abilities[key] = findSpreadStat(statSpread, key) || 0;
                    }
                    changed.system.abilitySpread = abilities;
                    changed.system.armorSpread = {
                        phys: findSpreadStat(statSpread, "phys_armor") || 0,
                        mag: findSpreadStat(statSpread, "mag_armor") || 0,
                    }
                    let resists = {};
                    for (const key of Object.keys(CONFIG.CELESTUS.damageTypes)) {
                        resists[key] = { base: findSpreadStat(statSpread, `${key}Resistance`) || 0 };
                    }
                    let combatAbilities = {};
                    for (const key of Object.keys(CONFIG.CELESTUS.combatSkills)) {
                        combatAbilities[key] = { base: findSpreadStat(statSpread, key) || 0 };
                    }
                    changed.system.combat = combatAbilities;

                    changed.system.dmgBoost = findSpreadStat(statSpread, "dmg") || 1;
                    if (!changed.system.attributes) changed.system.attributes = {};
                    if (!changed.system.attributes.bonuses) changed.system.attributes.bonuses = {};
                    if (!changed.system.attributes.bonuses.initiative) changed.system.attributes.bonuses.initiative = {};
                    changed.system.attributes.bonuses.initiative.bonus = findSpreadStat(statSpread, "initiative") || 1;

                    if (!changed.system.resources) changed.system.resources = {};
                    if (!changed.system.resources.ap) changed.system.resources.ap = {};
                    changed.system.resources.ap.max = findSpreadStat(statSpread, "apMax") || 6;
                    changed.system.resources.ap.start = findSpreadStat(statSpread, "apStart") || 4;
                }
            }
        }

        // handle setting max fp for players
        if (this.type === "player") {
            const level = changed.system?.attributes?.level;
            if (level) {
                const maxFP = CONFIG.CELESTUS.maxFP.find(i => i[0].includes(level))?.[1] ?? 0;
                resources ??= {};
                resources.fp ??= {};
                resources.fp.max = maxFP;
            }
        }
    }

    /** @override */
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        // update auras
        // if actor is downed, instead just clear tokens
        const hp = changed.system?.resources?.hp?.value;
        if (typeof hp !== "undefined" && hp < 1) {
            for (const effect of this.effects) {
                effect.cleanupAura();
            }
        }
        // render ui elements
        const selected = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character ?? _token?.actor ?? null;
        if (changed.system || changed.flags && selected?.uuid === this.uuid) {
            renderHotbarOverlay();
        }
        if (document.getElementById("ui-resources").dataset.actorId === this.uuid) {
            renderResourcesUi();
        }
        if (document.getElementById("ui-token-hover").dataset.actorId === this.uuid) {
            renderTokenInfo(this.getActiveTokens(true)[0], null, true);
        }
        // update boss display if applicable
        if (this._id === game.celestus.bossId) {
            updateBossResources(this);
        }
    }

    /** @override */
    _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
        super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
        if (document.getElementById("ui-token-hover").dataset.actorId === this.uuid) {
            renderTokenInfo(this.getActiveTokens(true)[0], null, true);
        }
        // update boss display if applicable
        if (this._id === game.celestus.bossId) {
            updateBossResources(this);
        }
    }

    /** @override */
    _onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
        super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
        if (document.getElementById("ui-token-hover").dataset.actorId === this.uuid) {
            renderTokenInfo(this.getActiveTokens(true)[0], null, true);
        }
        // update boss display if applicable
        if (this._id === game.celestus.bossId) {
            updateBossResources(this);
        }
    }

    /** @override */
    _onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId) {
        super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
        if (document.getElementById("ui-token-hover").dataset.actorId === this.uuid) {
            renderTokenInfo(this.getActiveTokens(true)[0], null, true);
        }
        // update boss display if applicable
        if (this._id === game.celestus.bossId) {
            updateBossResources(this);
        }
    }

    /**
     * 
     * @param {number} damage : amount of base damage to do (will be cast to int)
     * @param {string} type : type of damage
     * @param {Actor} origin: actor that damage originates from
     * @returns {int} total damage after resists
     */
    calcDamage(damage, type, origin = undefined) {
        damage = parseInt(damage);
        // subtract resisted damage from damage
        if (typeof this.system.attributes.resistance[type] !== 'undefined') {
            const DR = this.system.attributes.resistance[type].value;
            damage -= DR * damage;
        }
        else {
            console.warn(`CELESTUS | DR type "${type}" does not exist`);
        }
        // check if huntmaster is involved
        if (this.getFlag("celestus", "marked")) {
            const mod = origin.system.combat.huntmaster.mod;
            if (mod > 0) {
                damage *= 1 + mod + CONFIG.CELESTUS.baseMarkedBonus;
            }
        }
        return Math.floor(damage);
    }

    /**
     * Applies damage to the actor, incorporates damage resist as well as armors
     * 
     * @param {number} damage : amount of damage (pref int)
     * @param {string} type : type of damage (must exist in CONFIG.CELESTUS.damageTypes)
     * @param {CelestusActor} origin: actor that damage originates from
     * @param {Object} options: lifesteal {number}, reflected {boolean}
     */
    async applyDamage(damage, type, origin, options = {}) {
        // handle default options
        const lifesteal = options.lifesteal || 0;
        // calculate damage
        damage = this.calcDamage(damage, type, origin);

        // prevent any positive damage if invulnerable
        if (this.getFlag("celestus", "invulnerable")) {
            if (CONFIG.CELESTUS.damageTypes[type]?.style === "healing" && damage < 0) {
                return await canvasPopupText(this, "Invulnerable");
            }
            if (CONFIG.CELESTUS.damageTypes[type]?.style !== "healing" && damage > 0) {
                return await canvasPopupText(this, "Invulnerable");
            }
        }

        // remainder damage after armor
        let remaining = damage;
        // apply damage to armor if applicable
        //physical damage
        if (CONFIG.CELESTUS.damageTypes[type].style === "physical") {
            // apply damage to physical armor
            const cPhysArmor = this.system.resources.phys_armor.flat;
            const tPhysArmor = this.system.resources.phys_armor.temp;
            // calculate new temp armor value after damage
            if (tPhysArmor > 0) {
                let newTPhys = tPhysArmor - remaining;
                if (newTPhys < 0) {
                    // cary over remaining damage and set new TPhys to 0
                    remaining = -newTPhys;
                    newTPhys = 0;
                }
                else {
                    // zero out remaining physical damage
                    remaining = 0;
                }
                // update temp phys armor
                await this.update({ "system.resources.phys_armor.temp": parseInt(newTPhys) });
            }
            // account for damage past temp phys armor
            if (remaining > 0) {
                let newPhysArmor = cPhysArmor - remaining;
                if (newPhysArmor < 0) {
                    // carry over remaining damage and set new Phys to 0
                    remaining = -newPhysArmor;
                    newPhysArmor = 0;
                }
                else {
                    // zero out remaining damage
                    remaining = 0;
                }
                // update phys armor
                await this.update({ "system.resources.phys_armor.flat": parseInt(newPhysArmor) })
            }
        }
        // magical damage
        else if (CONFIG.CELESTUS.damageTypes[type].style === "magical") {
            // apply damage to magical armor
            const cMagArmor = this.system.resources.mag_armor.flat;
            const tMagArmor = this.system.resources.mag_armor.temp;
            // calculate new temp armor value after damage
            if (tMagArmor > 0) {
                let newTMag = tMagArmor - remaining;
                if (newTMag < 0) {
                    // cary over remaining damage and set new TPhys to 0
                    remaining = -newTMag;
                    newTMag = 0;
                }
                else {
                    // zero out remaining physical damage
                    remaining = 0;
                }
                // update temp phys armor
                await this.update({ "system.resources.mag_armor.temp": parseInt(newTMag) });
            }
            // account for damage past temp phys armor
            if (remaining > 0) {
                let newMagArmor = cMagArmor - remaining;
                if (newMagArmor < 0) {
                    // carry over remaining damage and set new mag to 0
                    remaining = -newMagArmor;
                    newMagArmor = 0;
                }
                else {
                    // zero out remaining damage
                    remaining = 0;
                }
                // update mag armor
                await this.update({ "system.resources.mag_armor.flat": parseInt(newMagArmor) })
            }
        }
        // healing
        else if (CONFIG.CELESTUS.damageTypes[type].style === "healing") {
            // physical armor restoration (cant go above max physical armor)
            if (CONFIG.CELESTUS.damageTypes[type].text === "phys_armor") {
                // what to do if its physical armor restoration
                if (remaining > 0) {
                    // calculate new physical armor value
                    const cPhysArmor = this.system.resources.phys_armor.flat;
                    const maxPhysArmor = this.system.resources.phys_armor.max;
                    let newPhysArmor = cPhysArmor + remaining;
                    // cap physical armor at max value
                    newPhysArmor = (newPhysArmor > maxPhysArmor) ? maxPhysArmor : newPhysArmor;
                    // update physical armor value
                    await this.update({ "system.resources.phys_armor.flat": parseInt(newPhysArmor) });
                    // zero out remaining
                    remaining = 0;
                }
                // damage directly to physical armor
                else {
                    // calculate new physical armor value
                    const tPhysArmor = this.system.resources.phys_armor.temp;
                    const cPhysArmor = this.system.resources.phys_armor.flat;
                    let newTPhysArmor = tPhysArmor + remaining;
                    if (newTPhysArmor < 0) {
                        remaining = newTPhysArmor;
                        newTPhysArmor = 0;
                    }
                    else {
                        remaining = 0;
                    }
                    let newPhysArmor = cPhysArmor + remaining;
                    if (newPhysArmor < 0) {
                        remaining = newPhysArmor;
                        newPhysArmor = 0;
                    }
                    else {
                        remaining = 0;
                    }
                    // update physical armor value
                    await this.update({ "system.resources.phys_armor.flat": parseInt(newPhysArmor) });
                    await this.update({ "system.resources.phys_armor.temp": parseInt(newTPhysArmor) });
                    // zero out remaining
                    remaining = 0;
                }
            }
            // magic armor restoration (cant go above max physical armor)
            else if (CONFIG.CELESTUS.damageTypes[type].text === "mag_armor") {
                // what to do if its magic armor resotartion
                if (remaining > 0) {
                    // calculate new magic armor value
                    const cMagArmor = this.system.resources.mag_armor.flat;
                    const maxMagArmor = this.system.resources.mag_armor.max;
                    let newMagArmor = cMagArmor + remaining;
                    // cap magic armor at max value
                    newMagArmor = (newMagArmor > maxMagArmor) ? maxMagArmor : newMagArmor;
                    // update magic armor value
                    await this.update({ "system.resources.mag_armor.flat": parseInt(newMagArmor) });
                    // zero out remaining
                    remaining = 0;
                }
                // damage directly to magic armor
                else {
                    // calculate new physical armor value
                    const tMagArmor = this.system.resources.mag_armor.temp;
                    const cMagArmor = this.system.resources.mag_armor.flat;
                    let newTMagArmor = tMagArmor + remaining;
                    if (newTMagArmor < 0) {
                        remaining = newTMagArmor;
                        newTMagArmor = 0;
                    }
                    else {
                        remaining = 0;
                    }
                    let newMagArmor = cMagArmor + remaining;
                    if (newMagArmor < 0) {
                        remaining = newMagArmor;
                        newMagArmor = 0;
                    }
                    else {
                        remaining = 0;
                    }
                    // update physical armor value
                    await this.update({ "system.resources.mag_armor.flat": parseInt(newMagArmor) });
                    await this.update({ "system.resources.mag_armor.temp": parseInt(newTMagArmor) });
                    // zero out remaining
                    remaining = 0;
                }
            }
            // temp physical armor in addition to base armor, can only have one source at a time
            else if (CONFIG.CELESTUS.damageTypes[type].text === "t_phys_armor") {
                // calculate new physical armor value
                const cTPhysArmor = this.system.resources.phys_armor.temp;
                // set new temp phys armor to max between current and damage
                let newTPhysArmor = Math.max(cTPhysArmor, remaining);
                // update physical armor value
                await this.update({ "system.resources.phys_armor.temp": parseInt(newTPhysArmor) });
                // zero out remaining
                remaining = 0;
            }
            // temp magic armor in addition to base armor, can only have one source at a time
            else if (CONFIG.CELESTUS.damageTypes[type].text === "t_mag_armor") {
                // calculate new magic armor value
                const cTMagArmor = this.system.resources.phys_armor.temp;
                // set new temp magic armor to max between current and damage
                let newTMagArmor = (cTMagArmor > remaining) ? cTMagArmor : remaining;
                // update physical armor value
                await this.update({ "system.resources.mag_armor.temp": parseInt(newTMagArmor) });
                // zero out remaining
                remaining = 0;
            }
            // basic healing
            else if (CONFIG.CELESTUS.damageTypes[type].text === "healing") {
                // invert remaining damage
                remaining *= -1;
            }
        }

        // update the health
        const value = this.system.resources.hp.flat;
        const maxHealth = this.system.resources.hp.max;
        // calculate the new damage
        let newHealth = value - remaining;
        // set to min of newhealth and max health
        newHealth = Math.min(newHealth, maxHealth);
        // update health value
        await this.update({ "system.resources.hp.flat": parseInt(newHealth) });
        // the following only matters if there is an origin
        if (origin) {
            // check if hp was reduced to 0
            if (value > 0 && this.system.resources.hp.flat < 1 && origin.getFlag("celestus", "executioner")
                && !origin.getFlag("celestus", "executedThisTurn") && this.uuid !== origin.uuid) {
                const ap = origin.system.resources.ap.value + CONFIG.CELESTUS.executeAp;
                await origin.update({ "system.resources.ap.value": Math.min(ap, origin.system.resources.ap.max) });
                await origin.setFlag("celestus", "executedThisTurn", true);
                await canvasPopupText(origin, "Executioner");
            }

            // apply healing to origin based on lifesteal / apply retribution damage
            if (CONFIG.CELESTUS.damageTypes[type].style !== "healing" && this.uuid !== origin.uuid) {
                const heal = (origin.system.attributes.bonuses.lifesteal.value + lifesteal) * damage;
                await origin.update({ "system.resources.hp.flat": origin.system.resources.hp.flat + Math.round(heal) });
                if (!options.reflected && damage > 0) {
                    const retribution = this.system.combat.retributive.mod * damage;
                    await origin.applyDamage(retribution, type, this, { reflected: true })
                }
            }

            // finally, check if actor is flammable and if damage is fire damage
            if (type === "fire" && this.getFlag("celestus", "flammable")) {
                const burn = await this.toggleStatusEffect("burn", { active: true });
                if (typeof burn != "boolean") {
                    burn.update({ "origin": origin.uuid })
                }
            }
        }

        const healed = (damage > 0 && type === "healing") ||
            (damage < 0 && CONFIG.CELESTUS.damageTypes[type].style !== "healing");
        // if healed, apply renewing armor
        if (!options.reflected && healed && this.getFlag("celestus", "renewing_armor")) {
            const healAmount = CONFIG.CELESTUS.damageTypes[type].style === "healing" ? damage : -damage;
            const armorHeal = Math.floor((healAmount) * CONFIG.CELESTUS.renewingArmorScale);
            if (armorHeal > 0) {
                const oldPhys = this.system.resources.phys_armor.flat;
                const oldMag = this.system.resources.mag_armor.flat;
                const newPhys = Math.min(oldPhys + armorHeal, this.system.resources.phys_armor.max);
                const newMag = Math.min(oldMag + armorHeal, this.system.resources.mag_armor.max);
                await this.update({ "system.resources.phys_armor.flat": newPhys });
                await this.update({ "system.resources.mag_armor.flat": newMag });
            }
        }

        // attempt to transfer damage to standing surface
        if (this.getFlag("celestus", "surfaceId")) {
            const surface = await fromUuid(this.getFlag("celestus", "surfaceId"));
            if (surface) {
                surface.combineDamage(type);
            }
        }
    }

    /**
     * 
     * @param {SkillData} skill : object containing info of the skill to use
     * @param {Object} options: channeling: boolean
     */
    async useSkill(skill, options = {}) {
        // check if skill is disabled
        let error = "";
        if (skill.system.disabled !== false) {
            error = `<p class="notification warning">${skill.system.disabled}</p><br />`;
        }

        // prompt to see if user wants to use skill
        let useResources;
        if (!options.channeling) {
            useResources = await foundry.applications.api.DialogV2.confirm({
                window: { title: "Use Resources?" },
                content: error,
                rejectClose: false,
                modal: true
            });
            if (typeof useResources !== "boolean") return;
            if (useResources && error) {
                return ui.notifications.info(`CELESTUS | Skill not used because ${skill.system.disabled}`);
            }
        }

        const actor = this.system;
        if (this.inCombat) {
            // channel if in combat and has channel duration
            if (skill.system.channelDuration > 0 && !options.channeling) {
                // create an effect to channel this
                const channelInfo = {
                    name: `Channeling: ${skill.name}`,
                    type: "status",
                    img: skill.img,
                    duration: { rounds: skill.system.channelDuration },
                    system: { channeling: skill.uuid },
                }
                await this.createEmbeddedDocuments("ActiveEffect", [channelInfo]);
            }
            // only use ap if in combat
            if (useResources) {
                await this.update({ "system.resources.ap.value": actor.resources.ap.value - skill.system.finalAP });
            }
        }
        // use fp
        if (useResources) {
            await this.update({ "system.resources.fp.value": actor.resources.fp.value - skill.system.finalFP });
        }

        const path = './systems/celestus/templates/rolls/skill-roll.hbs';
        const msgData = {
            owner: this.name,
            ownerPortrait: this.prototypeToken.texture.src,
            user: game.user.name,
            name: `${options.channeling ? "Channeling: " : ""}${skill.name}`,
            flavor: skill.system.description,
            portrait: skill.img,
            item: skill,
            config: CONFIG.CELESTUS,
            usedResources: useResources,
            rollData: skill.getRollData(),
        }
        let msg = await foundry.applications.handlebars.renderTemplate(path, msgData);
        // do text enrichment
        msg = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            msg,
            {
                // Only show secret blocks to owner
                secrets: skill.isOwner,
                async: true,
                // For Actors and Items
                rollData: skill.getRollData()
            }
        );
        await ChatMessage.create({
            content: msg,
            'system.type': "roll",
            'system.actorID': this.uuid,
            'system.isSkill': true,
            'system.itemID': skill.uuid,
            'system.skill.hasAttack': skill.system.attack,
            'system.skill.hasDamage': skill.system.damage?.length > 0 || skill.system.type === "weapon",
        });

        if (useResources) {
            // civil skills set cd to -1
            if (skill.system.type === "civil") {
                skill.update({ "system.cooldown.value": (skill.system.cooldown.max !== 0 ? -1 : 0) });
            }
            // set skill on cooldown if in combat (currently set to true for debugging)
            else if (this.inCombat) {
                skill.update({ "system.cooldown.value": skill.system.cooldown.max });
            }
        }
    }

    /**
     * attempts to equip an item to the character and unequips whatever is currently in that slot
     * @param {String} id of item to equip
     * @param {Number} n: 1/left, 2/right for items that have multiple slots
     */
    async equip(id, n = 1) {
        const item = this.items.get(id);
        // if item is equipped, simply unequip
        if (item.system.equipped) {
            await item.update({ "system.equipped": false });
            await this.setWeaponSkill();
            return;
        }
        // verify that actor meets prerequisites
        let canEquip = true;
        for (let [ability, value] of Object.entries(item.system.prereqs)) {
            if (this.system.abilities[ability].value < value) {
                canEquip = false;
            }
        }
        if (!canEquip) {
            return ui.notifications.warn("Cannot equip item: prerequisites not met.");
        }
        // track which piece is being removed
        let unequipping = [];
        let rightChange = false;
        // unequip item in that slot
        const equipped = this.system.equipped;
        if (item.type === "armor") {
            if (item.system.slot === "ring") {
                if (equipped[`${item.system.slot}${n}`]) {
                    equipped[`${item.system.slot}${n}`].update({ "system.equipped": false });
                    unequipping.push(equipped[`${item.system.slot}${n}`]);
                }
            }
            else {
                if (equipped[item.system.slot]) {
                    equipped[item.system.slot].update({ "system.equipped": false });
                    unequipping.push(equipped[item.system.slot]);
                }
            }
        }
        else if (item.type === "offhand") {
            rightChange = true;
            // unequip current offhand
            if (equipped.right) {
                equipped.right.update({ "system.equipped": false });
                unequipping.push(equipped.right);
            }
        }
        else if (item.type === "weapon") {
            if (item.system.twoHanded) {
                rightChange = true;
                // unequip all hands
                if (equipped.left) {
                    equipped.left.update({ "system.equipped": false });
                    unequipping.push(equipped.left);

                }
                if (equipped.right) {
                    equipped.right.update({ "system.equipped": false });
                    unequipping.push(equipped.right);
                }
            }
            else if (n === 1 && equipped.right) {
                // unequip left hand
                if (equipped.left) {
                    equipped.left.update({ "system.equipped": false });
                    unequipping.push(equipped.left);
                }
            }
            else {
                rightChange = true;
                //unequip right
                if (equipped.right) {
                    equipped.right.update({ "system.equipped": false });
                    unequipping.push(equipped.right);
                }
            }
        }
        // remove status effects from unequipped
        for (let gear of unequipping) {
            // remove statuses
            for (let status of this.effects) {
                if (gear.effects.find(i => i.name === status.name)) {
                    await status.delete();
                }
            }
        }
        // equip this item
        await item.update({ "system.equipped": true });

        // if right hand changed, grant appropriate skill and revoke previous skills
        await this.setWeaponSkill();

        // spend AP if this token is in combat
        if (this.inCombat && ["armor", "weapon", "offhand"].includes(item.type)) {
            this.update({ "system.resources.ap.value": Math.max(0, this.system.resources.ap.value - CONFIG.CELESTUS.equipApCost) });
        }
    }

    /**
     * Sets actor's weapon skill based on their equipped right hand
     */
    async setWeaponSkill() {
        // delete old skill
        const oldSkill = this.items.find(i => i.flags.celestus?.weaponSkill === true);
        if (oldSkill) {
            await oldSkill.delete();
        }

        let wepSkill;
        const right = this.system.equipped.right;
        // determine weapon type
        if (right) {
            if (right.type === "offhand") {
                if (right.system.spread === "shield") {
                    wepSkill = "shield";
                }
            }
            else if (right.type === "weapon" && right.system.range === 0) {
                if (right.system.twoHanded) {
                    if (right.system.ability === "str" || right.system.ability === "dex") {
                        wepSkill = "twohand";
                    }
                    else if (right.system.ability === "int") {
                        wepSkill = "staff";
                    }
                }
                else {
                    wepSkill = "dualwield";
                }
            }
        }
        else {
            wepSkill = "unarmed";
        }

        if (wepSkill) {
            // find compendium entry appropriate for actor state
            const skillId = CONFIG.CELESTUS.weaponSkills[wepSkill];
            const cSkill = await fromUuid(skillId);
            if (cSkill) {
                await cSkill.updateSource({ "flags.celestus": { weaponSkill: true } });
                const [newSkill] = await this.createEmbeddedDocuments("Item", [cSkill.toJSON()]);
                if (newSkill) {
                    await newSkill.update({ "system.memorized": "always" });
                }
            }
            else {
                console.warn("CELESTUS | Could not find weapon skill for equipped right hand.")
            }
        }
    }

    /**
     * refreshes all armor, health, and other resources
     * removes temp resources
     * @param {Boolean} dawn: t/f is it a new day (refreshes civil skills)
     */
    async refresh(dawn = false) {
        // if dawn, remove exhaustion
        if (dawn) {
            this.update({ "system.attributes.exhaustion": 0 });
        }
        // update hp
        this.update({ "system.resources.hp.flat": this.system.resources.hp.max });
        // update physical armor
        this.update({ "system.resources.phys_armor.flat": this.system.resources.phys_armor.max });
        // remove temp physical armor
        this.update({ "system.resources.phys_armor.temp": 0 });
        // update magic armor
        this.update({ "system.resources.mag_armor.flat": this.system.resources.mag_armor.max });
        // remove temp magic armor
        this.update({ "system.resources.mag_armor.temp": 0 });

        // refresh ap
        this.update({ "system.resources.ap.value": this.system.resources.ap.start });
        // refresh focus points
        this.update({ "system.resources.fp.value": this.system.resources.fp.max });

        // reset all cooldowns
        for (let item of this.items) {
            if (item.type === "skill" && (dawn || item.system.type !== "civil" || item.system.cooldown.max > 0)) {
                item.update({ "system.cooldown.value": 0 });
            }
        }
        // clear all temporary statuses
        for (const status of this.system.effects.temporary) {
            await status.delete();
        }

    }

    /**
     * handles all upkeep for a combat turn
     */
    async startTurn() {
        // progress all cooldowns
        for (let item of this.items) {
            if (item.type === "skill") {
                const cd = item.system.cooldown.value;
                if (cd > 0) {
                    item.update({ "system.cooldown.value": cd - 1 });
                }
            }
        }
        // refresh action points
        const ap = this.system.resources.ap.value;
        const startAp = this.system.resources.ap.start;
        const maxAp = this.system.resources.ap.max;
        await this.update({ "system.resources.ap.value": Math.min((ap + startAp), maxAp) });
        // go through all effects
        let effectsDamageFormula = "";
        let first = true;
        let dType;
        for (let effect of this.effects) {
            if (effect.type === "status") {
                const attr = this.damageFlatScalar ? "none" : 0;
                for (let part of effect.system.damage) {
                    const origin = await fromUuid(effect.origin);
                    const level = origin ? origin.system.attributes.level : this.system.attributes.level;
                    // damage type
                    const type = part.type;

                    // base damage roll corresponding to actor level
                    const base = CONFIG.CELESTUS.baseDamage.formula[level].replace("none", type);

                    const mult = calcMult(origin, type, attr, part.value, false, 0);
                    if (first) first = false;
                    else effectsDamageFormula += " + "
                    effectsDamageFormula += `floor((${base}) * ${mult})[${type}]`;

                    if (!dType) dType = type;
                    else dType = "Mixed";
                }
                // channel skills
                if (effect.system.channeling) {
                    const skill = await fromUuid(effect.system.channeling);
                    if (skill) {
                        this.useSkill(skill, { channeling: true });
                    }
                }
            }
            if (effect.isTemporary) {
                if (effect.duration.rounds > 1) {
                    await effect.update({ "duration.rounds": effect.duration.rounds - 1 });
                }
                else {
                    await effect.update({ "duration.rounds": 0 });
                    await effect.update({ "duration.turns": 1 });
                }
            }
        }
        if (effectsDamageFormula) {
            const r = new Roll(effectsDamageFormula)
            await r.toMessage({
                speaker: { alias: `${this.name} - Status Damage` },
                'system.isDamage': true,
                'system.damageType': dType,
                'system.actorID': this.uuid,
            });
        }
        // unset executed this turn
        await this.unsetFlag("celestus", "executedThisTurn");
    }

    /**
     * handles cleanup of a combat turn
     */
    async endTurn() {
        // clean up effects that end this turn
        for (const effect of this.effects) {
            if (effect.isTemporary && effect.duration.rounds === 0 && effect.duration.turns === 1) {
                await effect.delete();
            }
        }
    }

    async rollInitiative() {
        const tokens = this.getActiveTokens(false, true);
        if (tokens.length < 1) {
            return ui.notifications.warn("CELESTUS | Error: no active tokens");
        }
        for (const token of tokens) {
            try {
                if (!token.combatant) {
                    await token.toggleCombatant();
                }

                // create an initiative roll
                let r = new Roll(game.system.initiative, this.system, { flavor: `${this.name} rolls initiative` });
                await r.toMessage({
                    speaker: { alias: this.name },
                });
                token.combatant.rollInitiative(r.total.toString());
            } catch (error) {
                return ui.notifications.warn(error)
            }
        }
    }

    /**
     * Gives this actor all basic actions
     */
    async _giveBasicActions() {
        // find all basic actions
        const basicActions = [];
        const pack = game.packs.get(CONFIG.CELESTUS.skillsPack);
        for (const entry of pack.index) {
            if (entry.folder !== CONFIG.CELESTUS.basicActionsFolder) continue;
            const item = await fromUuid(entry.uuid);
            basicActions.push(item.toJSON());
        }
        // add basic actions to actor
        this.createEmbeddedDocuments("Item", basicActions);
    }
}

export class CelestusTokenDocument extends TokenDocument {

    /** @override */
    async _preUpdateMovement(movement, operation) {
        const allowed = await super._preUpdateMovement(movement, operation);
        if (allowed === false) return false;
        // Check surface collisions
        if (movement.destination) {
            // iterate through surfaces
            const origin = { x: movement.origin.x, y: movement.origin.y };
            const destination = { x: movement.destination.x, y: movement.destination.y };
            for (const template of canvas?.scene.templates) {
                if (this.movementAction !== "blink") {
                    await template.object.spreadEffectsTo(this, origin, destination);
                }
                else {
                    await template.object.spreadEffectsTo(this, undefined, destination);
                }
            }
        }
    }

    /** @override */
    async _preUpdate(changed, options, user) {
        const allowed = await super._preUpdate(changed, options, user);
        if (allowed === false) return false;
        // if token is now hidden, cleanup aura
        // if it is now visible, spread aura
        if (changed.hidden === true) {
            for (const effect of this.actor.effects) {
                effect.cleanupAura();
            }
        }
    }

    /** @override */
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        // only spread aura as GM
        if (!game.users.activeGM.isSelf) return;
        this.object.spreadAuraFrom();
    }

    /** @override */
    async _preDelete(options, user) {
        const allowed = super._preDelete(options, user);
        if (allowed === false) return;
        // only cleanup aura as GM
        if (!game.users.activeGM.isSelf) return;
        // cleanup auras
        for (const effect of this.actor.effects) {
            effect.cleanupAura();
        }
    }
}

export class CelestusToken extends foundry.canvas.placeables.Token {

    /** @override */
    _onCreate(data, options, userId) {
        const allowed = super._onCreate(data, options, userId);
        if (allowed == false) return false;
    }

    /**
     * draws pointer overlay
     */
    drawPointer() {
        if (this.drawing) return;
        this.drawing = true;
        if (!this.pointerPixi) {
            this._createPointer();
        }

        [this.pointerPixi.x, this.pointerPixi.y] = [this.getCenterPoint().x, this.getCenterPoint().y];
        const size = Math.min(this.w, this.h) * 2;
        this.pointerPixi.width = size;
        this.pointerPixi.height = size;
        this.pointerPixi.zIndex = CONFIG.CELESTUS.tokenPointerZ;
        this.pointerPixi.alpha = CONFIG.CELESTUS.tokenPointerAlpha;

        const rotation = this.document.getFlag("celestus", "rotation") ?? 0;
        this.pointerPixi.rotation = rotation;

        if (this.actor.system.pointerTint) {
            this.pointerPixi.tint = Number("0x" + this.actor.system.pointerTint.substring(1));
        }
        else {
            this.pointerPixi.tint = 0xffffff;
        }

        this.drawing = false;
    }

    /** @override */
    _onDelete(options, userId) {
        const allowed = super._onDelete(options, userId);
        if (allowed === false) return false;
        // cleanup pointer
        if (this.pointerPixi) {
            canvas.stage.removeChild(this.pointerPixi);
        }
    }

    /** @override */
    _onClickRight(event) {
        if (this.isOwner) return super._onClickRight(event);
        event.stopPropagation();
        let ui = document.getElementById("ui-token-hover");
        if (ui.style.display === "none") return;
        if (ui.dataset.persist === "true") {
            renderTokenInfo(this, false, true);
        }
        else {
            ui.dataset.persist = "true";
        }
    }

    /** @override */
    _canHUD(user, event) {
        return true;
    }

    /**
     * creates a pointer overlay for this token
     */
    _createPointer() {
        if (this.pointerPixi) return;
        // create PIXI object
        const pointer = new PIXI.Sprite(CONFIG.CELESTUS.pointerTexture);
        pointer.anchor.x = 0.5;
        pointer.anchor.y = 0.5;
        // set transforms
        const size = Math.min(this.w, this.h) * 2;
        pointer.width = size;
        pointer.height = size;
        const rotation = this.document.getFlag("celestus", "rotation") ?? 0;
        pointer.rotation = rotation;
        [pointer.x, pointer.y] = [this.getCenterPoint().x, this.getCenterPoint().y];
        pointer.zIndex = CONFIG.CELESTUS.tokenPointerZ;
        pointer.alpha = CONFIG.CELESTUS.tokenPointerAlpha;
        pointer.eventMode = "none";
        // draw PIXI object
        this.pointerPixi = pointer;
        canvas.stage.addChild(this.pointerPixi);
        game.celestus.pointers.push(this.pointerPixi);
    }

    /**
     * updates pointer visibility to be congruous with this token's visibility
     */
    updatePointerVisibility() {
        if (!this.pointerPixi) return;
        canvas.stage.removeChild(this.pointerPixi);
        if (this.visible) {
            canvas.stage.addChild(this.pointerPixi);
        }
    }

    /**
     * Checks which tokens should have auras from this token's actor
     * @param {Number,Number} newPosition optional
     */
    async spreadAuraFrom(newPosition = null) {
        // only run if user is GM
        if (!game.users.activeGM.isSelf) return;
        const tokenCoords = newPosition || { x: this.x, y: this.y }
        const token = this.document;
        // ignore if token is downed or if hidden
        const hp = token.actor.system?.resources?.hp?.value;
        if (this.document.hidden || hp < 1) {
            return;
        }
        if (this._isSpreadingFrom) return;
        this._isSpreadingFrom = true;
        // get token effects with auras
        const effects = token.actor.effects.filter(e => (e.type === "status" && e.system.aura.has))
        // iterate through effects to spread aura
        for (const effect of effects) {
            // only worry about the effect if it is not a child
            if (effect.flags?.celestus?.isChild) continue;
            // iterate through all tokens on canvas
            for (const target of token.parent?.tokens) {
                // skip self
                if (target === token) continue;

                let validTarget = false;

                const targets = effect.system.aura.targets;
                // check if target matches criteria
                if (targets === "any") {
                    validTarget = true;
                }
                else if (targets === "ally" && token.disposition === target.disposition) {
                    validTarget = true;
                }
                else if (targets === "enemy" && token.disposition !== target.disposition) {
                    validTarget = true;
                }
                else if (targets === "type" && effect.system.aura.targetType === target.actor.system.t) {
                    validTarget = true;
                }
                // check distance
                const distance = canvas.grid.measurePath([tokenCoords, { x: target.x, y: target.y }]).distance.toFixed(1);
                if (distance > effect.system.aura.radius) validTarget = false;
                // if target is still valid, apply effect
                if (validTarget) {
                    // check if effect is already there
                    const old = target.actor.effects.filter(e => (effect.system.aura.children.find(id => id === e.uuid)));
                    if (old.length > 0) {
                        for (const e of old) {
                            // if aura lingers, reset lingering timer
                            if (effect.system.aura.lingerDuration !== 0) {
                                await e.update({ "duration.rounds": effect.system.aura.lingerDuration });
                            }
                        }
                    }
                    else {
                        // create a copy of the status effect on the target
                        let childData = foundry.utils.mergeObject(effect.toJSON(), { "flags.celestus.isChild": true });
                        // set child duration based on parent linger duration
                        if (effect.system.aura.lingerDuration === 0) {
                            childData.duration.rounds = null;
                            //await child.update({ "duration.rounds": null })
                        }
                        else {
                            childData.duration.rounds = effect.system.aura.lingerDuration;
                            //await child.update({ "duration.rounds": effect.system.aura.lingerDuration });
                        }
                        const [child] = await target.actor.createEmbeddedDocuments(effect.documentName, [childData]);
                        // record new created child
                        let children = effect.system.aura.children;
                        children.push(child.uuid);
                        await effect.update({ "system.aura.children": children });
                    }
                }
                else if (effect.system.aura.lingerDuration === 0) {
                    const lingering = target.actor.effects.filter(e => (effect.system.aura.children.find(id => id === e.uuid)));
                    for (const e of lingering) {
                        await e.delete();
                    }
                }
            }
        }
        delete this._isSpreadingFrom;
    }

    /**
     * Checks which tokens this token's actor should have auras from
     * @param {Number,Number} newPosition optional
     */
    async spreadAuraTo(newPosition = null) {
        // only run if user is active GM token
        if (!game.users.activeGM.isSelf) return;
        const tokenCoords = newPosition || { x: this.x, y: this.y }
        const token = this.document;
        // iterate through all tokens
        for (const origin of token.parent?.tokens) {
            // skip self
            if (origin === token) continue;
            // ignore if token is downed or hidden
            const hp = origin.actor.system?.resources?.hp?.value;
            if (origin.hidden || hp < 1) {
                continue;
            }
            // check all effects on token
            const effects = origin.actor.effects.filter(e => (e.type === "status" && e.system.aura.has));
            // iterate through effects
            for (const effect of effects) {
                // only worry about the effect of the origin is the origin of the effect
                if (effect.origin !== origin.actor.uuid) continue;
                // skip if disabled
                if (effect.disabled) continue;

                let validTarget = false;
                // check if origin matches criteria
                const targets = effect.system.aura.targets;
                if (targets === "any") {
                    validTarget = true;
                }
                else if (targets === "ally" && token.disposition === origin.disposition) {
                    validTarget = true;
                }
                else if (targets === "enemy" && token.disposition !== origin.disposition) {
                    validTarget = true;
                }
                else if (targets === "type" && effect.system.aura.targetType === origin.actor.system.t) {
                    validTarget = true;
                }
                // check distance
                const distance = canvas.grid.measurePath([tokenCoords, { x: origin.x, y: origin.y }]).distance.toFixed(1);
                if (distance > effect.system.aura.radius) validTarget = false;

                // ignore if token actor is dead
                const hp = origin.actor.system?.resources?.hp?.value;
                if (hp < 1) {
                    validTarget = false;
                }
                // if target is still valid, apply effect
                if (validTarget) {
                    // check if effect is already there
                    const old = token.actor.effects.filter(e => (effect.system.aura.children.find(id => id === e.uuid)));
                    if (old.length > 0) {
                        for (const e of old) {
                            // if aura lingers, reset lingering timer
                            if (effect.system.aura.lingerDuration !== 0) {
                                await e.update({ "duration.rounds": effect.system.aura.lingerDuration });
                            }
                        }
                    }
                    else {
                        // create a copy of the status effect on the target
                        let childData = foundry.utils.mergeObject(effect.toJSON(), { "flags.celestus.isChild": true });
                        const [child] = await token.actor.createEmbeddedDocuments(effect.documentName, [childData]);
                        // set child duration based on parent linger duration
                        if (effect.system.aura.lingerDuration === 0) {
                            child.update({ "duration.rounds": null });
                        }
                        else {
                            child.update({ "duration.rounds": effect.system.aura.lingerDuration });
                        }
                        // record new created child
                        let children = effect.system.aura.children;
                        children.push(child.uuid);
                        await effect.update({ "system.aura.children": children });
                    }
                }
                else if (effect.system.aura.lingerDuration === 0) {
                    // erase any lingering copies
                    const lingering = token.actor.effects.filter(e => (effect.system.aura.children.find(id => id === e.uuid)));
                    for (const e of lingering) {
                        await e.delete();
                    }
                }
            }
        }
    }
}