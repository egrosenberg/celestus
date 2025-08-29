const maxTries = 20;

/**
 * Awaits until there are no item-hovers render or exceeds max attempts
 * @returns {Promise<true>}
 */
export async function waitForItemHover(attempts = 0) {
  if (++attempts >= maxTries) return;
  const exists = $(".item-hover").length;
  if (!exists) return true;
  await new Promise(async (r) => {
    setTimeout(async () => {
      r(await waitForItemHover(attempts));
    }, 10);
  });
  return true;
}
