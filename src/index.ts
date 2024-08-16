import { config } from "@dotenvx/dotenvx";
import puppeteer from "puppeteer";
import { enrichFounders } from "./services/target/apollo.io/enrichFounders";
import {
  getCompanies,
  GetCompaniesType,
} from "./services/target/ycombinator.com/getCompanies";
import {
  getFounders,
  GetFoundersType,
} from "./services/target/ycombinator.com/getFounders";
import { consoleLog } from "./services/terminal/consoleLog";

config();

(async () => {
  const browser = await puppeteer.launch({ headless: "shell" });

  let founders: GetFoundersType[] = [];
  try {
    const batchesOfCompanies: GetCompaniesType[] = await getCompanies({
      browser,
    });

    founders = await getFounders({
      browser,
      batchesOfCompanies,
    });
  } catch (err: unknown) {
    consoleLog(`Error: ${JSON.stringify(err, undefined, 2)}`, "error");
  } finally {
    await browser.close();
  }

  if (founders.length === 0) {
    throw new Error("`founders` is unexpectedly empty");
  }

  await enrichFounders({ founders });
})();
