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
    getData() {
        // retrieve the data structure from the base sheet
        const context = super.getData();
        console.log("test");
        console.log(context);

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

        // -------------------------------------------------------------
        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) return;

        console.log("editable");

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
            if (item.system.memorized)
            {
                item.update({"system.memorized": false});
            }
            else
            {
                // check memorization requirements
                if (item.system.memSlots + this.actor.system.attributes.memory.spent > this.actor.system.attributes.memory.total) {
                    const memorizeError = new Dialog({
                        title: "Insufficient Slots",
                        content: `Actor doesn't have enough unused memory slots to memorize skill.`,
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
                // check ability prereqs
                for (let [key, prereq] of Object.entries(item.system.prereqs))
                {
                    if (this.actor.system.combat[key].value < prereq)
                    {
                        canMemorize = false;
                        const memorizeError = new Dialog({
                            title: "Missing Prereqs",
                            content: `Actor is missing prerequisite combat ability level (${key}: ${prereq})`,
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
                }
                item.update({"system.memorized": true});
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

        return;
        // Handle item rolls.
        if (dataset.rollType) {
            if (dataset.rollType == 'item') {
                const itemId = element.closest('.item').dataset.itemId;
                const item = this.actor.items.get(itemId);
                if (item) return item.roll();
            }
        }

        // Handle rolls that supply the formula directly.
        if (dataset.roll) {
            let label = dataset.label ? `[ability] ${dataset.label}` : '';
            let roll = new Roll(dataset.roll, this.actor.getRollData());
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: label,
                rollMode: game.settings.get('core', 'rollMode'),
            });
            return roll;
        }


        li = $(ev.currentTarget).parents('.item');
        item = this.actor.items.get(li.data('itemId'));
        item.delete();
        li.slideUp(200, () => this.render(false));
    }

}