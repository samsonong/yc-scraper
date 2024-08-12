import fs from "fs";
import puppeteer from "puppeteer";
import { writeToFile } from "./services/fs/writeToFile";
import {
  getListOfYcCompanies,
  GetListOfYcCompaniesType,
} from "./services/getListOfYcCompanies";
import { getYcBatches } from "./services/getYcBatches";
import { consoleLog } from "./services/terminal/consoleLog";

(async () => {
  const browser = await puppeteer.launch();

  try {
    // * If `output/yc-companies.json` does not exist, fetch data
    // * Else, use existing data
    const ycCompaniesOutputFilePath = "output/yc-companies.json";
    let allCompanies: GetListOfYcCompaniesType[] = [];
    if (!fs.existsSync(ycCompaniesOutputFilePath)) {
      consoleLog(
        `\`${ycCompaniesOutputFilePath}\` does not exist. Fetching fresh data...\n`,
        "info"
      );

      // * Fetch batch numbers
      const batchNumbers = await getYcBatches({ browser });

      // * Fetch companies for each batch
      for (const batchNumber of batchNumbers) {
        allCompanies.push(await getListOfYcCompanies({ browser, batchNumber }));
      }

      // * Write result to file (for reusing)
      writeToFile({ filePath: ycCompaniesOutputFilePath, data: allCompanies });
    }
    if (allCompanies.length === 0) {
      consoleLog(
        `\`${ycCompaniesOutputFilePath}\` found! Using previously-fetched data...\n`,
        "info"
      );
      allCompanies = JSON.parse(
        fs.readFileSync(ycCompaniesOutputFilePath, "utf8")
      );
    }
  } catch (err: unknown) {
    consoleLog(JSON.stringify(err), "error");
  } finally {
    await browser.close();
  }
})();
