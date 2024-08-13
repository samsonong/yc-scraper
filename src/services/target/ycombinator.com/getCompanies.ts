import { writeToFile } from "../../fs/writeToFile";
import { consoleLog } from "../../terminal/consoleLog";
import fs from "fs";
import { getBatches } from "./getBatches";
import { getCompaniesOfBatch } from "./getCompaniesOfBatch";
import { Browser } from "puppeteer";

type Props = {
  browser: Browser;
};

export type GetCompaniesType = {
  batchNumber: string;
  numberOfCompanies: number;
  companies: {
    name: string;
    description: string;
    location: string;
    ycProfileUrl: string;
  }[];
};

const ycCompaniesOutputFilePath = "output/yc-companies.json";

export async function getCompanies({
  browser,
}: Props): Promise<GetCompaniesType[]> {
  // * If `output/yc-companies.json` does not exist, fetch data
  // * Else, use existing data
  let ycBatchesOfCompanies: GetCompaniesType[] = [];
  if (!fs.existsSync(ycCompaniesOutputFilePath)) {
    consoleLog(
      `\`${ycCompaniesOutputFilePath}\` does not exist. Fetching fresh data...\n`,
      "info",
    );

    // * Fetch batch numbers
    const batchNumbers = await getBatches({ browser });

    // * Fetch companies for each batch
    for (const batchNumber of batchNumbers) {
      ycBatchesOfCompanies.push(
        await getCompaniesOfBatch({ browser, batchNumber }),
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

  return ycBatchesOfCompanies;
}
