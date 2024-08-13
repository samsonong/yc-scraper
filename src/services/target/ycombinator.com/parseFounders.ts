import fs from "fs";
import { json2csv } from "json-2-csv";

import { writeToFile } from "../../fs/writeToFile";
import { GetCompaniesType, ycCompaniesOutputFilePath } from "./getCompanies";
import { GetFoundersOfCompanyType } from "./getFoundersOfCompany";
import { ycFoundersOutputFilePath } from "../../..";

type Parsed = {
  batch: string;
  company: {
    name: string;
    description: string;
    location: string;
    ycProfileUrl: string;
  };
  founder: {
    name: string;
    social: {
      twitter?: string;
      linkedin?: string;
      github?: string;
    };
  };
};

export function parseFounders() {
  const companiesInBatches: GetCompaniesType[] = JSON.parse(
    fs.readFileSync(ycCompaniesOutputFilePath, "utf8")
  );
  const foundersData: GetFoundersOfCompanyType[] = JSON.parse(
    fs.readFileSync(ycFoundersOutputFilePath, "utf8")
  );

  const enrichedFounders: Parsed[] = companiesInBatches.flatMap((batch) => {
    const { batchNumber, companies } = batch;

    return companies.flatMap((company): Parsed[] => {
      const { name, founders } = foundersData.shift()!;

      if (company.name !== name) {
        throw new Error(
          `Mismatched company names in batch ${batchNumber} (${company.name} !== ${name})`
        );
      }

      return founders.map(
        (founder): Parsed => ({
          batch: batchNumber,
          company,
          founder: {
            name: founder.name,
            social: {
              twitter: founder.social.twitter || "",
              linkedin: founder.social.linkedin || "",
              github: founder.social.github || "",
            },
          },
        })
      );
    });
  });

  // * Convert into CSV
  const csvOutput = json2csv(enrichedFounders);

  writeToFile({
    prettyName: "YC founders",
    filePath: "output/enriched-founders.csv",
    data: csvOutput,
    writeRaw: true,
  });
}
