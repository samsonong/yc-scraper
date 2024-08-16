import fs from "fs";
import { Browser } from "puppeteer";
import { writeToFile } from "../../fs/writeToFile";
import { consoleLog } from "../../terminal/consoleLog";
import { retryWrapper } from "../../terminal/retryWrapper";
import { GetCompaniesType } from "./getCompanies";
import { getFoundersOfCompany } from "./getFoundersOfCompany";

type Props = {
  browser: Browser;
  batchesOfCompanies: GetCompaniesType[];
};

export type GetFoundersType = {
  batchNumber: string;
  company: GetCompaniesType["companies"][number];
  profile: FounderProfile;
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

const ycFoundersOutputFilePath = "output/yc-founders.json";

export async function getFounders({
  browser,
  batchesOfCompanies,
}: Props): Promise<GetFoundersType[]> {
  // * If file does not exist, fetch data
  // * Else, use existing data
  let allFounders: GetFoundersType[] = [];
  if (!fs.existsSync(ycFoundersOutputFilePath)) {
    consoleLog(
      `\`${ycFoundersOutputFilePath}\` does not exist. Fetching fresh data...\n`,
      "info",
    );

    // * Fetch allFounders for each company
    const concurrency = 50; // Every 5 use ~ 1GB of memory
    allFounders = [];
    for (let i = 0; i < batchesOfCompanies.length; i++) {
      const companies = batchesOfCompanies[i].companies;

      for (let j = 0; j < companies.length; j += concurrency) {
        const companiesToProcess = companies.slice(j, j + concurrency);
        const progress = j + companiesToProcess.length;
        consoleLog(
          `Processing batch ${
            batchesOfCompanies[i].batchNumber
          } (${progress}/${companies.length})...`,
          "info",
        );

        const allFoundersFromCompaniesToProcess = await Promise.allSettled(
          companiesToProcess.map(async (company) =>
            retryWrapper(async () =>
              getFoundersOfCompany({
                browser,
                batchNumber: batchesOfCompanies[i].batchNumber,
                company,
                silent: true,
              }),
            ),
          ),
        );
        for (const result of allFoundersFromCompaniesToProcess) {
          if (result.status === "fulfilled") {
            allFounders.push(...result.value);
          } else {
            consoleLog(
              `Error: ${JSON.stringify(result.reason, undefined, 2)}`,
              "warn",
              { dim: true },
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
  }
  if (allFounders.length === 0) {
    consoleLog(
      `\`${ycFoundersOutputFilePath}\` found! Using previously-fetched data...\n`,
      "info",
    );
    allFounders = JSON.parse(fs.readFileSync(ycFoundersOutputFilePath, "utf8"));
  }

  return allFounders;
}
