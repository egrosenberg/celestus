import { hideBossDisplay, renderBossDisplay, showBossDisplay } from "./hooks.mjs";

export function registerSocketHandlers() {
    game.socket.on("system.celestus", ({type, data}) => {
      switch (type) {
        case "canvasPopupText":
            canvasPopup(data);
          break;
        case "activateBoss":
          activateBoss(data);
          break;
        case "deactivateBoss":
          deactivateBoss(data);
          break;
        default:
          throw new Error("Unknown type");
      }
    });
  }

/**
 * Generic handler for all socketio messages belonging to this system
 * @param {String} type socket message type
 * @param {Object} data object containing all data needed for message
 */
export function handleSocket(type, data) {
    console.log(type, data);
    if (type === "canvasPopupText") {
        if (!data.position || !data.text || !data.distance) {
            return console.warn("CELESTUS | canvasPopupText message missing actor, text, or distance");
        }
        const color = data.color ?? "#fff";
        canvasPopup(data.position, data.text, distance, color);
    }
}

/**
 * 
 * @param {Object} position x,y coords on canvas to spawn popup
 * @param {String} text to display
 * @param {String} color to display
 * @param {Number} distance for createScrollingText
 */
function canvasPopup({position, text, distance, color}) {
    canvas.interface.createScrollingText(position, text, {
        anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
        direction: CONST.TEXT_ANCHOR_POINTS.TOP,
        distance: distance,
        fontSize: 28,
        stroke: 0x000000,
        strokeThickness: 4,
        jitter: 0.25,
        fill: color
    });
}
/**
 * Renders boss display
 * @param {String} id of ttoken to turn into boss 
 */
async function activateBoss({id}) {
  const token = canvas.tokens.get(id);
  if (!token) return console.error(`CELESTUS | Unable to find token with ID ${id} in canvas`);
  await renderBossDisplay(token);
  await showBossDisplay();
}
/**
 * Hides boss display
 */
async function deactivateBoss() {
  await hideBossDisplay();
}