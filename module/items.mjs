import { byString, calcMult } from "./helpers.mjs";

/**
 * Extends the basic item class for skills
 * @extends {Item}
 */
export class CelestusItem extends Item {
    /**
     * Prepare derived data
     */
    prepareData() {

    }


    /** @override */
    async _preUpdate(changed, options, user) {
        // call super
        const allowed = await super._preUpdate(changed, options, user);
        if (allowed === false) return false;

        if (this.type === "armor") {
            const spread = changed.system?.spread;
            if (spread && spread !== "none") {
                const base = CONFIG.CELESTUS.armor.spreads[spread] ?? CONFIG.CELESTUS.armor.spreads.none;
                changed.system.base = {
                    phys: base.phys,
                    mag: base.mag,
                }
            }
        }
        if (this.type === "offhand") {
            const spread = changed.system?.spread;
            if (spread && spread !== "none") {
                const base = CONFIG.CELESTUS.offhand.spreads[spread] ?? CONFIG.CELESTUS.offhand.spreads.none;
                changed.system.base = {
                    phys: base.phys,
                    mag: base.mag,
                }
            }
        }
        // check if enabled status changed
        if (changed.system?.equipped !== this.system.equipped) {
            if (changed.system?.equipped === true) { // enabling effects
                for (const effect of this.effects) {
                    if (effect.disabled) {
                        continue;
                    }
                    let effectData = effect.toJSON();
                    effectData.type = "status";
                    if (this.parent?.documentName === "Actor") {
                        effectData.origin = this.parent.uuid;
                    }
                    const [newEffect] = await this.parent?.createEmbeddedDocuments("ActiveEffect", [effectData]);
                    if (newEffect) {
                        let grantedIds = this.system.ownedEffects;
                        // record that this effect "owns" this item
                        grantedIds.push(newEffect.id);
                        this.updateSource({ "system.ownedEffects": grantedIds });
                    }
                }
            }
            else if (changed.system?.equipped === false) { // remove all granted effects
                for (const id of this.system.ownedEffects) {
                    const effect = this.parent.effects.find(e => e.id === id);
                    if (effect) {
                        await effect.delete();
                    }
                    else {
                        console.error(`CELESTUS | Effect not found: ${id}`)
                    }
                }
                this.updateSource({ "system.ownedEffects": [] });
            }
        }

        // socketing stuff
        if (this.type === "armor") {
            // initialize spread when changing rarity
            const newRarity = changed.system?.rarity;
            if (newRarity && newRarity !== this.system.rarity) {
                this.updateSource({"system.socketSpread": newRarity});
            }
            // apply spread
            let socketSpread = changed.system?.socketSpread;
            if (socketSpread && socketSpread !== this.system.socketSpread || newRarity) {
                if (newRarity) {
                    socketSpread = newRarity;
                }
                const spread = CONFIG.CELESTUS.itemSocketSpreads.find(s => s.id === socketSpread);
                if (spread) {
                    let socketTypes = [];
                    for (const [index, socket] of Object.entries(spread.boosts)) {
                        socketTypes.push(socket);
                    }
                    this.updateSource({"system.socketTypes": socketTypes});
                    console.log(this.system.socketTypes, socketTypes)
                }
            }
            // update plug id when selecting a socket
            const newSockets = changed.system?.socketValues;
            if (newSockets) {
                let newPlugs = [];
                for (const socketID of newSockets) {
                    if (!socketID) continue;
                    // fetch socket info
                    const socket = CONFIG.CELESTUS.itemSockets.find(s => s.id == socketID);
                    if (socket) {
                        newPlugs.push(socket.plug);
                    }
                }
                this.updateSource({"system.plugIds": newPlugs})
            }
        }
    }

    /** @override */
    _onDelete(options, userId) {
        const allowed = super._onDelete(options, userId);
        if (allowed === false) return;
        if (this.system.ownedEffects) {
            for (const id of this.system.ownedEffects) {
                const effect = this.parent.effects.find(e => e.id === id);
                if (effect) {
                    effect.delete();
                }
                else {
                    console.error(`CELESTUS | Effect not found: ${id}`)
                }
            }
        }
    }
    /**
     * prepare data object for rolls
     * @override
     */
    getRollData() {
        // populate with system data
        const rollData = { ...super.getRollData() };
        rollData.config = CONFIG.CELESTUS;

        // return if no parent actor
        if (!this.actor) return rollData;

        // calculate damage if skill
        if (this.type === "skill") {
            let damage = {
                formula: "",
                min: 0,
                max: 0,
                avg: 0,
            };
            let first = true;
            for (let part of this.system.damage) {
                if (!first) {
                    damage.formula += " + "
                }
                else {
                    first = false;
                }
                const mult = calcMult(this.actor, part.type, this.system.ability, part.value, false, 0);
                damage.formula += `((${CONFIG.CELESTUS.baseDamage.formula[this.actor.system.attributes.level]})*${part.value})[${part.type}]`;
                const min = parseInt(CONFIG.CELESTUS.baseDamage.min[this.actor.system.attributes.level] * mult);
                const max = parseInt(CONFIG.CELESTUS.baseDamage.max[this.actor.system.attributes.level] * mult);
                const avg = parseInt(CONFIG.CELESTUS.baseDamage.avg[this.actor.system.attributes.level] * mult);
                damage.min += min;
                damage.max += max;
                damage.avg += avg;
                // itemized type
                if (!damage[part.type]) {
                    damage[part.type] = {
                        min: 0,
                        max: 0,
                        avg: 0,
                    };
                }
                damage[part.type].min += min;
                damage[part.type].max += max;
                damage[part.type].avg += avg;
            }

            rollData.dmg = damage;
        }
        else if (this.type === "armor") {
            if (this.system.type !== "none") {
                rollData.armor = this.system.value;
            }
        }

        // add actor's roll data
        rollData.actor = this.actor.getRollData();
        rollData.item = this;

        return rollData;
    }

    /**
     * handle clickable rolls
     * @param {Event} event: The originating click event
     * @private
     */
    async roll() {
        if (this.type === "skill") {
            // get actor
            const actor = this.parent;
            // call roll skill
            actor.useSkill(this);
        }
        else {
            const path = `./systems/celestus/templates/rolls/${this.type}-roll.hbs`;
            const msgData = {
                owner: this.parent.name,
                ownerPortrait: this.parent.prototypeToken.texture.src,
                user: game.user.name,
                name: this.name,
                flavor: this.system.description,
                portrait: this.img,
                item: this,
                system: this.system,
                config: CONFIG.CELESTUS,
            }
            let msg = await renderTemplate(path, msgData);
            // do text enrichment
            msg = await TextEditor.enrichHTML(
                msg,
                {
                    // Only show secret blocks to owner
                    secrets: this.isOwner,
                    async: true,
                    // For Actors and Items
                    rollData: this.getRollData()
                }
            );
            await ChatMessage.create({
                content: msg,
                'system.type': "roll",
                'system.actorID': this.parent.uuid,
            });
        }
    }
    async generateAllFromRarity() {
        await this.randSocketSpread();
        await this.autoSelectAllSockets();
    }

    async randSocketSpread() {
        // find all valid spreads
        const validSpreads = CONFIG.CELESTUS.itemSocketSpreads.filter(s => (
            (s.id === this.system.rarity || s.parent === this.system.rarity) &&
            s.minLvl <= this.system.level
        ));
        // if no valid spreads, ignore
        if (validSpreads.length === 0) return;
        // create a roll table
        let rollTable = [];
        for (const spread of validSpreads) {
            for (let i = 0; i < spread.weight; i++) {
                rollTable.push(spread.id);
            }
        }
        // select a random  element on the table
        const i = Math.floor(Math.random() * rollTable.length);
        // update socket spread
        await this.update({"system.socketSpread": rollTable[i]});
    }

    // automatically selects all socket values and plug ids
    async autoSelectAllSockets() {
        for (let i = 0; i < this.system.socketTypes.length; i++) {
            await this.autoSelectSocket(i);
        }
    }

    /**
     * Randomly selects a socket for a given slot index
     * updates source socketValue and plugId
     * @param {Integer} index 
     */
    async autoSelectSocket(index) {
        // check for socketType
        const socketType = this.system.socketTypes[index];
        if (!socketType) {
            let curSockets = this.system.socketValues;
            curSockets[index] = "";
            await this.update({"system.socketValues": curSockets});
            let curPlugs = this.system.plugIds;
            curPlugs[index] = "";
            await this.update({"system.plugIds": curPlugs});
            return;
        }
        // find all possible sockets
        const validSockets = CONFIG.CELESTUS.itemSockets.filter(s => (
            s.type.includes(socketType) &&
            s.gearType === this.type &&
            s.slot === this.system.slot &&
            s.minLvl <= this.system.level
        ));
        // if no valid sockets, ignore
        if (validSockets.length === 0) return;
        // generate a random number to select the socket
        const i = Math.floor(Math.random() * validSockets.length);
        // update socketValues
        let curSockets = this.system.socketValues;
        curSockets[index] = validSockets[i].id;
        await this.update({"system.socketValues": curSockets});
        // update plugIds
        let curPlugs = this.system.plugIds;
        curPlugs[index] = validSockets[i].plug;
        await this.update({"system.plugIds": curPlugs});
    }

    /**
     * Applies all plugs from actor
     */
    applyAllPlugs() {
        for (const id of this.system.plugIds) {
            if (id) {
                this.applyPlug(id);
            }
        }
    }

    /**
     * apply bonuses from a plug
     * @param {String} id of plug to calculate
     */
    applyPlug(id) {
        const plugs = CONFIG.CELESTUS.itemPlugs[this.type];
        if (!plugs) return;
        // find plug from id
        const plug = plugs.find(p => p.id === id);
        if (plug) {
            // apply all changes
            const changes = plug.changes;
            if (changes) {
                for (const change of changes) {
                    // get current value
                    const current = byString(this, change.id);
                    if (typeof current !== "undefined") {
                        // apply change based on applyMode
                        if (change.mode === "Add") {
                            this.update({[change.id]: current + change.value});
                        }
                        else if (change.mode === "Append") {
                            current.push(change.value);
                            this.update({[change.id]: current});
                        }
                        else if (change.mode === "Override") {
                            this.update({[change.id]: change.value});
                        }
                    }
                }
            }
        }
        return;
    }
}