import { Browser } from "puppeteer";
import { scrollUntilPageEnd } from "./puppeteer/scrollUntilPageEnd";

type Props = {
  browser: Browser;
  batchNumber: string;
};

export type GetListOfYcCompaniesType = {
  batchNumber: string;
  numberOfCompanies: number;
  companies: {
    name: string;
    description: string;
    location: string;
    ycProfileUrl: string;
  }[];
};

export async function getListOfYcCompanies({
  browser,
  batchNumber,
}: Props): Promise<GetListOfYcCompaniesType> {
  // * Navigate to https://www.ycombinator.com/companies?batch=X00
  const url = `https://www.ycombinator.com/companies?batch=${batchNumber}`;
  console.info(`Navigating to \`${url}\`...`);
  const page = await browser.newPage();
  await page.goto(url);
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

  // * Wait for page to finish loading
  await page.waitForNetworkIdle();

  // * This page has infinite scrolling. Scroll till the end
  await scrollUntilPageEnd({ page });

  // * Look for `<div>Showing X of X companies</div>`
  console.info("Looking for `<div>Showing X of X companies</div>`...");
  const siblingOfCompaniesListDiv = await page
    .locator("div ::-p-text(Showing )")
    .waitHandle();
  if (!siblingOfCompaniesListDiv) {
    throw new Error("Could not find `<div>Showing X of X companies</div>`");
  }

  // * Grab `<div>` containing list of companies
  console.info(`Grabbing <div> containing list of companies...`);
  const companiesListDiv = await siblingOfCompaniesListDiv.evaluateHandle(
    (sibling) => {
      const output = sibling.nextElementSibling;
      if (!output) {
        throw new Error("Could not find `<div>` containing list of companies");
      }
      return output;
    },
  );

  // * Grab list of companies
  console.info(`Grabbing list of companies...`);
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
      const location = nameAndLocationDiv.lastElementChild?.textContent?.trim();
      if (!name || !location) return [];

      // * Short Description
      const description = descriptionDiv.firstElementChild?.textContent?.trim();
      if (!description) return [];

      return {
        name,
        description,
        location,
        ycProfileUrl,
      };
    });
  });

  // * Remember to close page!
  await page.close();

  console.info(`Found ${companies.length} companies in batch ${batchNumber}`);
  return {
    batchNumber,
    numberOfCompanies: companies.length,
    companies,
  };
}
