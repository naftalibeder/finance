import { Locator, Page } from "@playwright/test";

export const findAll = async (
  page: Page,
  selector: string,
  options?: {
    timeout?: number;
  }
): Promise<Locator[]> => {
  const frames = page.frames();
  let res: Locator[] = [];

  console.log(
    `Searching for selector '${selector}' in ${frames.length} frames`
  );

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    try {
      const loc = frame.locator(selector);
      await loc.waitFor({
        state: "visible",
        timeout: options?.timeout ?? 2000,
      });
      res = [...res, loc];
    } catch (e) {
      // No results; continue searching.
    }
  }

  if (res.length === 0) {
    console.log(`Found no elements for selector '${selector}'`);
    return [];
  }

  const texts: string[] = [];
  for (const r of res) {
    const t = await r.textContent();
    if (t) {
      texts.push(t);
    }
  }
  console.log(
    `Found ${res.length} elements for selector '${selector}': ${texts}`
  );
  return res;
};

export const findFirst = async (
  page: Page,
  selector: string,
  options?: {
    timeout?: number;
  }
): Promise<Locator | undefined> => {
  const all = await findAll(page, selector, options);
  if (all.length === 0) {
    return undefined;
  }

  return all[0];
};
