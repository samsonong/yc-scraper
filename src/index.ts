import fs from "fs";
import puppeteer from "puppeteer";
import { writeToFile } from "./services/fs/writeToFile";
import {
  getFoundersOfYcCompany,
  GetFoundersOfYcCompanyType,
} from "./services/getFoundersOfYcCompany";
import {
  getListOfYcCompanies,
  GetListOfYcCompaniesType,
} from "./services/getListOfYcCompanies";
import { getYcBatches } from "./services/getYcBatches";
import { consoleLog } from "./services/terminal/consoleLog";
import { retryWrapper } from "./services/terminal/retryWrapper";

const ycCompaniesOutputFilePath = "output/yc-companies.json";
const ycFoundersOutputFilePath = "output/yc-founders.json";

(async () => {
  const browser = await puppeteer.launch();

  try {
    // * If `output/yc-companies.json` does not exist, fetch data
    // * Else, use existing data
    let ycBatchesOfCompanies: GetListOfYcCompaniesType[] = [];
    if (!fs.existsSync(ycCompaniesOutputFilePath)) {
      consoleLog(
        `\`${ycCompaniesOutputFilePath}\` does not exist. Fetching fresh data...\n`,
        "info",
      );

      // * Fetch batch numbers
      const batchNumbers = await getYcBatches({ browser });

      // * Fetch companies for each batch
      for (const batchNumber of batchNumbers) {
        ycBatchesOfCompanies.push(
          await getListOfYcCompanies({ browser, batchNumber }),
        );
      }

      // * Write result to file (for reusing)
      writeToFile({
        filePath: ycCompaniesOutputFilePath,
        data: ycBatchesOfCompanies,
      });
    }
    if (ycBatchesOfCompanies.length === 0) {
      consoleLog(
        `\`${ycCompaniesOutputFilePath}\` found! Using previously-fetched data...\n`,
        "info",
      );
      ycBatchesOfCompanies = JSON.parse(
        fs.readFileSync(ycCompaniesOutputFilePath, "utf8"),
      );
    }

    // * Fetch founders for each company
    const concurrency = 20;
    const allFounders: GetFoundersOfYcCompanyType[] = [];
    for (let i = 0; i < ycBatchesOfCompanies.length; i++) {
      const thisBatch = ycBatchesOfCompanies[i].companies;
      consoleLog(
        `Processing batch ${ycBatchesOfCompanies[0].batchNumber}...\n`,
        "info",
      );
      for (let j = 0; j < thisBatch.length; j += concurrency) {
        const companiesToProcess = thisBatch.slice(j, j + concurrency);
        const foundersFromCompaniesToProcess = await Promise.allSettled(
          companiesToProcess.map(async (company) =>
            retryWrapper(async () =>
              getFoundersOfYcCompany({
                browser,
                name: company.name,
                url: company.ycProfileUrl,
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
    writeToFile({ filePath: ycFoundersOutputFilePath, data: allFounders });
  } catch (err: unknown) {
    consoleLog(`Error: ${JSON.stringify(err, undefined, 2)}`, "error");
  } finally {
    await browser.close();
  }
})();
