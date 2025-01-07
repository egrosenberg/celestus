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
            if (aura.has && !aura.targetsSelf && this.origin === this.parent.uuid) {
                return true;
            }
        }
        return false;
    }

    /**@override */
    static applyField(model, change, field) {
        let value = change.value;
        value = value.replaceAll(attribute, (s) => {
            // get value from object
            const val = byString(model, s.substring(1));
            return val || "";
        });
        try {
            change.value = calculate(value);
        }
        catch {
            console.error("CELESTUS | ERROR: Unable to parse effect calculation: " + value);
        }
        return super.applyField(model, change, field);
    }

    /** @override */
    async _preUpdate(changed, options, user) {
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

        return await super._preUpdate(changed, options, user);
    }

    /** @override */
    async _preCreate(data, options, user) {
        if (!data.system) return await super._preCreate(data, options, user);
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
                    console.log(newItems[0].id);
                }
            }
            options.system = {ownedItems: grantedIds};
        }
        return await super._preCreate(data, options, user);
    }

    _onCreate(data, options, userid) {
        this.updateSource({ "system.ownedItems": options.system?.ownedItems ?? [] });
    }

    /** @override */
    _onDelete(options, userId) {
        // remove all items granted by this skill
        for (const id of this.system.ownedItems) {
            const item = this.parent.items.find(i => i.id === id);
            if (item) item.delete();
        }
    }
}