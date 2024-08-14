import puppeteer from "puppeteer";
import {
  getCompanies,
  GetCompaniesType,
} from "./services/target/ycombinator.com/getCompanies";
import {
  getFounders,
  GetFoundersType,
} from "./services/target/ycombinator.com/getFounders";
import { consoleLog } from "./services/terminal/consoleLog";

(async () => {
  const browser = await puppeteer.launch({ headless: "shell" });

  try {
    const batchesOfCompanies: GetCompaniesType[] = await getCompanies({
      browser,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const founders: GetFoundersType[] = await getFounders({
      browser,
      batchesOfCompanies,
    });
  } catch (err: unknown) {
    consoleLog(`Error: ${JSON.stringify(err, undefined, 2)}`, "error");
  } finally {
    await browser.close();
  }
})();
