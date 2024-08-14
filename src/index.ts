import puppeteer from "puppeteer";
import { writeToFile } from "./services/fs/writeToFile";
import {
  getCompanies,
  GetCompaniesType,
} from "./services/target/ycombinator.com/getCompanies";
import {
  getFoundersOfCompany,
  GetFoundersOfCompanyType,
} from "./services/target/ycombinator.com/getFoundersOfCompany";
import { consoleLog } from "./services/terminal/consoleLog";
import { retryWrapper } from "./services/terminal/retryWrapper";

export const ycFoundersOutputFilePath = "output/yc-founders.json";

(async () => {
  const browser = await puppeteer.launch({ headless: "shell" });

  const ycBatchesOfCompanies: GetCompaniesType[] = await getCompanies({
    browser,
  });

  try {
    // * Fetch founders for each company
    const concurrency = 20;
    const allFounders: GetFoundersOfCompanyType[] = [];
    for (let i = 0; i < ycBatchesOfCompanies.length; i++) {
      const companies = ycBatchesOfCompanies[i].companies;

      for (let j = 0; j < companies.length; j += concurrency) {
        const companiesToProcess = companies.slice(j, j + concurrency);
        consoleLog(
          `Processing batch ${ycBatchesOfCompanies[i].batchNumber} (${companiesToProcess.length}/${companies.length})...`,
          "info",
        );

        const foundersFromCompaniesToProcess = await Promise.allSettled(
          companiesToProcess.map(async (company) =>
            retryWrapper(async () =>
              getFoundersOfCompany({
                browser,
                batchNumber: ycBatchesOfCompanies[i].batchNumber,
                company,
                silent: true,
              }),
            ),
          ),
        );
        for (const result of foundersFromCompaniesToProcess) {
          if (result.status === "fulfilled") {
            allFounders.push(result.value);
          } else {
            consoleLog(
              `Error: ${JSON.stringify(result.reason, undefined, 2)}`,
              "warn",
              "dim",
            );
          }
        }
      }
    }

    // * Write result to file
    writeToFile({
      prettyName: "YC founders",
      filePath: ycFoundersOutputFilePath,
      data: allFounders,
    });
  } catch (err: unknown) {
    consoleLog(`Error: ${JSON.stringify(err, undefined, 2)}`, "error");
  } finally {
    await browser.close();
  }
})();
