import { Locator, Page } from "@playwright/test";
import { ExtractorPageKind } from "../types.js";

type Options = {
  /**
   * The maximum amount of time to wait for an element matching `selector` before
   * deciding it doesn't exist on the page.
   */
  timeout?: number;
  /**
   * If `true`, wait for the full duration of `timeout` before evaluating the selector.
   */
  forceTimeout?: boolean;
};

export const findFirst = async (
  page: Page,
  selector: string,
  options?: Options
): Promise<Locator | undefined> => {
  const frames = page.frames();
  const timeout = options?.timeout ?? 2000;

  let promises: Promise<Locator>[] = [];

  for (let i = 0; i < frames.length; i++) {
    const promise = new Promise<Locator>(async (res, rej) => {
      try {
        const frame = frames[i];
        const loc = frame.locator(selector);

        if (options?.forceTimeout) {
          await page.waitForTimeout(timeout);
        } else {
          await loc.waitFor({ timeout });
        }
        const ct = await loc.count();
        if (ct === 0) {
          rej(`No elements matching '${selector}'`);
        }

        res(loc);
      } catch (e) {
        rej(e);
      }
    });
    promises.push(promise);
  }

  let loc: Locator | undefined;

  const frameResults = await Promise.allSettled(promises);
  for (const res of frameResults) {
    if (res.status === "rejected") {
      continue;
    }

    const l = res.value;
    try {
      const ct = await l.count();
      if (ct === 0) {
        throw "No elements";
      }
    } catch (e) {
      continue;
    }

    loc = l;
  }

  if (!loc) {
    return undefined;
  }

  return loc;
};

export const getPageKind = async (
  page: Page,
  map: Record<ExtractorPageKind, string[]>,
  options?: Options
): Promise<ExtractorPageKind> => {
  let attemptCt = 1;
  let maxCt = 3;

  while (true) {
    console.log(
      `Trying to find current page kind (attempt ${attemptCt} of ${maxCt})`
    );

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
      return kind;
    } catch (e) {}

    if (attemptCt === maxCt) {
      throw "Unable to find current page kind";
    }

    attemptCt += 1;
  }
};
