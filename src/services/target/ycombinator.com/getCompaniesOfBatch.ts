import { Browser } from "puppeteer";
import { YC_BASE_URL } from "../../../constants/constants";
import { scrollUntilPageEnd } from "../../puppeteer/scrollUntilPageEnd";
import { consoleLog } from "../../terminal/consoleLog";
import { chalk } from "../../chalk/chalk";

type Props = {
  browser: Browser;
  batchNumber: string;
};

export type GetCompaniesOfBatchType = {
  batchNumber: string;
  numberOfCompanies: number;
  companies: {
    name: string;
    description: string;
    location: string;
    ycProfileUrl: string;
  }[];
};

export async function getCompaniesOfBatch({
  browser,
  batchNumber,
}: Props): Promise<GetCompaniesOfBatchType> {
  const page = await browser.newPage();

  try {
    // * Navigate to https://www.ycombinator.com/companies?batch=X00
    const url = new URL(
      `companies?batch=${batchNumber}`,
      YC_BASE_URL,
    ).toString();
    consoleLog(`Navigating to ${chalk(url, "link")}...`);
    await page.goto(url);
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    // * Wait for page to finish loading
    await page.waitForNetworkIdle();

    // * This page has infinite scrolling. Scroll till the end
    await scrollUntilPageEnd({ page });

    // * Look for `<div>Showing X of X companies</div>`
    consoleLog(
      "Looking for `<div>Showing X of X companies</div>`...",
      "info",
      "dim",
    );
    const siblingOfCompaniesListDiv = await page
      .locator("div ::-p-text(Showing )")
      .waitHandle();
    if (!siblingOfCompaniesListDiv) {
      throw new Error("Could not find `<div>Showing X of X companies</div>`");
    }

    // * Grab `<div>` containing list of companies
    consoleLog(`Grabbing <div> containing list of companies...`, "info", "dim");
    const companiesListDiv = await siblingOfCompaniesListDiv.evaluateHandle(
      (sibling) => {
        const output = sibling.nextElementSibling;
        if (!output) {
          throw new Error(
            "Could not find `<div>` containing list of companies",
          );
        }
        return output;
      },
    );

    // * Grab list of companies
    consoleLog(`Grabbing list of companies...`, "info", "dim");
    const companies = await companiesListDiv.evaluate((div) => {
      const listOfCompaniesA = div.querySelectorAll("a");
      return Array.from(listOfCompaniesA).flatMap((companyA) => {
        // * YC Profile URL of company
        const relativeYcProfileUrl = companyA.getAttribute("href");
        if (!relativeYcProfileUrl) return [];
        const ycProfileUrl = new URL(
          relativeYcProfileUrl,
          "https://www.ycombinator.com",
        ).toString();

        // * This is the `<div class="lg:max-w-[90%]">` containing the company info
        const infoDiv =
          companyA.querySelector("div")?.lastElementChild?.firstElementChild;
        if (!infoDiv) return [];

        // * The first two <div> have what we need
        const [nameAndLocationDiv, descriptionDiv] =
          infoDiv.querySelectorAll("div");

        // * Name & Location
        const name = nameAndLocationDiv.firstElementChild?.textContent?.trim();
        const location =
          nameAndLocationDiv.lastElementChild?.textContent?.trim();
        if (!name || !location) return [];

        // * Short Description
        const description =
          descriptionDiv.firstElementChild?.textContent?.trim();
        if (!description) return [];

        return {
          name,
          description,
          location,
          ycProfileUrl,
        };
      });
    });

    consoleLog(
      `Found ${companies.length} companies in batch ${batchNumber}\n`,
      "success",
    );

    return {
      batchNumber,
      numberOfCompanies: companies.length,
      companies,
    };
  } finally {
    // * Remember to close page!
    await page.close();
  }
}
