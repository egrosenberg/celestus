import { byString, matchIfPresent, rollAbility } from "./helpers.mjs";
import { onManageActiveEffect } from "./hooks.mjs";

/**
 * Extends the basic ActorSheet with system specific functions
 * 
 * @extends { ActorSheet }
 */
export class CharacterSheet extends ActorSheet {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["celestus", "sheet", "actor"],
            template: "./systems/celestus/templates/actor/actor-sheet.hbs",
            width: 900,
            height: 700,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }],
            scrollY: [".sheet-header", ".sheet-main"],
        });
    }
    /** @override */
    get template() {
        return `./systems/celestus/templates/actor/actor-${this.actor.type}-sheet.hbs`;
    }

    /** @override */
    async getData() {
        // retrieve the data structure from the base sheet
        const context = super.getData();

        // get actor data
        const actorData = context.data;

        // add actor data and flags to context for easier access
        context.system = actorData.system;
        context.flags = actorData.flags;

        // prepare character data and items
        this._prepareItems(context);

        // add rolldata for TinyMCE editors
        context.rollData = actorData.system;

        // pass config data
        context.config = CONFIG.CELESTUS;
        context.statusEffects = CONFIG.statusEffects.reduce((object, status) => {
            object[status.id] = status;
            return object;
        });

        // do text enrichment
        context.enrichedDescription = await TextEditor.enrichHTML(
            this.document.system.biography,
            {
                // Only show secret blocks to owner
                secrets: this.document.isOwner,
                async: true,
                // For Actors and Items
                rollData: this.document.getRollData()
            }
        );

        return context;
    }

    /**
     * 
     * @param {Object} context: actorData of the actor to prepare 
     */
    _prepareItems(context) {
        // initialize containers for items
        const gear = [];
        // iterate through items// Iterate through items, allocating to containers
        for (let i of context.items) {
            i.img = i.img || Item.DEFAULT_ICON;
            // Append to gear.
            if (i.type === 'armor' || i.type === 'weapon') {
                gear.push(i);
            }
        }

        context.gear = gear;

    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Render the item sheet for viewing/editing prior to the editable check.
        html.on('click', '.item-edit', (ev) => {
            const li = $(ev.currentTarget).parents('.item');
            const item = this.actor.items.get(li.data('itemId'));
            item.sheet.render(true);
        });


        // render progress bars for resources
        html.find('.resource-value').each((index, target) => {
            const varPath = target.id;
            const resourceVal = this.object.system.resources[varPath.substring(varPath.lastIndexOf('.') + 1)].value;
            const resourceMax = this.object.system.resources[varPath.substring(varPath.lastIndexOf('.') + 1)].max;
            const resourcePercent = (resourceVal / resourceMax);
            // draw gradient depending on if overflowing or not
            let gradient;
            if (resourcePercent > 1) {
                const gradientCol = "rgba(255,255,255,0.25)";
                gradient = `linear-gradient(to left, ${gradientCol} ${((1 - resourcePercent) * -100)}%, rgba(0,0,0,0) 0%)`;
            }
            else if (resourcePercent > 0) {
                const gradientCol = "#404040";
                gradient = `linear-gradient(to left, ${gradientCol} ${((1 - resourcePercent) * 100)}%, rgba(0,0,0,0) 0%)`;
            }
            else {
                const gradientCol = "#404040";
                gradient = `linear-gradient(to right, ${gradientCol} ${((1 + resourcePercent) * 100)}%, rgba(0,0,0,0) 0%)`;
            }
            const curCSS = $(target).css("background-image");
            $(target).css("background-image", `${curCSS}, ${gradient}`);
            if (resourcePercent < 0) {
                $(target).css("background-color", `#ff9999`);
            }
        });

        // -------------------------------------------------------------
        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) return;

        // refresh all resources
        html.on('click', '#refresh-all', (ev) => {
            this.actor.refresh(false);
        })
        html.on('click', '#refresh-dawn', (ev) => {
            this.actor.refresh(true);
        })
        html.on('click', '#initiative', () => {
            this.actor.rollInitiative();
        })

        // set action points
        html.on('click', '.ap-interact', (ev) => {
            const index = $(ev.currentTarget).data('index') + 1;
            if (index === this.actor.system.resources.ap.value) {
                this.actor.update({ "system.resources.ap.value": this.actor.system.resources.ap.value - 1 });
            }
            else {
                this.actor.update({ "system.resources.ap.value": index });
            }
        })
        // set focus points
        html.on('click', '.fp-interact', (ev) => {
            const index = $(ev.currentTarget).data('index') + 1;
            if (index === this.actor.system.resources.fp.value) {
                this.actor.update({ "system.resources.fp.value": this.actor.system.resources.fp.value - 1 });
            }
            else {
                this.actor.update({ "system.resources.fp.value": index });
            }
        })

        // Add Inventory Item
        html.on('click', '.item-create', this._onItemCreate.bind(this));

        html.on('click', '.ability-roll', (ev) => {
            const ability = $(ev.currentTarget).data('label')
            rollAbility(this.actor, ability);
        });

        // Delete Inventory Item
        html.on('click', '.item-delete', (ev) => {
            const li = $(ev.currentTarget).parents('.item');
            const item = this.actor.items.get(li.data('itemId'));
            item.delete();
            li.slideUp(200, () => this.render(false));
        });

        // Equip Inventory Item
        html.on('click', '.item-equip', (ev) => {
            const li = $(ev.currentTarget).parents('.item');
            this.actor.equip(li.data('itemId'));
        });
        // Equip armor from popup
        html.on('click', '.armor-equip', (ev) => {
            const slot = $(ev.currentTarget).data('itemSlot');
            if (slot.startsWith("ring")) {
                this.actor.equip($(ev.currentTarget).data('itemId'), parseInt(slot[slot.length - 1]));
            }
            else if (slot === "right") {
                this.actor.equip($(ev.currentTarget).data('itemId'), 2);
            }
            else {
                this.actor.equip($(ev.currentTarget).data('itemId'));
            }
        });

        // manage active effects
        html.on('click', '.effect-control', (ev) => {
            const row = ev.currentTarget.closest('li');
            const document =
                row.dataset.parentId === this.actor.id
                    ? this.actor
                    : this.actor.items.get(row.dataset.parentId);
            onManageActiveEffect(ev, document);
        });


        // memorize or unmemorize a skill
        html.on('click', '.item-memorize', (ev) => {
            const li = $(ev.currentTarget).parents('.item');
            const item = this.actor.items.get(li.data('itemId'));
            if (item.system.memorized === "true") {
                item.update({ "system.memorized": "false" });
            }
            else if (item.system.memorized === "false") {
                // check memorization requirements
                if (item.system.memSlots + this.actor.system.attributes.memory.spent > this.actor.system.attributes.memory.total) {
                    return ui.notifications.warn(`Actor doesn't have enough free memory slots. (needed: ${item.system.memSlots}. free: ${this.actor.system.attributes.memory.total - this.actor.system.attributes.memory.spent})`);
                }
                // check ability prereqs
                if (item.system.type === "civil") {
                    for (let [key, prereq] of item.system.civilPrereqs) {
                        if ((this.actor.system.civil[key]?.value ?? -1) < prereq) {
                            return ui.notifications.warn(`Actor is missing prerequisite civil ability level (${key}: ${prereq})`);
                        }
                    }
                    item.update({ "system.memorized": "true" });
                }
                else {
                    for (let [key, prereq] of item.system.combatPrereqs) {
                        if ((this.actor.system.combat[key]?.value ?? -1) < prereq) {
                            return ui.notifications.warn(`Actor is missing prerequisite combat ability level (${key}: ${prereq})`);
                        }
                    }
                    item.update({ "system.memorized": "true" });
                }
            }
        });

        // browser armor pieces
        html.on('click', '.armor-socket-browse', async (ev) => {
            // check if this slot already has a template rendered, if so remove and return
            if ($(`.armor-browser.${$(ev.currentTarget).data('slot')}`).length) {
                $(`.armor-browser.${$(ev.currentTarget).data('slot')}`).remove();
                return;
            }
            let dataSet;
            let slot = $(ev.currentTarget).data('slot');
            if (slot.startsWith("ring")) {
                dataSet = this.actor.system.armor.ring;
            }
            else if (slot === "left" || slot === "right") {
                dataSet = this.actor.system.weapon;
                // handle offhands
                if (slot === "right") {
                    dataSet = dataSet.concat(this.actor.system.offhand);
                }
            }
            else {
                dataSet = this.actor.system.armor[$(ev.currentTarget).data('slot')]
            }
            // close any other extra browsers
            $('.armor-browser').remove();
            const msg = await renderTemplate("systems/celestus/templates/actor/parts/actor-armor-popup.hbs", {
                slot: $(ev.currentTarget).data('slot'),
                armor: dataSet,
            });
            const div = $(msg);
            div.css("left", $(ev.currentTarget).offset().left + 65);
            div.css("top", $(ev.currentTarget).offset().top - 65);
            const popup = $(html).append(div);
        });
        // item previews
        html.on('contextmenu', '.armor-socket-browse', (ev) => {
            const item = this.actor.items.get($(ev.currentTarget).data('itemId'));
            if(item) {
                item.sheet.render(true);
            }
        });

        // Rollable abilities.
        html.on('click', '.rollable', this._onRoll.bind(this));

        // item previews
        html.on('contextmenu', '.item', (ev) => {
            const item = this.actor.items.get($(ev.currentTarget).data('itemId'));
            item.sheet.render(true);
        });

        // Drag events for macros.
        if (this.actor.isOwner) {
            let handler = (ev) => this._onDragStart(ev);
            html.find('li.item').each((i, li) => {
                if (li.classList.contains('inventory-header')) return;
                li.setAttribute('draggable', true);
                li.addEventListener('dragstart', handler, false);
            });
        }

    }

    /**
       * Handle clickable rolls.
       * @param {Event} event   The originating click event
       * @private
       */
    _onRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;

        if (dataset.rollType == "skill") {
            const skill = this.actor.items.get(dataset.itemId);
            if (skill) this.actor.useSkill(skill);
            else console.error("CELESTUS | ERROR: skill not found");
        }
        else {
            const item = this.actor.items.get($(element).parents(".item").data("item-id"));
            if (item) item.roll();
            else console.error("CELESTUS | ERROR: item not found");
        }
    }


    /**
     * Creating an item for the actor
     * @param {Event} event   The originating click event
     * @private
     */
    async _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        // Get the type of item to create.
        const type = header.dataset.type;
        // Grab any data associated with this control.
        //const data = duplicate(header.dataset);
        // Initialize a default name.
        const name = `New ${type.capitalize()}`;
        // Prepare the item object.
        const itemData = {
            name: name,
            type: type,
            //system: data,
        };

        // create the item
        const item = await Item.create(itemData, { parent: this.actor });

        if (type === "feature") {
            return await item.update({ "system.type": "feature" });
        }
    }

}

/**
 * @extends { ItemSheet }
 */
export class CelestusItemSheet extends ItemSheet {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['celestus', 'sheet', 'item'],
            width: 800,
            height: 700,
            tabs: [
                {
                    navSelector: '.sheet-tabs',
                    contentSelector: '.sheet-body',
                    initial: 'description',
                },
            ],
            scrollY: [".window-content"],
        });
    }

    /** @override */
    get template() {
        const path = 'systems/celestus/templates/item';

        // return unique sheet by item type
        return `${path}/item-${this.item.type}-sheet.hbs`;
    }

    /** @override */
    async getData() {
        // Retrieve base data structure.
        const context = super.getData();

        // Use a safe clone of the item data for further operations.
        const itemData = context.data;

        // Retrieve the roll data for editors.
        context.rollData = this.document.getRollData();

        // Add the item's data to context.data for easier access, as well as flags.
        context.system = itemData.system;
        context.flags = itemData.flags;

        // pass config data
        context.config = CONFIG.CELESTUS;
        context.statusEffects = CONFIG.statusEffects;

        // item generation data
        let generation = {
            validSpreads: {},
            validSockets: [],
            plugChange: [],
        };
        const potentialSpreads = CONFIG.CELESTUS.itemSocketSpreads.filter(s => (
            (s.id === this.document.system.rarity || s.parent === this.document.system.rarity) &&
            s.minLvl <= this.document.system.level
        ));
        for (const spread of potentialSpreads) {
            generation.validSpreads[spread.id] = `${spread.id} | Req. lvl ${spread.minLvl}`;
        }
        if (potentialSpreads.length === 0) {
            generation.validSpreads.none = "none";
        }
        for (const i in this.document.system.socketTypes) {
            const type = this.document.system.socketTypes[i];
            if (type) {
                let weaponStyle;
                if (!this.document.system.twoHanded) {
                    weaponStyle = "onehand"
                }
                else {
                    if (this.document.system.range > 0) {
                        weaponStyle = "ranged"
                    }
                    else {
                        weaponStyle = "twohand"
                    }
                }
                const sockets = CONFIG.CELESTUS.itemSockets.filter(s => (
                    s.type.includes(type) &&
                    matchIfPresent(s.gearType, this.document.type) &&
                    matchIfPresent(s.slot, this.document.system.slot) &&
                    matchIfPresent(s.weaponStyle, weaponStyle) &&
                    matchIfPresent(s.twoHanded, this.document.system.twoHanded) &&
                    matchIfPresent(s.primaryStat, this.document.system.ability) &&
                    s.minLvl <= this.document.system.level
                ));
                if (sockets.length > 0) {
                    generation.validSockets[i] = {};
                    for (const socket of sockets) {
                        generation.validSockets[i][socket.id] = socket.id;
                    }
                }
                else {
                    generation.validSockets[i] = {"none": "none"};
                }
            }
            else {
                generation.validSockets[i] = {};
            }
        }

        context.generation = generation;

        // Prepare active effects for easier access
        //context.effects = prepareActiveEffectCategories(this.item.effects);

        // do text enrichment
        context.enrichedDescription = await TextEditor.enrichHTML(
            this.document.system.description,
            {
                // Only show secret blocks to owner
                secrets: this.document.isOwner,
                async: true,
                // For Actors and Items
                rollData: this.document.getRollData()
            }
        );

        return context;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // toggle checkboxes
        html.on('click', '.check-input', (ev) => {
            const checked = ev.currentTarget.checked;
            const name = ev.currentTarget.name;
            this.item.update({ [name]: checked });
        });
        // changing values in indexed select elements
        html.on('change', '.select-index', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            const value = $(t).val();
            const name = $(t).attr("name");
            let current = byString(this.item, name);
            current[index] = value;
            this.item.update({ [name]: current });
        });


        // skill specific listeners
        if (this.item.type === "skill") {
            // operate changes on damage type
            html.on('change', '.damage-type select', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                const type = $(t).val();
                let damage = this.item.system.damage;
                damage[index].type = type;
                this.item.update({ "system.damage": damage });
            });
            // get damage values
            html.on('change', '.damage-amount input', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                const value = $(t).val();
                let damage = this.item.system.damage;
                damage[index].value = value;
                this.item.update({ "system.damage": damage });
            });
            // remove damage element
            html.on('click', '.damage-delete', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                let damage = this.item.system.damage;
                damage.splice(index, 1);
                this.item.update({ "system.damage": damage });
            });
            // add damage element
            html.on('click', '.damage-create', (ev) => {
                let damage = this.item.system.damage;
                damage.push({ type: "none", value: 1.0 });
                this.item.update({ "system.damage": damage });
            });
            // remove status effect
            html.on('click', '.status-delete', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                let statuses = this.item.system.statusEffects;
                statuses.splice(index, 1);
                this.item.update({ "system.statusEffects": statuses });
            });
            // add status effect
            html.on('click', '.status-create', (ev) => {
                let statuses = this.item.system.statusEffects;
                statuses.push("death");
                this.item.update({ "system.statusEffects": statuses });
            });
            // operate changes on status effect
            html.on('change', '.status-type select', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                const type = $(t).val();
                let statuses = this.item.system.statusEffects;
                statuses[index] = type;
                this.item.update({ "system.statusEffects": statuses });
            });
        }
        // gear listeners
        else {
            // remove status effect
            html.on('click', '.list-delete', (ev) => {
                const t = ev.currentTarget;
                const name = $(t).attr("name");
                const index = $(t).data("index");
                let statuses = byString(this.item, name);
                statuses.splice(index, 1);
                this.item.update({ [name]: statuses });
            });
            // add status effect
            html.on('click', '.list-create', (ev) => {
                const t = ev.currentTarget;
                const name = $(t).attr("name");
                let statuses = byString(this.item, name);
                statuses.push("death");
                this.item.update({ [name]: statuses });
            });
            // operate changes on status effect
            html.on('change', '.list-type select', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                const name = $(t).attr("name");
                const type = $(t).val();
                let statuses = byString(this.item, name);
                statuses[index] = type;
                this.item.update({ [name]: statuses });
            });
            // apply gear plugs
            html.on('click', '.apply-plugs', () => {
                this.item.applyAllPlugs();
            });
            // shuffle gear sockets
            html.on('click', '.shuffle-socket', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                this.item.autoSelectSocket(index);
            });
            // shuffle all gear sockets
            html.on('click', '.shuffle-all-sockets', () => {
                this.item.autoSelectAllSockets();
            });
            // shuffle all gear sockets
            html.on('click', '.shuffle-socket-spread', () => {
                this.item.randSocketSpread();
            });
            // shuffle all
            html.on('click', '.shuffle-all', () => {
                this.item.generateAllFromRarity();
            });
        }
        // armor specific listeners
        if (this.item.type === "armor") {
            // armor classification listeners
            html.on('change', '.armor-type-selector', (ev) => {
                const key = $(ev.currentTarget).attr("name");
                const value = $(ev.currentTarget).val();
                this.item.update({ key: value });
            });
        }
        // weapon specific
        else if (this.item.type === "weapon") {
            // operate changes on damage type
            html.on('change', '.damage-type select', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                const type = $(t).val();
                let damage = this.item.system.bonusElements;
                damage[index].type = type;
                this.item.update({ "system.bonusElements": damage });
            });
            // get damage values
            html.on('change', '.damage-amount input', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                const value = $(t).val();
                let damage = this.item.system.bonusElements;
                damage[index].value = value;
                this.item.update({ "system.bonusElements": damage });
            });
            // remove damage element
            html.on('click', '.damage-delete', (ev) => {
                const t = ev.currentTarget;
                const index = $(t).data("index");
                let damage = this.item.system.bonusElements;
                damage.splice(index, 1);
                this.item.update({ "system.bonusElements": damage });
            });
            // add damage element
            html.on('click', '.damage-create', (ev) => {
                let damage = this.item.system.bonusElements;
                damage.push({ type: "none", value: 0.0 });
                this.item.update({ "system.bonusElements": damage });
            });
        }

        // manage active effects
        html.on('click', '.effect-control', (ev) => {
            const row = ev.currentTarget.closest('li');
            const document =
                row.dataset.parentId === this.item?.id
                    ? this.item
                    : this.item.items.get(row.dataset.parentId);
            onManageActiveEffect(ev, document);
        });
    }

}

/**
 * @extends { ActiveEffectConfig }
 */
export class CelestusActiveEffectSheet extends ActiveEffectConfig {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["celestus", "sheet", "effect"],
            template: "./systems/celestus/templates/effects/active-effect.hbs",
            width: 580,
            height: 580,
            tabs: [{ navSelector: ".tabs", contentSelector: "form", initial: "details" }],
            dragdrop: [".tab.other"],
        });
    }

    /** @override */
    async getData() {
        const context = await super.getData();

        context.system = context.data.system;
        context.config = CONFIG.CELESTUS;
        context.statusEffects = CONFIG.statusEffects;

        return context;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // handle displaying granted skills ui
        html.on('drop', '.tab.other', async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const dragData = ev.originalEvent.dataTransfer.items;
            for (const item of dragData) {
                item.getAsString(async (s) => {
                    const obj = JSON.parse(s);
                    const skills = this.object.system.grantedSkills;
                    const item = await fromUuid(obj.uuid);
                    skills.push({ uuid: obj.uuid, name: item.name });
                    this.object.update({ "system.grantedSkills": skills });
                });
            }
        });
        // handle deleting granted skills
        html.on('click', '.skill-delete', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            let arr = this.object.system.grantedSkills;
            arr.splice(index, 1);
            this.object.update({ "system.grantedSkills": arr });
        });
        // handle expanding granted skills
        html.on('click', '.expand-item', async (ev) => {
            const t = ev.currentTarget;
            const uuid = $(t).data("uuid");
            const item = await fromUuid(uuid);
            item.sheet.render(true);
        });


        // toggle checkboxes
        html.on('click', '.check-input', (ev) => {
            const checked = ev.currentTarget.checked;
            const name = ev.currentTarget.name;
            this.object.update({ [name]: checked });
        });
        // operate changes on damage type
        html.on('change', '.damage-type select', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            const type = $(t).val();
            let damage = this.object.system.damage;
            damage[index].type = type;
            this.object.update({ "system.damage": damage });
        });
        // operate changes on status block/remove
        html.on('change', '.status-type select', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            const statusType = $(t).data("type");
            const status = $(t).val();
            let arr = this.object.system[statusType];
            arr[index] = status;
            this.object.update({ [`system.${statusType}`]: arr });
        });
        // operate changes on status block/remove
        html.on('change', '.aura-type-selector', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            const name = $(t).attr("name");
            const value = $(t).val();
            this.object.update({ [name]: value });
        });
        // get damage values
        html.on('change', '.damage-amount input', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            const value = $(t).val();
            let damage = this.object.system.damage;
            damage[index].value = value;
            this.object.update({ "system.damage": damage });
        });
        // remove damage element
        html.on('click', '.damage-delete', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            let damage = this.object.system.damage;
            damage.splice(index, 1);
            this.object.update({ "system.damage": damage });
        });
        // add damage element
        html.on('click', '.damage-create', (ev) => {
            let damage = this.object.system.damage;
            damage.push({ type: "none", roll: "" });
            this.object.update({ "system.damage": damage });
        });
        // add status removal element
        html.on('click', '.removes-create', (ev) => {
            let removes = this.object.system.removes;
            removes.push("death");
            this.object.update({ "system.removes": removes });
        });
        // remove status removal element
        html.on('click', '.removes-delete', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            let arr = this.object.system.removes;
            arr.splice(index, 1);
            this.object.update({ "system.removes": arr });
        });
        // add status block element
        html.on('click', '.blocks-create', (ev) => {
            let blocks = this.object.system.blocks;
            blocks.push("death");
            this.object.update({ "system.blocks": blocks });
        });
        // remove status block element
        html.on('click', '.blocks-delete', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            let arr = this.object.system.blocks;
            arr.splice(index, 1);
            this.object.update({ "system.blocks": arr });
        });
    }
}