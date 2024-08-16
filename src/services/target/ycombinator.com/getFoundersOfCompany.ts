import { Browser, ElementHandle, Page } from "puppeteer";
import { YC_BASE_URL } from "../../../constants/constants";
import { chalk } from "../../chalk/chalk";
import { filterResourceLoading } from "../../puppeteer/filterResourceLoading";
import { consoleLog } from "../../terminal/consoleLog";
import { GetCompaniesType } from "./getCompanies";
import { GetFoundersType } from "./getFounders";

type Props = {
  browser: Browser;
  page?: Page;
  batchNumber: string;
  company: GetCompaniesType["companies"][number];
  silent?: true;
};

export async function getFoundersOfCompany({
  browser,
  page,
  batchNumber,
  company,
  silent,
}: Props): Promise<GetFoundersType[]> {
  if (!page) page = await browser.newPage();
  filterResourceLoading({ page, rule: { schema: "aesthetics" } });

  try {
    const { name, ycProfileUrl } = company;
    // * If url doesn't start with `YC_BASE_URL`, prepend it
    const url = ycProfileUrl.startsWith(YC_BASE_URL)
      ? ycProfileUrl
      : new URL(ycProfileUrl, YC_BASE_URL).toString();

    // * Navigate to https://www.ycombinator.com/companies/{slug}
    consoleLog(`Navigating to ${chalk(url, "link")}...`, undefined, { silent });
    await page.goto(url);

    // * This page doesn't lazy-load, so we don't need to wait for network idle
    // await page.waitForNetworkIdle();

    let founders: GetFoundersType["profile"][] | null = null;
    try {
      if (!founders) founders = await methodOne(page, silent);
      if (!founders) founders = await methodTwo(page, silent);
      if (!founders) {
        throw new Error(`Couldn't find founder info in ${chalk(url, "link")}`);
      }
    } catch (err: unknown) {
      throw new Error(err as string);
    }

    consoleLog(
      `Found ${founders.length} active founders leading ${name}\n`,
      "success",
      { silent },
    );

    return founders.map((founder) => ({
      batchNumber: batchNumber,
      company,
      profile: founder,
    }));
  } finally {
    // * Remember to close page!
    await page.close();
  }
}

/**
 * @code
 *
 * <div>
 *   <h3>Active Founders</h3> // We use this as lookup candidate
 *   <div>
 *     <div /> // This is the founder card
 *   </div>
 * </div>
 */
async function methodOne(
  page: Page,
  silent?: true,
): Promise<GetFoundersType["profile"][] | null> {
  let error: string | undefined = undefined;

  try {
    // * Look for `<h3>Active Founders</h3>`
    consoleLog("Looking for `<h3>Active Founders</h3>`...", "info", {
      dim: true,
      silent,
    });
    const allH3ElementsHandle = await page.$$("h3");
    if (allH3ElementsHandle.length < 1) throw new Error("`<h3>` not found");
    let activeFounderH3Handle: ElementHandle<HTMLHeadingElement> | null = null;
    for (let i = 0; i < allH3ElementsHandle.length; i++) {
      const h3 = allH3ElementsHandle[i];
      const innerText = await h3.evaluate((el) =>
        el.textContent?.toLowerCase(),
      );
      if (
        innerText?.includes("active founders") ||
        innerText?.includes("former founders")
      ) {
        activeFounderH3Handle = h3;
        break;
      }
    }
    if (!activeFounderH3Handle) {
      throw new Error("`<h3>Active Founders</h3>` not found");
    }

    // * Grab `<div>` containing list of founders
    consoleLog(`Grabbing <div> containing list of founders...`, "info", {
      silent,
    });

    let founderCardListHandle: ElementHandle<Element>;
    try {
      founderCardListHandle = await activeFounderH3Handle.evaluateHandle(
        (h3) => {
          const output = h3.parentElement?.nextElementSibling;
          if (!output) {
            error = "Could not find `<div>` containing list of companies";
            throw new Error();
          }
          return output;
        },
      );
    } catch {
      throw new Error(error);
    }

    // * Extract list of founders
    consoleLog(`Extracting list of founders...`, "info", { dim: true, silent });
    const founders = await founderCardListHandle.evaluate((div) => {
      const listOfFoundersDiv = div.querySelectorAll("div");
      return Array.from(listOfFoundersDiv).flatMap((div) => {
        // * Founder card is in the last `<div>`
        const founderCard = div.lastElementChild;
        if (!founderCard) return [];

        // * Dive deeper into founderCardContent (name, company, socials)
        const founderCardContent = div.firstElementChild?.lastElementChild;
        if (!founderCardContent) return [];

        // * Name of founder
        const name = founderCardContent.firstElementChild?.textContent?.trim();
        if (!name) return [];

        // * Social links of founder
        const socialLinks =
          founderCardContent.lastElementChild?.querySelectorAll("a");

        const social: GetFoundersType["profile"]["social"] = {};
        socialLinks?.forEach((link) => {
          const href = link.getAttribute("href");
          if (!href) return;

          if (href.includes("x.com")) {
            social.twitter = href;
          } else if (href.includes("linkedin")) {
            social.linkedin = href;
          } else if (href.includes("github")) {
            social.github = href;
          }
        });

        return {
          name,
          social,
        };
      });
    });

    // * Reusing page, do not close it

    return founders;
  } catch (err: unknown) {
    consoleLog(`Method 1 didn't work... ${err}`, "warn", { dim: true, silent });
    return null;
  }
}

/**
 * Search for alternate founder card if the first one is not found
 *
 * @code
 *
 * <div>
 *   <div class="ycdc-card" /> // We use this as lookup candidate
 *   <div>Founders</div> // We use this to cross-check if this page is in this format
 *   <div>
 *     <div /> // This is the founder card
 *   </div>
 * </div>
 */
async function methodTwo(
  page: Page,
  silent?: true,
): Promise<GetFoundersType["profile"][] | null> {
  let error: string | undefined = undefined;
  try {
    // * Look for `<div class="ycdc-card">`

    consoleLog('Looking for `<div class="ycdc-card">`...', "info", {
      dim: true,
      silent,
    });
    const ycdcCardDivHandle = await page.locator(".ycdc-card").waitHandle();
    if (!ycdcCardDivHandle) {
      throw new Error('`<div class="ycdc-card">` not found');
    }

    // * Check if next sibling is `<div>Founders</div>`
    consoleLog(
      "Cross-checking if this page is in the correct format...",
      "info",
      {
        dim: true,
        silent,
      },
    );
    let foundersHeaderDivText: string;
    try {
      foundersHeaderDivText = await ycdcCardDivHandle.evaluate((div) => {
        const output = div.nextElementSibling?.textContent?.toLowerCase();
        if (!output) {
          error = '`<div class="ycdc-card">` does not have a sibling';
          throw new Error(error);
        }
        return output;
      });
    } catch {
      throw new Error(error);
    }
    if (!foundersHeaderDivText.includes("founders")) {
      throw new Error(
        '`<div class="ycdc-card">` does not have `<div>Founders</div>` as sibling',
      );
    }

    // * Get founder card list
    consoleLog("Grabbing list of founder cards...", "info", {
      dim: true,
      silent,
    });
    let founderCardListHandle;
    try {
      founderCardListHandle = await ycdcCardDivHandle.evaluateHandle((div) => {
        const output = div.nextElementSibling?.nextElementSibling;
        if (!output) {
          error =
            'Cannot find founder card list near `<div class="ycdc-card">`';
          throw new Error(error);
        }
        return output;
      });
    } catch {
      throw new Error(error);
    }

    // * Extract list of founders
    consoleLog(`Extracting list of founders...`, "info", { dim: true, silent });
    const founders = await founderCardListHandle.evaluate((div) => {
      const listOfFoundersDiv = div.querySelectorAll("div");
      return Array.from(listOfFoundersDiv).flatMap((div) => {
        // * Dive into founderCardContent (name, company, socials)
        const founderCardContent = div.firstElementChild?.lastElementChild;
        if (!founderCardContent) return [];

        // * Name of founder
        const name = founderCardContent.firstElementChild?.textContent?.trim();
        if (!name) return [];

        // * Social links of founder
        const socialLinks =
          founderCardContent.lastElementChild?.querySelectorAll("a");

        const social: GetFoundersType["profile"]["social"] = {};
        socialLinks?.forEach((link) => {
          const href = link.getAttribute("href");
          if (!href) return;

          if (href.includes("x.com")) {
            social.twitter = href;
          } else if (href.includes("linkedin")) {
            social.linkedin = href;
          } else if (href.includes("github")) {
            social.github = href;
          }
        });

        return {
          name,
          social,
        };
      });
    });

    // * Reusing page, do not close it

    return founders;
  } catch (err: unknown) {
    consoleLog(`Method 2 didn't work... ${err}`, "warn", { dim: true, silent });
    return null;
  }
}
