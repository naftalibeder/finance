import { Frame, Locator, Page } from "@playwright/test";

export const findAll = async (
  page: Page,
  selector: string
): Promise<Locator[]> => {
  let res: Locator[] = [];
  let i = 0;

  while (true) {
    try {
      const frame = page.frames()[i];
      if (!frame) {
        break;
      }

      const loc = frame.locator(selector);
      const resIter = await loc.all();
      res = [...res, ...resIter];
    } catch (e) {
      console.log(`No results in frame ${i}`);
    }

    i++;
  }

  return res;
};
