import { Browser } from "puppeteer";

type Props = {
  browser: Browser;
};

export async function getYcBatches({ browser }: Props): Promise<string[]> {
  // * Navigate to https://www.ycombinator.com/companies
  console.info("Navigating to `https://www.ycombinator.com/companies`...");
  const page = await browser.newPage();
  await page.goto("https://www.ycombinator.com/companies");

  // * Wait for page to finish loading
  await page.waitForNetworkIdle();

  // * Look for `<h4>Batch</h4>`
  console.info("Looking for `<h4>Batch</h4>`...");
  const allH4ElementsHandle = await page.$$("h4");
  if (allH4ElementsHandle.length < 1) throw new Error("`<h4>` not found");
  const matchingH4Handle = allH4ElementsHandle.find((el) =>
    el.evaluate((el) => el.textContent?.toLowerCase().includes("batch")),
  );
  if (!matchingH4Handle) throw new Error("`<h4>Batch</h4>` not found");

  // * Go through all `<div>` siblings of `<h4>Batch</h4>` and collect batch numbers
  console.info("Found `<h4>Batch</h4>`! Getting sibling `<div>`...");
  const batchSectionHandle = await matchingH4Handle.evaluateHandle((h4) => {
    const parent = h4.parentElement as HTMLDivElement;
    if (!parent) throw new Error("`<h4>Batch</h4>` is an orphan");
    return parent;
  });

  // * Press "<a>See all options</a>" to reveal all batches
  console.info("Clicking `<a>See all options</a>` to reveal all batches...");
  const seeAllOptions = await batchSectionHandle.evaluateHandle((section) => {
    const seeAllOptions = section.querySelector("a");
    if (!seeAllOptions) throw new Error("`<a>See all options</a>` not found");
    return seeAllOptions;
  });
  await seeAllOptions.click();

  // * Getting all sibling `<div>` elements
  console.info("Getting all sibling `<div>` elements...");
  const siblingDivsHandle = await batchSectionHandle.evaluateHandle(
    (batchSection) => {
      const siblingDivs = batchSection.querySelectorAll("div");
      if (!siblingDivs) throw new Error("`<h4>Batch</h4>` has no siblings");
      return siblingDivs;
    },
  );

  // * Extracting batch numbers
  console.info("Extracting batch numbers...");
  const batchNumbers: string[] = await siblingDivsHandle.evaluate(
    (siblingDivs) =>
      Array.from(siblingDivs).flatMap(
        (div) => div.querySelector("span")?.textContent ?? [],
      ),
  );

  // * Remember to close page!
  await page.close();

  return batchNumbers;
}
