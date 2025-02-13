import { byString, calculate } from "./helpers.mjs";

const attribute = /(@[\d\w.]+)/g;

/**
 *  Extends active effect class in order to bring functionality needed for celestus
 * @extends {ActiveEffect}
 */
export class CelestusEffect extends ActiveEffect {
    /** @override */
    get isSuppressed() {
        const aura = this.system?.aura;
        // check if this is an aura
        if (aura) {
            if (aura.has && !aura.targetsSelf && !this.flags?.celestus?.isChild) {
                return true;
            }
        }
        return false;
    }

    /**@override */
    static applyField(model, change, field) {
        // if the field is a number field, we perform calculations
        if (typeof field.options?.integer !== "undefined") {
            let value = change.value;
            const roll = new Roll(value, model.getRollData()).evaluateSync();
            change.value = roll.total;
            if (field.options.integer) {
                change.value = Math.round(change.value);
            }
        }
        return super.applyField(model, change, field);
    }

    /** @override */
    async _preUpdate(changed, options, user) {
        const allowed =  await super._preUpdate(changed, options, user);
        if (allowed === false) return false;
        // check if enabled status changed
        if (typeof changed.disabled !== "undefined" && changed.disabled !== this.disabled) {
            if (changed.disabled === false) { // enabling effect, grant all items
                for (const item of this.system.grantedSkills) {
                    const sourceItem = await fromUuid(item.uuid);
                    const newItem = await this.parent?.createEmbeddedDocuments("Item", [sourceItem.toJSON()]);
                    if (newItem) {
                        // mark new Item as always prepped
                        await newItem[0].update({ "system.memorized": "always" });
                        // record that this effect "owns" this item
                        let grantedArr = this.system.ownedItems;
                        if (!grantedArr) {
                            grantedArr = [];
                        }
                        grantedArr.push(newItem[0].id);
                        this.updateSource({ "system.ownedItems": grantedArr })
                    }
                }
            }
            else if (changed.disabled === true) { // remove all items granted by this skill
                for (const id of this.system.ownedItems) {
                    const item = this.parent.items.find(i => i.id === id);
                    if (item) {
                        item.delete();
                    }
                    else {
                        console.error(`Item not found: ${id}`)
                    }
                }
                let system = changed.system;
                if (!system) {
                    changed.system = {};
                    system = changed.system;
                }
                system.ownedItems = [];
            }
        }

    }

    /** @override */
    async _preCreate(data, options, user) {
        if (!data.system) return await super._preCreate(data, options, user);
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false) return false;
        const grantedSkills = data.system?.grantedSkills;
        if (grantedSkills && !data.disabled) {
            const grantedIds = [];
            for (const item of grantedSkills) {
                const sourceItem = await fromUuid(item.uuid);
                const newItems = await this.parent?.createEmbeddedDocuments("Item", [sourceItem.toJSON()]);
                if (newItems) {
                    // mark new Item as always prepped
                    await newItems[0].update({ "system.memorized": "always" });
                    // record that this effect "owns" this item
                    grantedIds.push(newItems[0].id);
                }
            }
            options.system = {ownedItems: grantedIds};
        }
    }
    refreshing = false;
    /** @override */
    async _onUpdate(documents, operation, user) {
        const allowed = await super._onUpdate(documents, operation, user);
        if (allowed === false || !game.users.activeGM.isSelf || this.refreshing) return false;
        this.refreshing = true;
        // cleanup and then re-spread aura
        await this.cleanupAura();
        const actor = this.parent;
        if (this.system.aura?.has && actor && actor.documentName === "Actor") {
            const tokens = actor.getActiveTokens();
            for (const token of tokens) {
                await token.spreadAuraFrom();
            }
        }
        this.refreshing = false;
    }

    /** @override */
    _onCreate(data, options, userid) {
        this.updateSource({ "system.ownedItems": options.system?.ownedItems ?? [] });
        const actor = this.parent;
        if (actor && actor.documentName === "Actor") {
            const tokens = actor.getActiveTokens();
            for (const token of tokens) {
                token.spreadAuraFrom();
            }
        }
    }

    /** @override */
    _onDelete(options, userId) {
        if (this.system?.ownedItems) {
            // remove all items granted by this skill
            for (const id of this.system.ownedItems) {
                const item = this.parent.items.find(i => i.id === id);
                if (item) item.delete();
            }
        }
        // clean up all aura children
        this.cleanupAura();
    }

    /**
     * Cleans up all children belonging to this effect's aura if aura doesnt linger
     * @returns {Promise}
     */
    async cleanupAura() {
        if (!game.users.activeGM.isSelf) return;
        if (!this.system?.aura?.has ||
            this.system.aura.lingerDuration !== 0 ||
            this.flags?.celestus?.isChild) return;
        // iterate through aura's children
        for (const id of this.system.aura.children) {
            // get child and delete it
            const child = await fromUuid(id);
            if (child) await child.delete();
        }
        this.updateSource({"system.aura.children": []});
    }
}