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
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
        });
    }
    /** @override */
    get template() {
        return "./systems/celestus/templates/actor/actor-sheet.hbs";
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
            else {
                const gradientCol = "#404040";
                gradient = `linear-gradient(to left, ${gradientCol} ${((1 - resourcePercent) * 100)}%, rgba(0,0,0,0) 0%)`;
            }
            const curCSS = $(target).css("background-image");
            $(target).css("background-image", `${curCSS}, ${gradient}`);
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

        // Add Inventory Item
        //html.on('click', '.item-create', this._onItemCreate.bind(this));

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
                for (let [key, prereq] of Object.entries(item.system.prereqs)) {
                    if (this.actor.system.combat[key].value < prereq) {
                        return ui.notifications.warn(`Actor is missing prerequisite combat ability level (${key}: ${prereq})`);
                    }
                }
                item.update({ "system.memorized": "true" });
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
            item.sheet.render(true);
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
            const skill = this.actor.items.get(dataset.skillId);
            this.actor.useSkill(skill);
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
            width: 750,
            height: 500,
            tabs: [
                {
                    navSelector: '.sheet-tabs',
                    contentSelector: '.sheet-body',
                    initial: 'description',
                },
            ],
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
        
        // manage active effects
        html.on('click', '.effect-control', (ev) => {
            const row = ev.currentTarget.closest('li');
            const document =
                row.dataset.parentId === this.actor.id
                    ? this.actor
                    : this.actor.items.get(row.dataset.parentId);
            onManageActiveEffect(ev, document);
        });
    }

}

/**
 * @extends { ItemSheet }
 */
export class CelestusActiveEffectSheet extends ActiveEffectConfig {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["celestus", "sheet", "effect"],
            template: "./systems/celestus/templates/effects/active-effect.hbs",
            width: 580,
            height: "auto",
            tabs: [{navSelector: ".tabs", contentSelector: "form", initial: "details"}]
        });
    }

    /** @override */
    async getData() {
        const context = await super.getData();

        context.system = context.data.system;
        context.config = CONFIG.CELESTUS;

        return context;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        // operate changes on damage type
        html.on('change', '.damage-type select', (ev) => {
            const t = ev.currentTarget;
            const index = $(t).data("index");
            const type = $(t).val();
            let damage = this.object.system.damage;
            damage[index].type = type;
            this.object.update({ "system.damage": damage });
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
    }
}