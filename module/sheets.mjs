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
            height: 600,
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
        const skills = {
            memorized: [],
            unmemorized: []
        };

        // iterate through items// Iterate through items, allocating to containers
        for (let i of context.items) {
            i.img = i.img || Item.DEFAULT_ICON;
            // Append to gear.
            if (i.type === 'armor') {
                gear.push(i);
            }
            // Append to spells.
            else if (i.type === 'skill') {
                if (i.system.memorized) {
                    skills.memorized.push(i);
                }
                else {
                    skills.unmemorized.push(i);
                }
            }
        }

        context.gear = gear;
        context.skills = skills;

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
            $(target).css("background-image", gradient);
        });

        // -------------------------------------------------------------
        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) return;

        // refresh all resources
        html.on('click', '#refresh-all', (ev) => {
            this.actor.refresh();
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

        // memorize or unmemorize a skill
        html.on('click', '.item-memorize', (ev) => {
            const li = $(ev.currentTarget).parents('.item');
            const item = this.actor.items.get(li.data('itemId'));
            if (item.system.memorized) {
                item.update({ "system.memorized": false });
            }
            else {
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
                item.update({ "system.memorized": true });
            }
        });

        // Active Effect management
        html.on('click', '.effect-control', (ev) => {
            const row = ev.currentTarget.closest('li');
            const document =
                row.dataset.parentId === this.actor.id
                    ? this.actor
                    : this.actor.items.get(row.dataset.parentId);
            onManageActiveEffect(ev, document);
        });

        // Rollable abilities.
        html.on('click', '.rollable', this._onRoll.bind(this));

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
            width: 700,
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

        // Retrieve the roll data for TinyMCE editors.
        context.rollData = this.item.getRollData();

        // Add the item's data to context.data for easier access, as well as flags.
        context.system = itemData.system;
        context.flags = itemData.flags;

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

}