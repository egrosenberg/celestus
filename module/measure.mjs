import { rotateTokenTowards } from "./helpers.mjs";

export class CelestusMeasuredTemplate extends MeasuredTemplate {
    /**
     * Create a CelestusMeasuredTemplate from a skill
     * @param {Item} item: item to create measured template from
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
            CONFIG.CELESTUS.activeMeasuredTemplatePreview.drawPreview(item);
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
            width: 5,
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
     * @param {Item} skill that is being used to draw the template
     */
    drawPreview(skill) {
        // record starting layer
        const startingLayer = canvas.activeLayer;

        // draw this and switch to template layer
        this.draw();
        this.layer.activate();
        this.layer.preview?.addChild(this);

        // Activate listeners for interactivity
        this.activatePreviewListeners(startingLayer, skill);
    }

    /**
     * Activate listeners for template preview
     */
    activatePreviewListeners(startingLayer, skill) {
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
        this.handlers.lc = async (event) => {
            this.handlers.rc(event);
            const dest = canvas.grid.getSnappedPoint(this.document, {
                mode: CONST.GRID_SNAPPING_MODES.CENTER,
                resolution: 2,
            });
            this.document.updateSource(dest);
            const [template] = await canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [
                this.document.toObject(),
            ]);
            if (skill) {
                const tokens = skill.actor?.getActiveTokens();
                for (const token of tokens) {
                    rotateTokenTowards(token, { x: this.document.x, y: this.document.y })
                }
                await template.setFlag("celestus", "surfaceType", skill.system.linger.surfaceType);
                await template.setFlag("celestus", "origin", skill.actor.uuid);
                if (skill.system.linger.effects) {
                    await template.setFlag("celestus", "hasEffects", true);
                    await template.setFlag("celestus", "skillId", skill.uuid);
                }
                if (skill.system.aoeLinger && game.combat) {
                    await template.setFlag("celestus", "linger", true);
                    await template.setFlag("celestus", "lingerStartRound", game.combat.current.round);
                    await template.setFlag("celestus", "lingerStartTurn", game.combat.current.turn);
                    await template.setFlag("celestus", "lingerDuration", skill.system.linger.duration);
                }
                else {
                    await template.setFlag("celestus", "clearThis", true);
                }

                // wait until shape exists, then propagate effects
                async function checkShape() {
                    if (!template.object.shape) {
                        window.setTimeout(checkShape, 100);
                    } else {
                        for (const token of template.parent.tokens) {
                            await template.object.spreadEffectsTo(token);
                        }
                        // interact with other surfaces
                        for (const t of canvas.scene.templates) {
                            const spread = await template.object.combineSurface(t.object);
                            if (spread === false) return false;
                        }
                    }
                }
                checkShape();
            }
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

    /**
     * Tests wether a point intersects with the are of this template
     * @param {Number} x 
     * @param {Number} y 
     */
    testPoint(testX, testY) {
        // offset test x and y
        testX -= this.x;
        testY -= this.y;
        // get shape
        const shape = this.shape;
        if (!shape) return;
        /**
         * polygon
         * check each point in the shape
         * based on the works of W. Randolph Franklin
         * https://wrfranklin.org/Research/Short_Notes/pnpoly.html
         */
        if (shape.type === 0) {
            const nPoints = shape.points.length / 2;
            let intersects = false;
            let i, j;
            // check if point is within bounds
            let minX, minY, maxX, maxY;
            for (let n = 0; n < nPoints; n++) {
                let x = shape.points[n * 2];
                let y = shape.points[n * 2 + 1];
                if (x < minX) {
                    minX = x;
                }
                else if (x > maxX) {
                    maxX = x;
                }
                if (y < minY) {
                    minY = y;
                }
                else if (y > maxY) {
                    maxY = y;
                }
            }
            if (testX < minX || testX > maxX || testY < minY || testY > maxY) return false;

            for (i = 0, j = nPoints - 1; i < nPoints; j = i++) {
                let x1 = shape.points[i * 2];
                let y1 = shape.points[i * 2 + 1];
                let x2 = shape.points[j * 2];
                let y2 = shape.points[j * 2 + 1];
                if (((y1 > testY) != (y2 > testY)) &&
                    (testX < (x2 - x1) * (testY - y1) / (y2 - y1) + x1))
                    intersects = !intersects;
            }
            return intersects;
        }
        // rect
        else if (shape.type === 1) {
            const maxX = shape.x + shape.width;
            const minX = shape.x;
            const maxY = shape.y + shape.height;
            const minY = shape.y;
            return (testX >= minX && testX <= maxX && testY >= minY && testY <= maxY);
        }
        // circle
        else if (shape.type === 2) {
            const dx = Math.abs(testX - shape.x);
            const dy = Math.abs(testY - shape.y);
            if (dx > shape.radius || dy > shape.radius) return false;
            if (dx + dy <= shape.radius) return true;
            if (dx ** 2 + dy ** 2 <= shape.radius ** 2) return true;
        }
        return false;
    }

    /**
     * Checks intersection of this template and the other template
     * @param {MeasuredTemplate} testTemplate template to test against
     * @returns {Number | Boolean} false if no intersect
     *      0 if intersect
     *      positive if test is inside this
     *      negative if this is inside test
     */
    testTemplate(testTemplate) {
        // get this template's shape
        const shape = this.shape;
        if (!shape) return false;
        // get test template's shape
        const testShape = testTemplate.shape;
        if (!testShape) return false;

        const x1 = 0;
        const y1 = 0;
        const x2 = this.bounds.width;
        const y2 = this.bounds.height;

        const testX1 = testTemplate.bounds.x - this.bounds.x;
        const testY1 = testTemplate.bounds.y - this.bounds.y;
        const testX2 = testX1 + testTemplate.bounds.width;
        const testY2 = testY1 + testTemplate.bounds.height;


        // quick AABB test to continue
        const AABB = (x1 < testX2 && x2 > testX1 &&
            y2 > testY1 && y1 < testY2);
        if (AABB === false) return false;

        // check if bounding boxes fully contain
        if (testX1 > x1 && testX2 < x2 && testY1 > y1 && testY2 < y2) {
            // testShape is entirely within shape
            return 1;
        }
        if (testX1 < x1 && testX2 > x2 && testY1 < y1 && testY2 > y2) {
            // shape is entirely within testShape
            return -1;
        }

        // two circles
        if (shape.type === 2 && testShape.type === 2) {
            const dist = Math.sqrt((this.x - testTemplate.x) ** 2 + (this.y - testTemplate.y) ** 2);

            if (dist <= shape.radius - testShape.radius) {
                // testShape inside of shape
                return 1;
            }
            else if (dist <= testShape.radius - shape.radius) {
                // shape inside testShape
                return -1;
            }
            else if (dist <= shape.radius + testShape.radius) {
                // shapes intersect / touch
                return 0;
            }
            else {
                return false;
            }
        }
        // two rectangles
        else if (shape.type === 1 && testShape.type === 1) {
            // check if testShape is entirely contained
            if (shape.contains(testX1, testY1) && shape.contains(testX1, testY2) &&
                shape.contains(testX2, testY2) && shape.contains(testX2, testY1)) {
                return 1;
            }
            // check if testShape contains the entirety of testShape
            if (testShape.contains(x1, y1) && testShape.contains(x1, y2) &&
                testShape.contains(x2, y2) && testShape.contains(x2, y1)) {
                return -1;
            }
            // they just intersect
            return 0;
        }
        else {
            // resort to bounds checking result
            return 0;
            // TODO: further refining intersections
        }
    }

    /**
     * Checks for interactions with another surface represented as a measured template
     * @param {MeasuredTemplate} template to test for interactions with
     * @returns {Promise: Boolean | undefined} returns false if this surface has been destroyed
     */
    async combineSurface(template) {
        if (this.id === template.id) return;
        const thisType = this.document.getFlag("celestus", "surfaceType");
        const testType = template.document.getFlag("celestus", "surfaceType");
        // check if both templates are surfaces
        if (!thisType || !testType) return;
        // get surface type data
        const surface = CONFIG.CELESTUS.surfaceTypes[thisType];
        const testSurface = CONFIG.CELESTUS.surfaceTypes[testType];
        if (!surface || !testSurface) return;

        // check if surface types interact at all
        if ((!surface.combines?.[testType] && !testSurface.combines?.[thisType]) && thisType !== testType) return;

        // check intersection type
        const intersect = this.testTemplate(template);

        // no intersection
        if (intersect === false) return;

        // if both surfaces are same type, bigger eats smaller
        if (thisType === testType) {
            if (intersect > 0) {
                await template.document.delete();
                return;
            }
            if (intersect < 0) {
                await this.document.delete();
                return false;
            }
        }

        // check this one's interaction first
        if (surface.combines?.[testType]) {
            const makes = surface.combines[testType].makes;
            const mode = surface.combines[testType].mode;
            if (mode === "corrupt") {
                await template.document.setFlag("celestus", "surfaceType", thisType);
                if (intersect > 0) {
                    await template.document.delete();
                    return;
                }
                if (intersect < 0) {
                    await this.document.delete();
                    return false;
                }
            }
            if (mode === "override" && intersect > 0) {
                await template.document.delete();
                return;
            }
            if (mode === "combine") {
                if (surface.combines[testType].corrupts) {
                    await template.document.setFlag("celestus", "surfaceType", makes);
                    if (intersect < 0) {
                        await this.document.delete();
                        return false;
                    }
                    else if (intersect > 0) {
                        await template.document.delete();
                    }
                    return;
                }
                else {
                    if (intersect > 0) {
                        await template.document.setFlag("celestus", "surfaceType", makes);
                        return;
                    }
                    else if (intersect < 0) {
                        await this.document.setFlag("celestus", "surfaceType", makes);
                        return false;
                    }
                }
            }
        }
        // check other surface's interaction
        if (testSurface.combines?.[thisType]) {
            const makes = testSurface.combines[thisType].makes;
            const mode = testSurface.combines[thisType].mode;
            if (mode === "corrupt") {
                await this.document.setFlag("celestus", "surfaceType", testType);
                if (intersect < 0) {
                    await this.document.delete();
                }
                else if (intersect > 0) {
                    await template.document.delete();
                }
                return false;
            }
            if (mode === "override" && intersect > 0) {
                await this.document.delete();
                return false;
            }
            if (mode === "combine") {
                if (testSurface.combines[thisType].corrupts) {
                    await this.document.setFlag("celestus", "surfaceType", makes);
                    if (intersect > 0) {
                        await template.document.delete();
                    }
                    else if (intersect < 0) {
                        await this.document.delete();
                    }
                    return false;
                }
                else {
                    if (intersect > 0) {
                        await template.document.setFlag("celestus", "surfaceType", makes);
                    }
                    else if (intersect < 0) {
                        await this.document.setFlag("celestus", "surfaceType", makes);
                        return false;
                    }
                }
            }
        }

    }

    /**
     * Spread all effects if this has any to a token
     * @param {Token} token to spread the effects to
     * @param {Integer, Integer} newPos new position of token
     */
    async spreadEffectsTo(token, newPos) {
        // check if this has auras to propagate
        if (!this.document.getFlag("celestus", "hasEffects") && !this.document.getFlag("celestus", "surfaceType")) return false;

        // get position of token
        const x = newPos?.x || token.object.center.x;
        const y = newPos?.y || token.object.center.y;

        // surfaceType doesn't require skill
        const intersects = this.testPoint(x, y);
        const surfaceType = this.document.getFlag("celestus", "surfaceType");
        if (surfaceType) {
            if (intersects) {
                await token.actor.setFlag("celestus", "standingOn", surfaceType);
                await token.actor.setFlag("celestus", "surfaceId", this.document.id);
            }
            else if (token.actor.getFlag("celestus", "surfaceId") === this.document.id) {
                await token.actor.unsetFlag("celestus", "standingOn");
                await token.actor.unsetFlag("celestus", "surfaceId");
            }
        }

        const skillId = this.document.getFlag("celestus", "skillId");
        const skill = await fromUuid(skillId);
        const actor = await fromUuid(this.document.getFlag("celestus", "origin"));

        const surfaceData = CONFIG.CELESTUS.surfaceTypes[this.document.getFlag("celestus", "surfaceType")];

        // propagate statuses
        if (this.document.getFlag("celestus", "hasEffects") || surfaceData?.statuses) {
            let validTarget = false;

            // check token disposition
            if (skill) {
                if (skill.system.linger.targets === "any") {
                    validTarget = true;
                }
                else if (skill.system.linger.targets === "ally" && token.disposition === actor.prototypeToken.disposition) {
                    validTarget = true;
                }
                else if (skill.system.linger.targets === "enemy" && token.disposition !== actor.prototypeToken.disposition) {
                    validTarget = true;
                }
                else if (skill.system.linger.targets === "type" && skill.system.linger.targetType === actor.system.t) {
                    validTarget = true;
                }
            }
            else {
                validTarget = true;
            }

            // check if token is inside template
            if (!intersects) validTarget = false;

            if (validTarget) {
                // check if effects are already there
                let childEffects = this.document.getFlag("celestus", "childEffects");
                if (!childEffects) childEffects = [];
                const old = token.actor.effects.filter(e => (childEffects.find(id => id === e.uuid)));
                if (old.length > 0) {
                    for (const e of old) {
                        // if aura lingers, reset lingering timer
                        if (skill && skill.system.linger.lingerDuration !== 0) {
                            await e.update({ "duration.rounds": skill.system.linger.lingerDuration });
                        }
                    }
                }
                else {
                    // item related effects
                    if (skill) {
                        // apply effects
                        for (const effect of skill.effects) {
                            if (effect.disabled || token.actor.effects.find(i => i.name === effect.name)) {
                                continue;
                            }
                            let childData = foundry.utils.mergeObject(effect.toJSON(),
                                { "flags.celestus": { isChild: true, parentId: this.id } }
                            );
                            childData.origin = skill.actor?.uuid;
                            if (skill.system.linger.lingerDuration === 0) {
                                childData.duration.rounds = null;
                            }
                            const [child] = await token.actor.createEmbeddedDocuments(effect.documentName, [childData]);
                            let children = this.document.getFlag("celestus", "childEffects");
                            if (!children) children = [];
                            children.push(child.uuid);
                            await this.document.setFlag("celestus", "childEffects", children);
                        }
                        // apply status effects from item
                        for (const id of skill.system.statusEffects) {
                            const statusEffect = await ActiveEffect.fromStatusEffect(id);
                            statusEffect.updateSource({ "origin": skill.actor?.uuid })
                            statusEffect.updateSource({ "flags.celestus.isChild": true });
                            statusEffect.updateSource({ "flags.celestus.parentId": this.id });
                            if (skill.system.linger.lingerDuration === 0) {
                                statusEffect.updateSource({ "duration.rounds": null });
                            }
                            const [child] = await token.actor.createEmbeddedDocuments(
                                statusEffect.documentName,
                                [statusEffect]
                            );
    
                            if (child) {
                                let children = this.document.getFlag("celestus", "childEffects");
                                if (!children) children = [];
                                children.push(child.uuid);
                                await this.document.setFlag("celestus", "childEffects", children);
                            }
                            else {
                                console.warn("CELESTUS | Error in propagating template effect, no child created");
                            }
                        }
                    }
                    // apply status effects from surface type
                    if (surfaceData?.statuses) {
                        for (const id of surfaceData.statuses) {
                            const statusEffect = await ActiveEffect.fromStatusEffect(id);
                            if (actor) {
                                statusEffect.updateSource({ "origin": actor.uuid });
                            }
                            statusEffect.updateSource({ "flags.celestus.isChild": true });
                            statusEffect.updateSource({ "flags.celestus.parentId": this.id });
                            const [child] = await token.actor.createEmbeddedDocuments(
                                statusEffect.documentName,
                                [statusEffect]
                            );

                            if (child) {
                                let children = this.document.getFlag("celestus", "childEffects");
                                if (!children) children = [];
                                children.push(child.uuid);
                                await this.document.setFlag("celestus", "childEffects", children);
                            }
                            else {
                                console.warn("CELESTUS | Error in propagating template effect, no child created");
                            }
                        }
                    }
                }
            }
            else {
                // handle lingering effects
                const lingering = token.actor.effects.filter(e => e.flags?.celestus?.parentId === this.id);
                // reduce lingering duration (only if skill exists)
                if (skill) {
                    if (skill.system.linger.lingerDuration > 0) {
                        for (const e of lingering) {
                            if (!lingering.duration.rounds) {
                                await e.delete();
                            }
                            else if (lingering.duration.rounds > skill.system.linger.lingerDuration) {
                                await lingering.update({ "duration.rounds": skill.system.linger.lingerDuration });
                            }
                        }
                    }
                    // clear all lingering
                    else if (skill.system.linger.lingerDuration === 0) {
                        for (const e of lingering) {
                            await e.delete();
                        }
                    }
                }
            }
        }
    }
}

/**
 * @extends {MeasuredTemplateDocument}
 */
export class CelestusMeasuredTemplateDocument extends MeasuredTemplateDocument {
    /** @override */
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false) return false;

        // propagate effects
        for (const token of canvas.scene.tokens) {
            await this.object.spreadEffectsTo(token);
        }
    }

    /** @override */
    async _preDelete(options, user) {
        const allowed = await super._preDelete(options, user);
        if (allowed === false) return false;

        // remove standingOn from all tokens in scene if they were standing on this
        const tokens = this.parent?.tokens;
        if (tokens) {
            for (const token of tokens) {
                if (token.actor.getFlag("celestus", "surfaceId") === this.id) {
                    await token.actor.unsetFlag("celestus", "standingOn");
                    await token.actor.unsetFlag("celestus", "surfaceId");
                }
            }
        }

        // cleanup effects
        let cleanup = true;
        const skill = await fromUuid(this.getFlag("celestus", "skillId"));
        if (skill) {
            if (skill.system.linger.lingerDuration !== 0) {
                cleanup = false;
            }
        }
        else if (CONFIG.CELESTUS.surfaceTypes[this.getFlag("celestus", "surfaceType")]?.statuses) {
            cleanup = false;
        }
        if (cleanup) {
            const children = this.getFlag("celestus", "childEffects");
            if (children) {
                for (const id of children) {
                    const effect = await fromUuid(id);
                    if (effect) await effect.delete();
                }
            }
        }
    }

    /** @override */
    async _preUpdate(changes, options, user) {
        const allowed = await super._preUpdate(changes, options, user);
        if (allowed === false) return false;

        const surfaceType = changes.flags?.celestus?.surfaceType;
        if (surfaceType) {
            const config = CONFIG.CELESTUS.surfaceTypes[surfaceType];
            if (config) {
                changes.borderColor = config.color;
                changes.fillColor = config.color;
                if (config.texture) {
                    changes.texture = config.texture;
                }
                else if (this.texture) {
                    changes.texture = "";
                }
            }
        }

        if (changes.x || changes.y || changes.direction || changes.angle || changes.width) {
            // propagate effects
            for (const token of canvas.scene.tokens) {
                await this.object.spreadEffectsTo(token);
            }
        }
    }
}