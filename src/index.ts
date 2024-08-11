import fs from "fs";
import puppeteer from "puppeteer";
import { writeToFile } from "./services/fs/writeToFile";
import {
  getListOfYcCompanies,
  GetListOfYcCompaniesType,
} from "./services/getListOfYcCompanies";
import { getYcBatches } from "./services/getYcBatches";

(async () => {
  const browser = await puppeteer.launch();

  // * If `output/yc-companies.json` does not exist, fetch data
  // * Else, use existing data
  const ycCompaniesOutputFilePath = "output/yc-companies.json";
  let allCompanies: GetListOfYcCompaniesType[] = [];
  if (!fs.existsSync(ycCompaniesOutputFilePath)) {
    console.info(
      `\`${ycCompaniesOutputFilePath}\` does not exist. Fetching fresh data...`
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
    console.info(
      `\`${ycCompaniesOutputFilePath}\` found! Using previously-fetched data...`
    );
    allCompanies = JSON.parse(
      fs.readFileSync(ycCompaniesOutputFilePath, "utf8")
    );
  }

  await browser.close();
})();
