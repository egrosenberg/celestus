export class CelestusMeasuredTemplate extends MeasuredTemplate {
    /**
     * Create a CelestusMeasuredTemplate from a skill
     * @param {Item} item: item to create measured template from
     * @returns {MeasuredTemplate | null}
     */
    static fromSkill(item) {
        // only create if item is a skill
        if (!(item?.type === "skill")) {
            return null;
        }
        // destroy any existing preview
        const existingPreview = CONFIG.CELESTUS.activeMeasuredTemplatePreview;
        if (existingPreview && !existingPreview._destroyed) {
            existingPreview.destroy({ children: true });
        }

        // set active template to a newly created template
        CONFIG.CELESTUS.activeMeasuredTemplatePreview = this._constructPreset(item);

        if (CONFIG.CELESTUS.activeMeasuredTemplatePreview) {
            CONFIG.CELESTUS.activeMeasuredTemplatePreview.drawPreview();
        }
    }

    /**
     * construct a preset template
     * @returns {MeasuredTemplate}
     */
    static _constructPreset(item) {
        // prepare base template
        const templateData = {
            user: game.user?.id,
            distance: 0,
            direction: 0,
            x: 0,
            y: 0,
            distance: item.system.targets.size ?? 0,
            fillColor: game.user?.color,
            t: CONFIG.CELESTUS.targetTypes[item.system.targets.type]?.measure ?? "circle",
            flags: { celestus: { origin: item.uuid } },
        };

        // set angle for cones
        if (CONFIG.CELESTUS.targetTypes[item.system.targets.type]?.angle) {
            templateData.angle = CONFIG.CELESTUS.targetTypes[item.system.targets.type]?.angle;
        }

        // create template
        const template = new CONFIG.MeasuredTemplate.documentClass(templateData, {
            parent: canvas.scene ?? undefined,
        });

        // return the newly created template
        return new this(template);
    }

    /**
     * Draws a preview of the template
     */
    drawPreview() {
        // record starting layer
        const startingLayer = canvas.activeLayer;

        // draw this and switch to template layer
        this.draw();
        this.layer.activate();
        this.layer.preview?.addChild(this);

        // Activate listeners for interactivity
        this.activatePreviewListeners(startingLayer);
    }

    /**
     * Activate listeners for template preview
     */
    activatePreviewListeners(startingLayer) {
        if (!this.handlers) {
            this.handlers = {};
        }

        let moveTime = 0;

        // Update placement (mouse-move)
        this.handlers.mm = (event) => {
            event.stopPropagation();
            const now = Date.now(); // Apply a 20ms throttle
            if (now - moveTime <= 20) return;
            const center = event.data.getLocalPosition(this.layer);
            const snapped = canvas.grid.getSnappedPoint(center, {
                mode: CONST.GRID_SNAPPING_MODES.CENTER,
                resolution: 2,
            });
            this.document.updateSource({ x: snapped?.x, y: snapped?.y });
            this.refresh();
            moveTime = now;
        };

        // Cancel the workflow (right-click)
        this.handlers.rc = (event) => {
            this.layer._onDragLeftCancel(event);
            this._removeListeners();
            startingLayer.activate();
        };

        // Confirm the workflow (left-click)
        this.handlers.lc = (event) => {
            this.handlers.rc(event);
            const dest = canvas.grid.getSnappedPoint(this.document, {
                mode: CONST.GRID_SNAPPING_MODES.CENTER,
                resolution: 2,
            });
            this.document.updateSource(dest);
            canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [
                this.document.toObject(),
            ]);
        };

        // Rotate the template by 3 degree increments (mouse-wheel)
        this.handlers.mw = (event) => {
            if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
            event.stopPropagation();
            const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
            const snap = event.shiftKey ? delta : 5;
            this.document.updateSource({
                direction: this.document.direction + snap * Math.sign(event.deltaY),
            });
            this.refresh();
        };

        // Activate listeners
        canvas.stage.on("mousemove", this.handlers.mm);
        canvas.stage.on("mousedown", this.handlers.lc);
        canvas.app.view.oncontextmenu = this.handlers.rc;
        canvas.app.view.onwheel = this.handlers.mw;

        this.listeners = true;
    }

    /**
     * Remove event listeners from doc
     */
    _removeListeners() {
        if (!this.listeners || !this.handlers) return;
        canvas.stage.off('mousemove', this.handlers.mm);
        canvas.stage.off('mousedown', this.handlers.lc);
        canvas.app.view.oncontextmenu = null;
        canvas.app.view.onwheel = null;

        this.listeners = false;
    }

    /** @override */
    destroy(...args) {
        // reset active template preview
        CONFIG.CELESTUS.activeMeasuredTemplatePreview = null;
        this._removeListeners();
        return super.destroy(...args);
    }
}
