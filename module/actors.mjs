import { calcMult, canvasPopupText } from "./helpers.mjs";

const BASE_AS = 10; // base ability score value

export class CelestusActor extends Actor {
    /** @override */
    prepareDerivedData() {
        const actor = this.system;
        /**
         * Zero out all derived data
         */
        // zero out ability score related things
        for (let [key, ability] of Object.entries(actor.abilities)) {
            ability.mod = 0;
            ability.total = ability.bonus;
        }
        actor.attributes.unspentPoints = 0;
        // zero out combat ability stuff
        for (let [key, ability] of Object.entries(actor.combat)) {
            ability.value = ability.bonus;
            ability.mod = 0;
        }
        // zero out civil ability stuff
        for (let [key, ability] of Object.entries(actor.civil)) {
            ability.value = ability.bonus;
        }
        // zero out damage resists
        for (let [key, damageType] of Object.entries(actor.attributes.resistance)) {
            damageType.value = 0;
        }
        // zero out generic bonuses
        for (let [key, bonus] of Object.entries(actor.attributes.bonuses)) {
            bonus.value = 0;
        }
        // zero out memory related things
        actor.attributes.memory.total = 0;
        actor.attributes.memory.spent = 0;
        // zero out armor totals
        actor.resources.phys_armor.max = 0;
        actor.resources.mag_armor.max = 0;
        actor.resources.hp.max = 0;


        /**
         * Perform additive bonuses
         */
        // calculate flat ability scores
        let spentPoints = 0;
        for (let [key, ability] of Object.entries(actor.abilities)) {
            spentPoints += ability.value - BASE_AS;
            ability.total += ability.value;
        }
        actor.attributes.unspentPoints += (actor.attributes.level * 2) + CONFIG.CELESTUS.baseAbilityPoints - spentPoints;
        // calculage ability bonus from enlightened
        if (this.getFlag("celestus", "enlightened")) {
            for (let [ability, value] of Object.entries(CONFIG.CELESTUS.enlightenedBonus[actor.attributes.level])) {
                actor.abilities[ability].bonus += value;
                actor.abilities[ability].total += value;
            }
        }
        // update combat ability values
        let spentCombat = 0;
        for (let [key, ability] of Object.entries(actor.combat)) {
            // calculate total
            ability.value += ability.base;
            spentCombat += ability.base;
        }
        actor.attributes.unspentCombat = actor.attributes.level + CONFIG.CELESTUS.baseAbilityPoints - spentCombat;
        let spentCivil = 0;
        // update civil ability values
        for (let [key, ability] of Object.entries(actor.civil)) {
            // calculate total
            ability.value += ability.base;
            spentCivil += ability.base;
        }
        actor.attributes.unspentCivil = Math.floor(actor.attributes.level/3) + CONFIG.CELESTUS.baseAbilityPoints - spentCivil;
        // update base damage resists
        for (let [key, damageType] of Object.entries(actor.attributes.resistance)) {
            damageType.value += damageType.bonus;
        }

        // iterate through items
        for (const item of this.items) {
            // check if item is an armor piece and equipped
            if (item.type === "armor" && item.system.equipped) {
                // calculate armor values
                const phys = item.system.value.phys;
                const mag = item.system.value.mag;
                // increase max armor
                actor.resources.phys_armor.max += item.system.value.phys;
                actor.resources.mag_armor.max += item.system.value.mag;
                // apply bonuses
                for (let [ability, value] of Object.entries(item.system.bonuses.combat)) {
                    actor.combat[ability].bonus += value;
                    actor.combat[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.civil)) {
                    actor.civil[ability].bonus += value;
                    actor.civil[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.abilities)) {
                    actor.abilities[ability].bonus += value;
                    actor.abilities[ability].total += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.resistance)) {
                    actor.attributes.resistance[ability].value += value;
                }
            }
            else if ((item.type === "weapon" || item.type === "feature") && item.system.equipped) {
                // apply bonuses
                for (let [ability, value] of Object.entries(item.system.bonuses.combat)) {
                    actor.combat[ability].bonus += value;
                    actor.combat[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.civil)) {
                    actor.civil[ability].bonus += value;
                    actor.civil[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.abilities)) {
                    actor.abilities[ability].bonus += value;
                    actor.abilities[ability].total += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.resistance)) {
                    actor.attributes.resistance[ability].value += value;
                }
            }
            else if (item.type === "offhand" && item.system.equipped) {
                // calculate armor values
                const phys = CONFIG.CELESTUS.baseOffhand[actor.attributes.level].phys * item.system.efficiency;
                const mag = CONFIG.CELESTUS.baseOffhand[actor.attributes.level].mag * item.system.efficiency;
                // increase max armor
                actor.resources.phys_armor.max += item.system.value.phys;
                actor.resources.mag_armor.max += item.system.value.mag;
                // apply bonuses
                for (let [ability, value] of Object.entries(item.system.bonuses.combat)) {
                    actor.combat[ability].bonus += value;
                    actor.combat[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.civil)) {
                    actor.civil[ability].bonus += value;
                    actor.civil[ability].value += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.abilities)) {
                    actor.abilities[ability].bonus += value;
                    actor.abilities[ability].total += value;
                }
                for (let [ability, value] of Object.entries(item.system.bonuses.resistance)) {
                    actor.attributes.resistance[ability].value += value;
                }
            }
            else if (item.type === "skill" && item.system.memorized === "true") {
                actor.attributes.memory.spent += item.system.memSlots;
            }
        }
        // add flat misc armor bonuses
        actor.resources.phys_armor.max += actor.resources.phys_armor.bonus;
        actor.resources.mag_armor.max += actor.resources.mag_armor.bonus;
        // calculate max hp
        actor.resources.hp.max += CONFIG.CELESTUS.maxHP[actor.attributes.level];
        /**
         * Perform final additive operations
         */
        // final unspent skill points update for formshifter
        actor.attributes.unspentPoints += actor.combat.formshifter.value * 2;
        // calculate memory
        actor.attributes.memory.total += parseInt(Math.floor((actor.attributes.level) / 2) + (actor.abilities.mind.value) - 7);
        // calculate modifiers
        // ability scores
        for (let [key, ability] of Object.entries(actor.abilities)) {
            ability.mod += ((ability.total - BASE_AS) * CONFIG.CELESTUS.abilityMod[key]) + CONFIG.CELESTUS.baseAbilityMod[key];
        }
        // combat abilities
        for (let [key, ability] of Object.entries(actor.combat)) {
            ability.mod += ability.value * 0.05;
        }
        // calculate crit chance
        actor.attributes.bonuses.crit_chance.value += actor.abilities.wit.mod;
        // calculate crit bonus
        actor.attributes.bonuses.crit_bonus.value += 1 + CONFIG.CELESTUS.baseCritBonus + actor.attributes.bonuses.crit_bonus.bonus + actor.combat.shroudstalker.mod;
        // calculate accuracy
        actor.attributes.bonuses.accuracy.value += CONFIG.CELESTUS.baseAccuracy + actor.attributes.bonuses.accuracy.bonus;
        // calculate evasion
        actor.attributes.bonuses.evasion.value += actor.attributes.bonuses.evasion.bonus;
        // calculate overall damage bonus
        actor.attributes.bonuses.damage.value += actor.attributes.bonuses.damage.bonus;
        // calculate movespeed
        actor.attributes.movement.value += actor.attributes.movement.base;

        /**
         * Perform multiplicative operations
         */
        // con operations
        actor.resources.phys_armor.max *= 1 + actor.abilities.con.mod;
        actor.resources.mag_armor.max *= 1 + actor.abilities.con.mod;
        actor.resources.hp.max *= 1 + actor.abilities.con.mod;
        // ensure all resources are back to int
        actor.resources.phys_armor.max = parseInt(actor.resources.phys_armor.max);
        actor.resources.mag_armor.max = parseInt(actor.resources.mag_armor.max);
        actor.resources.hp.max = parseInt(actor.resources.hp.max);
        // movespeed
        actor.attributes.movement.value *= (1 + actor.attributes.movement.bonus);

        /**
         * calculate final flat values from offsets
         */
        for (const key of ["hp", "phys_armor", "mag_armor"]) {
            const resource = actor.resources[key];
            resource.flat = resource.max + resource.offset;
            // cap resource at max
            resource.flat = Math.min(resource.flat, resource.max);
        }

        /**
        * derive final resource values for display
        */
        this.system.resources.hp.value = this.system.resources.hp.flat;
        this.system.resources.phys_armor.value = this.system.resources.phys_armor.flat + this.system.resources.phys_armor.temp;
        this.system.resources.mag_armor.value = this.system.resources.mag_armor.flat + this.system.resources.mag_armor.temp;
    }

    /** @override */
    async _preUpdate(changed, options, user) {
        // call super
        await super._preUpdate(changed, options, user);

        // offset resource values
        const resources = changed.system.resources;
        if (resources) {
            for (const key of ["hp", "phys_armor", "mag_armor"]) {
                const val = resources[key];
                if (!val) continue;
                if (val.flat !== undefined) {
                    const max = val.max ?? this.system.resources[key]?.max ?? 0;
                    val.offset = val.flat - max;
                    const old = this.system.resources[key]?.flat ?? 0;
                    const diff = val.flat - old;
                    if (diff !== 0) {
                        const str = (diff > 0) ? "+" + diff.toString(): diff.toString();
                        canvasPopupText(this, str, CONFIG.CELESTUS.damageCol[key][diff > 0 ? "gain" : "lose"]);
                    }
                }
            }
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
            const DR = this.system.attributes.resistance[type].value + this.system.attributes.resistance[type].bonus;
            damage -= DR * damage;
        }
        else {
            console.log(`DR type "${type}" does not exist`);
        }
        // check if huntmaster is involved
        if (this.getFlag("celestus", "marked")) {
            const mod = origin.system.combat.huntmaster.mod;
            if (mod > 0) {
                damage *= 1 + mod;
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
     */
    async applyDamage(damage, type, origin) {
        damage = this.calcDamage(damage, type, origin);

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
        // set to max of 0 and new health
        newHealth = Math.max(newHealth, 0);
        // set to min of newhealth and max health
        newHealth = Math.min(newHealth, maxHealth);
        // update health value
        await this.update({ "system.resources.hp.flat": parseInt(newHealth) });

        // apply healing to origin if they have positive deathbringer
        if (origin.system.combat.deathbringer.mod > 0) {
            const heal = origin.system.combat.deathbringer.mod * damage;
            origin.update({"system.resources.hp.flat": origin.system.resources.hp.flat + heal})
        }

        // finally, check if actor is flammable and if damage is fire damage
        if (type === "fire" && this.getFlag("celestus", "flammable")) {
            const burn = await this.toggleStatusEffect("burn", { active: true });
            if (typeof burn != "boolean") {
                burn.update({ "origin": origin.uuid })
            }
        }
    }

    /**
     * 
     * @param {SkillData} skill : object containing info of the skill to use
     */
    async useSkill(skill) {
        // check if skill is disabled
        if (skill.system.disabled !== false) {
            return ui.notifications.warn(`CELESTUS | Error: ${skill.system.disabled}`);
        }

        const actor = this.system;
        // use resources
        // only use ap if in combat
        if (this.inCombat) {
            await this.update({ "system.resources.ap.value": actor.resources.ap.value - skill.system.ap });
        }
        await this.update({ "system.resources.jirki.value": actor.resources.fp.value - skill.system.fp });

        const path = './systems/celestus/templates/skillDescription.hbs';
        const msgData = {
            name: skill.name,
            flavor: skill.system.description,
            portrait: skill.img,
        }
        let msg = await renderTemplate(path, msgData);
        // do text enrichment
        msg = await TextEditor.enrichHTML(
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
            content: msg, speaker: { alias: this.name },
            'system.actorID': this.uuid,
            'system.isSkill': true,
            'system.itemID': skill.uuid,
            'system.skill.hasAttack': skill.system.attack,
        });

        // civil skills set cd to -1
        if (skill.system.type === "civil") {
            skill.update({ "system.cooldown.value": -1 });
        }
        // set skill on cooldown if in combat (currently set to true for debugging)
        else if (this.inCombat) {
            skill.update({ "system.cooldown.value": skill.system.cooldown.max });
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
            item.update({ "system.equipped": false });
            // remove statuses
            for (let status of this.effects) {
                if (item.effects.find(i => i.name === status.name)) {
                    status.delete();
                }
            }
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
            // unequip current offhand
            if (equipped.right) {
                equipped.right.update( {"system.equipped": false});
                unequipping.push(equipped.right);
            }
        }
        else if (item.type === "weapon") {
            if (item.system.twoHanded) {
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
                    status.delete();
                }
            }
        }
        // equip this item
        item.update({ "system.equipped": true });
        // apply any status effects from the item
        for (const status of item.effects) {
            if (status.disabled || this.effects.find(i => i.name === status.name)) {
                continue;
            }
            await this.createEmbeddedDocuments('ActiveEffect', [
                {
                    name: status.name,
                    img: status.img,
                    origin: this.uuid,
                    'duration.rounds': status.duration.rounds,
                    disabled: false,
                    type: "status",
                    system: status.system,
                    changes: status.changes,
                },
            ]);
        }
    }

    /**
     * refreshes all armor, health, and other resources
     * removes temp resources
     * @param {Boolean} dawn: t/f is it a new day (refreshes civil skills)
     */
    async refresh(dawn = false) {
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
            if (item.type === "skill" && (dawn || item.system.cooldown.value > 0)) {
                item.update({ "system.cooldown.value": 0 });
            }
        }
        // clear all temporary statuses
        for (const status of this.system.effects.temporary) {
            status.delete();
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
        this.update({ "system.resources.ap.value": Math.min((ap + startAp), maxAp) });
        // go through all effects
        for (let effect of this.effects) {
            if (effect.type === "status") {
                for (let part of effect.system.damage) {
                    const origin = await fromUuid(effect.origin);
                    const level = origin ? origin.system.attributes.level : this.system.attributes.level;
                    // damage type
                    const type = part.type;

                    // base damage roll corresponding to actor level
                    const base = CONFIG.CELESTUS.baseDamage.formula[level];

                    const mult = calcMult(this, type, "0", part.value, 0);

                    const r = new Roll(`floor((${base})[${type}] * ${mult})`)
                    await r.toMessage({
                        speaker: { alias: `${this.name} - Status Damage` },
                        'system.isDamage': true,
                        'system.damageType': type,
                        'system.actorID': this.uuid,
                    });
                }
            }
            if (effect.isTemporary) {
                if (effect.duration.rounds > 1) {
                    effect.update({ "duration.rounds": effect.duration.rounds - 1 });
                }
                else {
                    effect.delete();
                }
            }
        }
    }

    /**
     * handles cleanup of a combat turn
     */
    endTurn() {

    }
}