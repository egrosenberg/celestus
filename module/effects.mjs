import { byString, calculate } from "./helpers.mjs";

const tokenize = /(\(.+\))|[^\/\+\-\*]+|[\/\+\-*]/g;
const parenthetical = /^(\(.+\))$/g;
const operator = /^[\/\+\-*]$/g;
const argument = /^[^\/\+\-\*]+$/g;
//const attribute = /^@.+$/g;
const number = /^[0123456789.]+$/g;
const attribute = /(@[\d\w.]+)/g;

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

    /**@override */
    static applyField(model, change, field) {
        let value = change.value;
        value = value.replaceAll(attribute, (s)  => {
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
}