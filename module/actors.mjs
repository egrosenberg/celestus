const BASE_AS = 10; // base ability score value

export class CelestusActor extends Actor {
    /** @override */
    prepareDerivedData() {
        const actor = this.system;
        // update ability score modifiers
        // calculate spent/unspent points
        let spentPoints = 0;
        // iterate through abilities
        for (let [key, ability] of Object.entries(actor.abilities)) {
            // update spent points
            spentPoints += ability.value - BASE_AS;
            // calculate modifier
            let total = ability.value + ability.bonus - BASE_AS;
            let modifier = total * CONFIG.CELESTUS.abilityMod[key];
            modifier += CONFIG.CELESTUS.baseAbilityMod[key];
            // update modifier value
            ability.mod = modifier;
            ability.total = ability.value + ability.bonus;
        }
        actor.attributes.unspentPoints = (actor.attributes.level * 2) + CONFIG.CELESTUS.baseAbilityPoints - spentPoints;

        // update combat ability values
        for (let [key, ability] of Object.entries(actor.combat)) {
            // calculate total
            ability.value = ability.base + ability.bonus;
            ability.mod = 0.05 * ability.value;
        }
        // update civil ability values
        for (let [key, ability] of Object.entries(actor.civil)) {
            // calculate total
            ability.value = ability.base + ability.bonus;
        }

        // update damage bonus modifiers
        // iterate through damage types
        for (let [key, value] of Object.entries(actor.attributes.damage)) {
            // get combat skill name to use for damage bonus
            const cSkill = CONFIG.CELESTUS.damageTypes[key].skill;
            // calculate modifier
            let total = actor.combat[cSkill].value + actor.combat[cSkill].bonus;
            let modifier = total * CONFIG.CELESTUS.combatSkillMod;
            // update modifier value
            value = modifier;
        }

        // reset spent memory
        actor.attributes.memory.spent = 0;
        // log current armor state
        const cPhysArmor = actor.resources.phys_armor.flat;
        const cMagArmor = actor.resources.mag_armor.flat;
        // fix any weird issues with missing amounts
        // reset derrived armor values
        actor.resources.phys_armor.max = 0;
        actor.resources.mag_armor.max = 0;
        // iterate through items
        for (const item of this.items) {
            // check if item is an armor piece and equipped
            if (item.type === "armor" && item.system.equipped) {
                // calculate armor values
                const phys = CONFIG.CELESTUS.baseArmor[item.system.type][item.system.slot][actor.attributes.level].phys;
                const mag = CONFIG.CELESTUS.baseArmor[item.system.type][item.system.slot][actor.attributes.level].mag;
                // increase max armor
                actor.resources.phys_armor.max += phys;
                actor.resources.mag_armor.max += mag;
            }
            if (item.type === "skill" && item.system.memorized) {
                actor.attributes.memory.spent += item.system.memSlots;
            }
        }
        // add flat misc max bonuses
        actor.resources.phys_armor.max += actor.resources.phys_armor.bonus;
        actor.resources.mag_armor.max += actor.resources.mag_armor.bonus;
        // let armor max be affected by con
        actor.resources.phys_armor.max *= (1 + actor.abilities.con.mod)
        actor.resources.mag_armor.max *= (1 + actor.abilities.con.mod)
        // convert back to int
        actor.resources.phys_armor.max = parseInt(actor.resources.phys_armor.max)
        actor.resources.mag_armor.max = parseInt(actor.resources.mag_armor.max)
        // set new value to current - missing
        let newPhys = Math.min(actor.resources.phys_armor.max, cPhysArmor);
        let newMag = Math.min(actor.resources.mag_armor.max, cMagArmor);
        // dont let current go below 0
        newPhys = Math.max(newPhys, 0);
        newMag = Math.max(newMag, 0);
        // update current armor
        actor.resources.phys_armor.flat = newPhys;
        actor.resources.mag_armor.flat = newMag;

        // calculate health
        const hpMod = actor.abilities.con.mod;
        const currentHP = actor.resources.hp.flat;
        const missingHP = actor.resources.hp.max - currentHP;
        let maxHP = CONFIG.CELESTUS.maxHP[actor.attributes.level] * (1 + hpMod);
        actor.resources.hp.max = parseInt(maxHP);
        // dont damage character when lowering con unless current hp is less than new max
        let newHP = Math.max((maxHP - missingHP), currentHP);
        newHP = Math.min(newHP, maxHP);
        actor.resources.hp.flat = parseInt(newHP);

        // update resource totals
        actor.resources.hp.value = actor.resources.hp.flat;
        actor.resources.phys_armor.value = actor.resources.phys_armor.flat + actor.resources.phys_armor.temp;
        actor.resources.mag_armor.value = actor.resources.mag_armor.flat + actor.resources.mag_armor.temp;

        // calculate crit chance
        actor.attributes.bonuses.crit_chance.value = actor.abilities.wit.mod;

        // calculate memory
        actor.attributes.memory.total = parseInt(Math.floor((actor.attributes.level) / 2) + (actor.abilities.mind.value) - 7);

        // final unspent skill points update for formshifter
        actor.attributes.unspentPoints += actor.combat.formshifter.value * 2;
    }

    /**
     * 
     * @param {number} damage : amount of base damage to do (will be cast to int)
     * @param {string} type : type of damage
     * @returns {int} total damage after resists
     */
    calcDamage(damage, type) {
        damage = parseInt(damage);
        // subtract resisted damage from damage
        if (typeof this.system.attributes.resistance[type] !== 'undefined') {
            const DR = this.system.attributes.resistance[type].value + this.system.attributes.resistance[type].bonus;
            damage -= DR * damage;
        }
        else {
            console.log(`DR type "${type}" does not exist`);
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
    async applyDamage(damage, type, base, origin) {
        damage = this.calcDamage(damage, type);

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
            // magic armor restoration (cant go above max physical armor)
            else if (CONFIG.CELESTUS.damageTypes[type].text === "mag_armor") {
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
            // temp physical armor in addition to base armor, can only have one source at a time
            else if (CONFIG.CELESTUS.damageTypes[type].text === "t_phys_armor") {
                // calculate new physical armor value
                const cTPhysArmor = this.system.resources.phys_armor.temp;
                // set new temp phys armor to max between current and damage
                let newTPhysArmor = (cTPhysArmor > remaining) ? cTPhysArmor : remaining;
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
        // Log a message.
        console.log(`${this.name} took ${damage} ${type} damage!`);
    }

    /**
     * Calculates the multiplier for a specified damage roll
     * 
     * @param {String} type: elemental type of damage
     * @param {String} ability: ability to scale damage with ("none" if no scalar)
     * @param {Number} base: damage multiplier from damage source percent
     * @param {String} flat: flat damage bonus as percent
     * @returns {Number} multiplier to apply to damage roll
     */
    calcMult (type, ability, base, flat = 0) {
        // elemental damage bonus percentage
        let elementBonus = 0;
        if (type !== "none") {
            elementBonus = this.system.attributes.damage[type];
        }
        // bonus from ability associated with skill
        let abilityBonus = 0;
        if (ability !== "none") {
            abilityBonus = this.system.abilities[ability].mod;
        }

        return 1 * (base) * (1 + elementBonus) * (1 + abilityBonus) * (1 + flat);
    }

    /**
     * 
     * @param {SkillData} skill : object containing info of the skill to use
     */
    async useSkill(skill) {
        // dont use skill if its on cooldown
        if (skill.system.cooldown.value > 0) {
            return ui.notifications.warn("Error: ability is on cooldown!");
        }

        const actor = this.system;

        // verify resources
        if (skill.system.ap > actor.resources.ap.value) {
            return ui.notifications.warn("Actor has insufficient Action Points to use chosen skill");
        }
        else if (skill.system.jp > actor.resources.jiriki.value) {
            return ui.notifications.warn("Actor has insufficient Jiriki Points to use chosen skill");
        }
        // use resources
        await this.update({ "system.resources.ap.value": actor.resources.ap.value - skill.system.ap });
        await this.update({ "system.resources.jirki.value": actor.resources.jiriki.value - skill.system.jp });

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
        
        // set skill on cooldown if in combat (currently set to true for debugging)
        if (true) {
            skill.update({"system.cooldown.value": skill.system.cooldown.max});
        }
    }

    /**
     * refreshes all armor, health, and other resources
     * removes temp resources
     */
    async refresh() {
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
        // refresh jiriki points
        this.update({ "system.resources.jiriki.value": this.system.resources.jiriki.max });

        // reset all cooldowns
        for (let item of this.items) {
            if (item.type === "skill" ) {
                item.update({"system.cooldown.value": 0});
            }
        }
    }

    /**
     * handles all upkeep for a combat turn
     */
    progressRound() {
        // progress all cooldowns
        for (let item of this.items) {
            if (item.type === "skill" ) {
                const cd = item.system.cooldown.value;
                if (cd > 0)
                {
                    item.update({"system.cooldown.value": cd - 1});
                }
            }
        }
    }
}