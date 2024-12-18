export class CelestusActor extends Actor {
    /**
     * Applies damage to the actor, incorporates damage resist as well as armors
     * 
     * @param {number} damage : amount of damage (pref int)
     * @param {string} type : type of damage (must exist in CONFIG.CELESTUS.damageTypes)
     */
    async applyDamage(damage, type) {
        damage = parseInt(damage);
        // subtract resisted damage from damage
        if (this.system.attributes.resistance[type].value && this.system.attributes.resistance[type].bonus) {
            const DR = this.system.attributes.resistance[type].value + this.system.attributes.resistance[type].bonus;
            damage -= DR * damage;
        }

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
        console.log(actor);

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
            name: skill.system.name,
            flavor: skill.system.description,
            itemID: skill.uuid,
            actorID: this.uuid,
            attack: skill.system.attack,
        }
        const msg = await renderTemplate(path, msgData);
        await ChatMessage.create({content : msg, speaker: {alias: this.name}});
    }
}

