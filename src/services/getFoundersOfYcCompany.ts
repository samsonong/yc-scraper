import { Browser, ElementHandle } from "puppeteer";
import { YC_BASE_URL } from "../constants/constants";
import { chalk } from "./chalk/chalk";
import { consoleLog } from "./terminal/consoleLog";

type Props = {
  browser: Browser;
  url: string;
};

type GetFoundersOfYcCompanyType = {
  numberOfFounders: number;
  founders: FounderProfile[];
};

type FounderProfile = {
  name: string;
  social: FounderProfileSocial;
};

type FounderProfileSocial = {
  twitter?: string;
  linkedin?: string;
  github?: string;
};

export async function getFoundersOfYcCompany({
  browser,
  url,
}: Props): Promise<GetFoundersOfYcCompanyType> {
  // * If url doesn't start with `YC_BASE_URL`, prepend it
  if (!url.startsWith(YC_BASE_URL)) {
    url = new URL(url, YC_BASE_URL).toString();
  }

  // * Navigate to https://www.ycombinator.com/companies/{slug}
  consoleLog(`Navigating to ${chalk(url, "link")}...`);
  const page = await browser.newPage();
  await page.goto(url);
  page
    .on("console", (message) =>
      console.log(
        `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`
      )
    )
    .on("pageerror", ({ message }) => console.log(message));

  // * Wait for page to finish loading
  await page.waitForNetworkIdle();

  // * Look for `<h3>Active Founders</h3>`
  consoleLog("Looking for `<h3>Active Founders</h3>`...", "info", "dim");
  const allH3ElementsHandle = await page.$$("h3");
  if (allH3ElementsHandle.length < 1) throw new Error("`<h3>` not found");
  let activeFounderH3Handle: ElementHandle<HTMLHeadingElement> | null = null;
  for (let i = 0; i < allH3ElementsHandle.length; i++) {
    const h3 = allH3ElementsHandle[i];
    const innerText = await h3.evaluate((el) => el.textContent?.toLowerCase());
    if (innerText?.includes("active founders")) {
      activeFounderH3Handle = h3;
      break;
    }
  }
  if (!activeFounderH3Handle) {
    throw new Error("`<h3>Active Founders</h3>` not found");
  }

  // * Grab `<div>` containing list of founders
  consoleLog(`Grabbing <div> containing list of founders...`, "info", "dim");
  const founderListDiv = await activeFounderH3Handle.evaluateHandle((h3) => {
    const output = h3.parentElement?.nextElementSibling;
    if (!output) {
      throw new Error("Could not find `<div>` containing list of companies");
    }

    return output;
  });

  // * Grab list of founders
  consoleLog(`Extracting list of founders...`, "info", "dim");
  const founders: FounderProfile[] = await founderListDiv.evaluate((div) => {
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

      const social: FounderProfileSocial = {};
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

  // * Remember to close page!
  await page.close();

  const slug = url.split("/").pop();
  consoleLog(
    `Found ${founders.length} active founders leading ${slug}\n`,
    "success"
  );

  return {
    numberOfFounders: founders.length,
    founders,
  };
}
