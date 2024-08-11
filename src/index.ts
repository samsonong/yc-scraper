import fs from "fs";
import puppeteer from "puppeteer";
import {
  getListOfYcCompanies,
  GetListOfYcCompaniesType,
} from "./services/getListOfYcCompanies";
import { getYcBatches } from "./services/getYcBatches";

(async () => {
  const browser = await puppeteer.launch();

  const batchNumbers = await getYcBatches({ browser });
  console.log(batchNumbers);

  const allCompanies: GetListOfYcCompaniesType[] = [];
  for (const batchNumber of batchNumbers) {
    allCompanies.push(await getListOfYcCompanies({ browser, batchNumber }));
  }

  fs.writeFile(
    "output/yc-companies.json",
    JSON.stringify(allCompanies),
    (err) => {
      if (err) {
        throw new Error(`Error writing file: ${err}`);
      } else {
        console.log("List of YC companies available in `yc-companies.json`");
      }
    }
  );

  await browser.close();
})();
