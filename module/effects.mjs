/**
 *  Extends active effect class in order to bring functionality needed for celestus
 * @extends {ActiveEffect}
 */
export class CelestusEffect extends ActiveEffect {
    /** @override */
    get isSuppressed () {
        const aura = this.system?.aura;
        // check if this is an aura
        if (aura) {
            if (aura.has && !aura.targetsSelf && this.origin === this.parent.uuid) {
                return true;
            }
        }
        return false;
    }
}