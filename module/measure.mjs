import { closestPoint, polyCircleTest, polyLineTest, polyPointTest, polyPolyTest, rectToPoly, rotateTokenTowards } from "./helpers.mjs";

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
        let size = item.system.targets.size ?? 0;
        if (item.system.targets.type === "radius") {
            size += item.actor?.getActiveTokens()[0]?.w / ((canvas.scene.grid.size / canvas.scene.grid.distance) * 2);
        }
        // prepare base template
        const templateData = {
            user: game.user?.id,
            width: item.system.targets.type === "cube" ? item.system.targets.size : item.system.targets.width,
            direction: 0,
            x: 0,
            y: 0,
            distance: size,
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
                await template?.setFlag("celestus", "surfaceType", skill.system.linger.surfaceType);
                await template?.setFlag("celestus", "origin", skill.actor.uuid);
                await template?.setFlag("celestus", "temporary", true);
                if (skill.system.aoeLinger && skill.system.linger.texture) {
                    await template.update({"texture": skill.system.linger.texture});
                }
                if (skill.system.linger.effects) {
                    await template.setFlag("celestus", "hasEffects", true);
                    await template.setFlag("celestus", "skillId", skill.uuid);
                }
                if (skill.system.aoeLinger && game.combat) {
                    await template?.setFlag("celestus", "linger", true);
                    await template?.setFlag("celestus", "lingerStartRound", game.combat.current.round);
                    await template?.setFlag("celestus", "lingerStartTurn", game.combat.current.turn);
                    await template?.setFlag("celestus", "lingerDuration", skill.system.linger.duration);
                }
                else {
                    await template?.setFlag("celestus", "clearThis", true);
                }

                // wait until shape exists, then propagate effects
                async function checkShape() {
                    if (!template?.object.shape) {
                        window.setTimeout(checkShape, 100);
                    } else {
                        await template?.testAll({ tokens: true, canDelete: true });
                        // attempt to interact via this skill's damage
                        if (skill.system.damage.length > 0) {
                            for (const t of template.parent.templates) {
                                if (t.id === template.id) continue;
                                let surfaceData = CONFIG.CELESTUS.surfaceTypes[t.getFlag("celestus", "surfaceType")];
                                if (!surfaceData) continue;

                                // attempt to combine with damage types of this skill until there are no matches
                                let cont = true;
                                let intersects = false;
                                let intersectChecked = false;
                                const timeout = 10;
                                let count = 0;
                                while (cont && count < timeout) {
                                    cont = false;
                                    for (const damage of skill.system.damage) {
                                        const match = surfaceData.damageCombines?.[damage.type];
                                        if (match) {
                                            // check for intersection if not checked
                                            if (!intersectChecked) {
                                                intersects = template.object.testTemplate(t.object);
                                                intersectChecked = true;
                                                // if no intersection, this template is useless
                                                if (intersects === false) {
                                                    cont = false;
                                                    break;
                                                }
                                            }
                                            await t.combineDamage(damage.type);
                                            await t.setFlag("celestus", "origin", skill.actor.uuid);
                                            // update surfaceData
                                            surfaceData = CONFIG.CELESTUS.surfaceTypes[t.getFlag("celestus", "surfaceType")];
                                            count++;
                                            cont = true;
                                            break;
                                        }
                                    }
                                }
                                // spread effects from changed template if it changed
                                if (count > 0) {
                                    await t.testAll({ tokens: true, templates: true })
                                }
                            }
                        }
                    }
                }
                await checkShape();
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
     * Tests wether a point intersects with the area of this template
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
            return polyPointTest(this.shape.points, { x: testX, y: testY });
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
     * Test wether a line intersects with the area of this template
     * @param {Line} line
     * @returns {Boolean}
     */
    testLine(line) {
        const shape = this.shape;
        if (!shape) return;
        line = {
            x1: line.x1 - this.x,
            y1: line.y1 - this.y,
            x2: line.x2 - this.x,
            y2: line.y2 - this.y,
        }
        /**
         * Turn rect to polygon
         */
        let points;
        if (shape.type === 1) {
            points = rectToPoly(shape.x, shape.y, shape.width, shape.height);
        }
        if (shape.type === 0) {
            points = shape.points;
        }
        // circle
        if (shape.type === 2) {
            const center = {
                x: 0,
                y: 0
            }
            const closest = closestPoint(center, line);
            const dist = Math.sqrt((closest.x - center.x) ** 2 + (closest.y - center.y) ** 2);
            return dist <= shape.radius;
        }
        // polygon
        else {
            return polyLineTest(points, line);
        }
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
        // two polygons
        else if (shape.type === 0 && testShape.type === 0) {
            const offset = {
                x: testTemplate.x - this.x,
                y: testTemplate.y - this.y
            }
            return polyPolyTest(shape.points, testShape.points, offset);
        }
        else {
            const offset = {
                x: testTemplate.x - this.x,
                y: testTemplate.y - this.y
            }
            // automatically convert rects to points
            let shapePoints;
            let testShapePoints;
            if (shape.type === 0) {
                shapePoints = shape.points;
            }
            else if (shape.type === 1) {
                shapePoints = rectToPoly(shape.x, shape.y, shape.width, shape.height);
            }
            if (testShape.type === 0) {
                testShapePoints = testShape.points;
            }
            else if (testShape.type === 1) {
                testShapePoints = rectToPoly(testShape.x, testShape.y, testShape.width, testShape.height);
            }

            // rect and poly (turn rect to poly)
            if (shape.type !== 2 && testShape.type !== 2) {
                return polyPolyTest(shapePoints, testShapePoints, offset);
            }
            // circle and poly/rect
            if (shape.type !== 2) {
                return polyCircleTest(shapePoints, offset, testShape.radius);
            }
            if (testShape.type !== 2) {
                const center = {
                    x: -offset.x,
                    y: -offset.y
                }
                const inter = polyCircleTest(testShapePoints, center, shape.radius);
                if (inter === false) return false;
                return -inter;
            }
            // resort to bounds checking result
            return 0;
        }
    }

    /**
     * Checks for interactions with another surface represented as a measured template
     * @param {MeasuredTemplate} template to test for interactions with
     * @param {Boolean} canDelete if overriding / removing another template is allowed
     * @returns {Promise: Boolean | undefined} returns false if this surface has been destroyed
     */
    async combineSurface(template, canDelete = false) {
        if (this.id === template.id) return;
        const thisType = this.document.getFlag("celestus", "surfaceType");
        const testType = template.document.getFlag("celestus", "surfaceType");
        // check if both templates are surfaces
        if (!thisType || !testType || thisType === "none" || testType === "none") return;
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

        // if both surfaces are same type, bigger clears smaller next turn
        if (thisType === testType && canDelete) {
            if (intersect > 0) {
                await template.document.setFlag("celestus", "clearThis", true);
                return;
            }
            if (intersect < 0) {
                await this.document.setFlag("celestus", "clearThis", true);
                return false;
            }
        }

        // check this one's interaction first
        if (surface.combines?.[testType]) {
            const makes = surface.combines[testType].makes;
            const mode = surface.combines[testType].mode;
            if (mode === "corrupt") {
                await template.document.setFlag("celestus", "temporary", true);
                await template.document.setFlag("celestus", "surfaceType", thisType);
                if (canDelete) {
                    if (intersect > 0) {
                        await template.document.delete();
                        return;
                    }
                    if (intersect < 0) {
                        //await this.document.delete();
                        await this.document.setFlag("celestus", "clearThis", true);
                        return false;
                    }
                }
            }
            if (mode === "override" && intersect > 0 && canDelete) {
                await template.document.delete();
                return;
            }
            if (mode === "combine") {
                if (surface.combines[testType].corrupts) {
                    await template.document.setFlag("celestus", "temporary", true);
                    await template.document.setFlag("celestus", "surfaceType", makes);
                    if (intersect < 0) {
                        //await this.document.delete();
                        // TODO: set this's duration to 0 if can't delete???
                        return false;
                    }
                    else if (intersect > 0 && canDelete) {
                        await template.document.delete();
                    }
                    return;
                }
                else {
                    if (intersect > 0) {
                        await template.document.setFlag("celestus", "temporary", true);
                        await template.document.setFlag("celestus", "surfaceType", makes);
                        return;
                    }
                    else if (intersect < 0) {
                        await this.document.setFlag("celestus", "temporary", true);
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
                await this.document.setFlag("celestus", "temporary", true);
                await this.document.setFlag("celestus", "surfaceType", testType);
                if (canDelete) {
                    if (intersect < 0) {
                        await this.document.setFlag("celestus", "clearThis", true);
                    }
                    else if (intersect > 0) {
                        await template.document.delete();
                    }
                }
                return false;
            }
            if (mode === "combine") {
                if (testSurface.combines[thisType].corrupts) {
                    await this.document.setFlag("celestus", "temporary", true);
                    await this.document.setFlag("celestus", "surfaceType", makes);
                    if (intersect > 0 && canDelete) {
                        await template.document.delete();
                    }
                    else if (intersect < 0) {
                        //await this.document.delete();
                        // queue deletion of this
                        await this.document.setFlag("celestus", "clearThis", true);
                    }
                    return false;
                }
                else {
                    if (intersect > 0) {
                        await template.document.setFlag("celestus", "temporary", true);
                        await template.document.setFlag("celestus", "surfaceType", makes);
                    }
                    else if (intersect < 0) {
                        await this.document.setFlag("celestus", "temporary", true);
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
        // ignore flying tokens
        if (token.actor.getFlag("celestus", "flying")) return;

        let intersects = false;
        let standingOn = false;
        // check for intersection, if newPos is provided check test with line
        if (newPos) {
            const line = {
                x1: token.object.center.x,
                y1: token.object.center.y,
                x2: newPos.x,
                y2: newPos.y
            }
            intersects = this.testLine(line);
            standingOn = this.testPoint(newPos.x, newPos.y);
        }
        else {
            intersects = this.testPoint(token.object.center.x, token.object.center.y);
            standingOn = intersects;
        }

        // surfaceType doesn't require skill
        const surfaceType = this.document.getFlag("celestus", "surfaceType");
        if (surfaceType) {
            if (standingOn) {
                const standingId = token.actor.getFlag("celestus", "surfaceId");
                const cSurface = this.scene?.templates.find(t => t.uuid === standingId);
                const thisStartRound = this.document.getFlag("celestus", "lingerStartRound") ?? 0;
                const thisStartTurn = this.document.getFlag("celestus", "lingerStartTurn") ?? 0;
                
                // only set this as the standing surface if it is more recent then the actor's current
                let setThis = true;
                if (cSurface) {
                    const testStartRound = cSurface.getFlag("celestus", "lingerStartRound");
                    const testStartTurn = cSurface.getFlag("celestus", "lingerStartTurn");
                    setThis = (thisStartRound > testStartRound);
                    setThis ||= (thisStartRound === testStartRound && thisStartTurn > testStartTurn);
                }
                if (setThis) {
                    await token.actor.setFlag("celestus", "standingOn", surfaceType);
                    await token.actor.setFlag("celestus", "surfaceId", this.document.uuid);
                }
            }
            else if (token.actor.getFlag("celestus", "surfaceId") === this.document.uuid) {
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
                        }
                    }
                }
            }
            // handle leaving location
            if (!standingOn) {
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
                if (token.actor.getFlag("celestus", "surfaceId") === this.uuid) {
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
                // update duration
                if (this.getFlag("celestus", "temporary") && config.duration) {
                    const combat = game.combats.find(c => !c.scene || c.scene.uuid === this.parent.uuid);
                    // if there is a valid combat for this surface and its temporary, update duration
                    if (combat) {
                        changes.flags.celestus.linger = true;
                        changes.flags.celestus.lingerStartRound = combat.current.round;
                        changes.flags.celestus.lingerStartTurn = combat.current.turn;
                        changes.flags.celestus.lingerDuration = config.duration;
                    }
                }
                // change standingOn from all tokens in scene if they were standing on this
                const tokens = this.parent?.tokens;
                if (tokens) {
                    for (const token of tokens) {
                        if (token.actor.getFlag("celestus", "surfaceId") === this.uuid) {
                            await token.actor.setFlag("celestus", "standingOn", surfaceType);
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
                // this is a new surface so it should no longer own lingering effects
                else {
                    // empty childEffects array
                    changes.flags.celestus.childEffects = [];
                }
            }
        }
    }

    /**
     * Tests all interactions with this template and other template surfaces
     * @param {Object?} options wether it should test tokens/templates
     * @returns {void | false}
     */
    async testAll(options = {}) {
        // ensure this can only run at once
        if (this.testing) return;
        this.testing = true;

        if (options?.templates !== false) {
            // interact with other surfaces
            for (const t of this.parent?.templates) {
                const spread = await this.object.combineSurface(t.object, options.canDelete);
                if (spread === false) return false;
            }
        }
        // propagate effects
        if (options?.tokens === true) {
            const tokens = this.parent?.tokens
            for (const token of tokens) {
                await this.object.spreadEffectsTo(token);
            }
        }

        this.testing = false;
    }

    /**
     * Attempts to combine this surface with a damage type
     * @param {String} type 
     */
    async combineDamage(type) {
        const surface = CONFIG.CELESTUS.surfaceTypes[this.getFlag("celestus", "surfaceType")];
        const product = surface?.damageCombines?.[type];
        if (!product) return;
        await this.setFlag("celestus", "temporary", true);
        await this.setFlag("celestus", "surfaceType", product);
    }
}

/**
 * @extends {TemplateLayer}
 */
export class CelestusTemplateLayer extends TemplateLayer {
    /** @inheritdoc */
    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            zIndex: 150
        });
    }
}