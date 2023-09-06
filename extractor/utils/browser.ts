import { Locator, Page } from "@playwright/test";
import { ExtractorPageKind } from "../types.js";

type Options = {
  timeout?: number;
};

export const findAll = async (
  page: Page,
  selector: string,
  options?: Options
): Promise<Locator[]> => {
  const frames = page.frames();
  const timeout = options?.timeout ?? 1000;
  console.log(
    `Searching for selector '${selector}' in ${frames.length} frames`
  );

  let promises: Promise<Locator | undefined>[] = [];

  for (let i = 0; i < frames.length; i++) {
    const promise = new Promise<Locator | undefined>(async (res, rej) => {
      const frame = frames[i];
      try {
        const loc = frame.locator(selector);
        await loc.waitFor({ state: "visible", timeout });
        res(loc);
      } catch (e) {
        res(undefined);
      }
    });
    promises.push(promise);
  }

  const frameResults = await Promise.all(promises);
  let locs = frameResults.filter((o) => o !== undefined) as Locator[];

  if (locs.length === 0) {
    console.log(`Found no results for selector '${selector}'`);
    return [];
  }

  for (const loc of locs) {
    const ct = await loc.count();
    if (ct > 0) {
      let t = await loc.textContent();
      t = t?.trim().slice(0, 100) ?? "";
      console.log(`Found ${ct} elements for selector '${selector}': '${t}'`);
    }
  }
  return locs;
};

export const findFirst = async (
  page: Page,
  selector: string,
  options?: Options
): Promise<Locator | undefined> => {
  const all = await findAll(page, selector, options);
  if (all.length > 0) {
    return all[0];
  }
  return undefined;
};

export const getPageKind = async (
  page: Page,
  map: Record<ExtractorPageKind, string[]>,
  options?: Options
): Promise<ExtractorPageKind> => {
  console.log("Checking current page kind");

  const promises: Promise<ExtractorPageKind>[] = [];
  for (const [kind, sels] of Object.entries(map)) {
    for (const sel of sels) {
      const promise = new Promise<ExtractorPageKind>(async (res, rej) => {
        const loc = await findFirst(page, sel, options);
        if (loc) {
          res(kind as ExtractorPageKind);
        } else {
          rej();
        }
      });
      promises.push(promise);
    }
  }

  try {
    const kind = await Promise.any(promises);
    console.log(`Current page kind: ${kind}`);
    return kind;
  } catch (e) {
    console.log("Unable to find current page kind");
    return getPageKind(page, map);
  }
};
