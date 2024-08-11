import fs from "fs";
import puppeteer from "puppeteer";
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
      `\`${ycCompaniesOutputFilePath}\` does not exist. Fetching fresh data...`,
    );

    // * Fetch batch numbers
    const batchNumbers = await getYcBatches({ browser });

    // * Fetch companies for each batch
    for (const batchNumber of batchNumbers) {
      allCompanies.push(await getListOfYcCompanies({ browser, batchNumber }));
    }

    // * Write result to file (for reusing)
    fs.writeFile(
      ycCompaniesOutputFilePath,
      JSON.stringify(allCompanies),
      (err) => {
        if (err) {
          throw new Error(`Error writing file: ${err}`);
        } else {
          console.log("List of YC companies available in `yc-companies.json`");
        }
      },
    );
  }
  if (allCompanies.length === 0) {
    console.info(
      `\`${ycCompaniesOutputFilePath}\` found! Using previously-fetched data...`,
    );
    allCompanies = JSON.parse(
      fs.readFileSync(ycCompaniesOutputFilePath, "utf8"),
    );
  }

  await browser.close();
})();
