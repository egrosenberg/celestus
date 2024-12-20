const BASE_AS = 10; // base ability score value

export class CelestusActor extends Actor {
    /** @override */
    prepareDerivedData() {
        const actor = this.system;
        // update ability score modifiers
        // iterate through abilities
        for (let [key, ability] of Object.entries(actor.abilities)) {
            // calculate modifier
            let total = ability.value + ability.bonus - BASE_AS;
            let modifier = total * CONFIG.CELESTUS.abilityMod[key];
            modifier += CONFIG.CELESTUS.baseAbilityMod[key];
            // update modifier value
            ability.mod = modifier;
        }
        
        // update combat ability values
        for (let [key, ability] of Object.entries(actor.combat)) {
            // calculate total
            ability.value = ability.base + ability.bonus;
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

        // calculate health
        const hpMod = actor.abilities.con.mod;
        const currentHP = actor.resources.hp.value
        const missingHP = actor.resources.hp.max - currentHP;
        let maxHP = CONFIG.CELESTUS.maxHP[actor.attributes.level] * (1 + hpMod);
        actor.resources.hp.max = parseInt(maxHP);
        // dont damage character when lowering con unless current hp is less than new max
        let newHP = Math.max((maxHP - missingHP), currentHP);
        newHP = Math.min(newHP, maxHP);
        actor.resources.hp.value = parseInt(newHP);

        // calculate crit chance
        const witMod = actor.abilities.wit.mod;
        actor.attributes.crit_chance = actor.abilities.wit.mod;
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
        else
        {
            console.log(`DR type "${type}" does not exist`);
        }
        return Math.floor(damage);
    }

    /**
     * Applies damage to the actor, incorporates damage resist as well as armors
     * 
     * @param {number} damage : amount of damage (pref int)
     * @param {string} type : type of damage (must exist in CONFIG.CELESTUS.damageTypes)
     * @param {CelestusActor} attacker: actor attacking this
     */
    async applyDamage(damage, type, attacker) {
        damage = this.calcDamage(damage, type);

        console.log(`Damage: ${damage}, Type: ${type}, Style: ${CONFIG.CELESTUS.damageTypes[type].style}`)
        // remainder damage after armor
        let remaining = damage;
        // apply damage to armor if applicable
        //physical damage
        if (CONFIG.CELESTUS.damageTypes[type].style === "physical") {
            // apply damage to physical armor
            const cPhysArmor = this.system.resources.phys_armor.value;
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
                await this.update({ "system.resources.phys_armor.value": parseInt(newPhysArmor) })
            }
        }
        // magical damage
        else if (CONFIG.CELESTUS.damageTypes[type].style === "magical") {
            // apply damage to magical armor
            const cMagArmor = this.system.resources.mag_armor.value;
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
                await this.update({ "system.resources.mag_armor.value": parseInt(newMagArmor) })
            }
        }
        // healing
        else if (CONFIG.CELESTUS.damageTypes[type].style === "healing") {
            // physical armor restoration (cant go above max physical armor)
            if (CONFIG.CELESTUS.damageTypes[type].text === "phys_armor") {
                // calculate new physical armor value
                const cPhysArmor = this.system.resources.phys_armor.value;
                const maxPhysArmor = this.system.resources.phys_armor.max;
                let newPhysArmor = cPhysArmor + remaining;
                // cap physical armor at max value
                newPhysArmor = (newPhysArmor > maxPhysArmor) ? maxPhysArmor : newPhysArmor;
                // update physical armor value
                await this.update({ "system.resources.phys_armor.value": parseInt(newPhysArmor) });
                // zero out remaining
                remaining = 0;
            }
            // magic armor restoration (cant go above max physical armor)
            else if (CONFIG.CELESTUS.damageTypes[type].text === "mag_armor") {
                // calculate new magic armor value
                const cMagArmor = this.system.resources.mag_armor.value;
                const maxMagArmor = this.system.resources.mag_armor.max;
                let newMagArmor = cMagArmor + remaining;
                // cap magic armor at max value
                newMagArmor = (newMagArmor > maxMagArmor) ? maxMagArmor : newMagArmor;
                // update magic armor value
                await this.update({ "system.resources.mag_armor.value": parseInt(newMagArmor) });
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
        const value = this.system.resources.hp.value;
        const maxHealth = this.system.resources.hp.max;
        // calculate the new damage
        let newHealth = value - remaining;
        // set to max of 0 and new health
        newHealth = Math.max(newHealth, 0);
        // set to min of newhealth and max health
        newHealth = Math.min(newHealth, maxHealth);
        console.log(`currentHP: ${value}, newHealth: ${newHealth}, dmg: ${remaining}`);
        // update health value
        await this.update({ "system.resources.hp.value": parseInt(newHealth) });
        // Log a message.
        console.log(`${this.name} took ${damage} ${type} damage!`);
    }

    /**
     * 
     * @param {SkillData} skill : object containing info of the skill to use
     */
    async useSkill(skill) {
        
        const actor = this.system;

        // verify resources
        if (skill.system.ap > actor.resources.ap.value) {
            const apError = new Dialog({
                title: "Insufficient Resources",
                content: `Actor has insufficient Action Points to use chosen skill`,
                buttons: {
                    button1:
                    {
                        label: "Ok",
                        icon: `<i class="fas fa-check"></i>`
                    }
                }
            }).render(true);
            return;
        }
        else if (skill.system.jp > actor.resources.jiriki.value) {
            const jpError = new Dialog({
                title: "Insufficient Resources",
                content: `Actor has insufficient Jiriki Points to use chosen skill`,
                buttons: {
                    button1:
                    {
                        label: "Ok",
                        icon: `<i class="fas fa-check"></i>`
                    }
                }
            }).render(true);
            return;
        }
        // use resources
        await this.update({"system.resources.ap.value": actor.resources.ap.value - skill.system.ap});
        await this.update({"system.resources.jirki.value": actor.resources.jiriki.value - skill.system.jp});

        const path = './systems/celestus/templates/skillDescription.hbs';
        const msgData = {
            name: skill.name,
            flavor: skill.system.description,
        }
        const msg = await renderTemplate(path, msgData);
        await ChatMessage.create({
            content : msg, speaker: {alias: this.name},
            'system.actorID': this.uuid,
            'system.isSkill': true,
            'system.itemID': skill.uuid,
            'system.skill.hasAttack': skill.system.attack,
        });
    }

    /**
     * refreshes all armor, health, and other resources
     * removes temp resources
     */
    async refresh() {
        // update hp
        this.update({ "system.resources.hp.value": this.system.resources.hp.max });
        // update physical armor
        this.update({ "system.resources.phys_armor.value": this.system.resources.phys_armor.max });
        // remove temp physical armor
        this.update({ "system.resources.phys_armor.temp": 0 });
        // update magic armor
        this.update({ "system.resources.mag_armor.value": this.system.resources.mag_armor.max });
        // remove temp magic armor
        this.update({ "system.resources.mag_armor.temp": 0 });

        // refresh ap
        this.update({ "system.resources.ap.value": this.system.resources.ap.start });
        // refresh jiriki points
        this.update({ "system.resources.jiriki.value": this.system.resources.jiriki.max });
    }
}