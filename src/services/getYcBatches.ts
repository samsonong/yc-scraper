import { Browser, ElementHandle } from "puppeteer";
import { consoleLog } from "./terminal/consoleLog";
import { chalk } from "./chalk/chalk";
import { YC_BASE_URL } from "../constants/constants";

type Props = {
  browser: Browser;
};

export async function getYcBatches({ browser }: Props): Promise<string[]> {
  const page = await browser.newPage();

  try {
    // * Navigate to https://www.ycombinator.com/companies
    const url = new URL("companies", YC_BASE_URL).toString();
    consoleLog(`Navigating to ${chalk(url, "link")}...`);
    await page.goto(url);

    // * Wait for page to finish loading
    await page.waitForNetworkIdle();

    // * Look for `<h4>Batch</h4>`
    consoleLog("Looking for `<h4>Batch</h4>`...", "info", "dim");
    const allH4ElementsHandle = await page.$$("h4");
    if (allH4ElementsHandle.length < 1) throw new Error("`<h4>` not found");

    let matchingH4Handle: ElementHandle<HTMLHeadingElement> | null = null;
    for (let i = 0; i < allH4ElementsHandle.length; i++) {
      const h4 = allH4ElementsHandle[i];
      const innerText = await h4.evaluate((el) =>
        el.textContent?.toLowerCase(),
      );
      if (innerText?.includes("batch")) {
        matchingH4Handle = h4;
        break;
      }
    }
    if (!matchingH4Handle) throw new Error("`<h4>Batch</h4>` not found");

    // * Go through all `<div>` siblings of `<h4>Batch</h4>` and collect batch numbers
    consoleLog(
      "Found `<h4>Batch</h4>`! Getting sibling `<div>`...",
      "info",
      "dim",
    );
    const batchSectionHandle = await matchingH4Handle.evaluateHandle((h4) => {
      const parent = h4.parentElement as HTMLDivElement;
      if (!parent) throw new Error("`<h4>Batch</h4>` is an orphan");
      return parent;
    });

    // * Press "<a>See all options</a>" to reveal all batches
    consoleLog(
      "Clicking `<a>See all options</a>` to reveal all batches...",
      "info",
      "dim",
    );
    const seeAllOptions = await batchSectionHandle.evaluateHandle((section) => {
      const seeAllOptions = section.querySelector("a");
      if (!seeAllOptions) throw new Error("`<a>See all options</a>` not found");
      return seeAllOptions;
    });
    await seeAllOptions.click();

    // * Getting all sibling `<div>` elements
    consoleLog("Getting all sibling `<div>` elements...", "info", "dim");
    const siblingDivsHandle = await batchSectionHandle.evaluateHandle(
      (batchSection) => {
        const siblingDivs = batchSection.querySelectorAll("div");
        if (!siblingDivs) throw new Error("`<h4>Batch</h4>` has no siblings");
        return siblingDivs;
      },
    );

    // * Extracting batch numbers
    consoleLog("Extracting batch numbers...", "info", "dim");
    const batchNumbers: string[] = await siblingDivsHandle.evaluate(
      (siblingDivs) =>
        Array.from(siblingDivs).flatMap(
          (div) => div.querySelector("span")?.textContent ?? [],
        ),
    );

    consoleLog(
      `${batchNumbers.length} batches found (${batchNumbers[0]} ~ ${batchNumbers[batchNumbers.length - 1]})\n`,
      "success",
    );
    return batchNumbers;
  } finally {
    // * Remember to close page!
    await page.close();
  }
}
