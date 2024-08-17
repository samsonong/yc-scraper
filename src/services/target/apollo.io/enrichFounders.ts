import fs from "fs";
import _ from "lodash";
import { writeToFile } from "../../fs/writeToFile";
import { consoleLog } from "../../terminal/consoleLog";
import { GetFoundersType } from "../ycombinator.com/getFounders";
import { bulkMatchPeople } from "./api/v1/people/bulk_match/bulkMatchPeople";
import { BulkMatchResponseDto } from "./api/v1/people/bulk_match/response.dto";
import { APOLLO_IO_CONSTANTS } from "./constants";

const filePath = "output/enriched/enriched-yc-founders.json";
const rejectsFilePath = "output/enriched/rejected-enriched-yc-founders.json";

type Props = {
  founders: GetFoundersType[];
};

type EnrichedFounders = BulkMatchResponseDto;

export async function enrichFounders({ founders }: Props): Promise<void> {
  let enrichedFounders: EnrichedFounders["data"] = [];
  if (fs.existsSync(filePath)) {
    enrichedFounders = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  // * Break if all founders have been enriched
  const numberOfFoundersToProcess = founders.length - enrichedFounders.length;
  if (numberOfFoundersToProcess === 0) {
    consoleLog(
      `All founders have been enriched. Data available in \`${filePath}\`\n`,
      "success"
    );
    return;
  }

  consoleLog(
    enrichedFounders.length === 0
      ? `\`${filePath}\` not found!\n`
      : `\`${filePath}\` found with ${enrichedFounders.length} records!\n`,
    "info"
  );

  // * Enrich founders up to Apollo.io's hourly limit
  const {
    day: dailyLimit,
    hour: hourlyLimit,
    minute: minuteLimit,
    request: perRequestLimit,
  } = APOLLO_IO_CONSTANTS.apiRateLimit;

  // * Remove founders that have been rejected
  let nonRejectedFounders: GetFoundersType[] = founders;
  const rejectedFounders: GetFoundersType[] = [];
  if (fs.existsSync(rejectsFilePath)) {
    const data: GetFoundersType[] = JSON.parse(
      fs.readFileSync(rejectsFilePath, "utf8")
    );
    rejectedFounders.push(...data);
    if (rejectedFounders.length > 0) {
      nonRejectedFounders = nonRejectedFounders.filter(
        (founder) =>
          !rejectedFounders.some((rejectedFounder) =>
            _.isEqual(founder, rejectedFounder)
          )
      );
    }
  }
  if (nonRejectedFounders.length === 0) {
    consoleLog(
      `All processable founders have been enriched. Rejected founders available in \`${rejectsFilePath}\`\n`,
      "warn"
    );
    return;
  }

  // * Remove founders that have already been enriched
  const foundersToProcess: GetFoundersType[] = [];
  for (
    let i = 0;
    foundersToProcess.length < hourlyLimit && i < nonRejectedFounders.length;
    i++
  ) {
    const thisFounder = nonRejectedFounders[i];
    if (
      !enrichedFounders.some((enrichedFounder) =>
        isSimiliar(thisFounder, enrichedFounder)
      )
    ) {
      foundersToProcess.push(thisFounder);
    }
  }
  consoleLog(
    `Processing ${foundersToProcess.length} records this round...`,
    "info",
    { dim: true }
  );

  let dailyRequestLeft = dailyLimit;
  let maxIterations = Math.min(hourlyLimit, foundersToProcess.length);
  const newlyEnrichedFounders: EnrichedFounders["data"] = [];
  for (let i = 0; i < maxIterations; i += minuteLimit) {
    // * Wait for the next minute before processing the next batch
    if (i !== 0) await new Promise((resolve) => setTimeout(resolve, 1000 * 60));

    // * Process in batches according to request limit, up till minuteLimit
    for (let j = i; j < i + minuteLimit; j += perRequestLimit) {
      const batch = foundersToProcess.slice(j, j + perRequestLimit);
      if (batch.length === 0) break;

      // * Enrich the batch
      const {
        data,
        hourly_requests_left,
        daily_requests_left,
      }: BulkMatchResponseDto = await bulkMatchPeople({
        details: batch.map((founder) => ({
          name: founder.profile.name,
          organization_name: founder.company.name,
          linkedin_url: founder.profile.social.linkedin,
        })),
      });
      dailyRequestLeft = daily_requests_left;

      // * Update rate limit with value returned from request
      maxIterations = Math.min(hourly_requests_left, maxIterations);

      // * If there are nulls in data (i.e. no match), write to rejects file
      data.forEach((d, i) => {
        if (d === null) rejectedFounders.push(batch[i]);
      });

      // * Push newly enriched founders
      newlyEnrichedFounders.push(...data.filter((d) => d !== null));
    }
  }

  // * Update file
  const combinedEnrichedFounders = [
    ...enrichedFounders,
    ...newlyEnrichedFounders,
  ];
  writeToFile({
    prettyName: "Enriched YC founders",
    filePath,
    data: combinedEnrichedFounders,
    silent: true,
  });
  writeToFile({
    prettyName: "Rejected YC founders",
    filePath: rejectsFilePath,
    data: rejectedFounders,
    silent: true,
  });

  consoleLog(
    `Completed enrichment process. Data available in \`${filePath}\``,
    "success"
  );
  consoleLog(
    `Number of founders enriched: ${newlyEnrichedFounders.length}`,
    "success",
    { dim: true }
  );
  consoleLog(
    `Total number of enriched founders: ${combinedEnrichedFounders.length}`,
    "info",
    { dim: true }
  );
  consoleLog(
    `Total number of rejected founders: ${rejectedFounders.length}`,
    "warn",
    { dim: true }
  );
  consoleLog(
    `Numbers of founders left to enrich: ${founders.length - combinedEnrichedFounders.length - rejectedFounders.length}`,
    "debug",
    { dim: true }
  );
  consoleLog(
    `[Apollo.io] Daily requests left: ${dailyRequestLeft}\n`,
    "debug",
    {
      dim: true,
    }
  );
}

function isSimiliar(
  original: GetFoundersType,
  enriched: EnrichedFounders["data"][number]
): boolean {
  if (!enriched || !original) return false;

  // * Use a scoring system to determine confidence level
  let score = 0;
  const confident = (n: number) => n >= 2;

  // Match name
  const nameFragments = original.profile.name.split(" ");
  for (const nameFragment of nameFragments) {
    if (nameFragment === enriched.first_name) score += 1;
    if (nameFragment === enriched.last_name) score += 1;
  }
  if (confident(score)) return true;

  // Match socials URL (if matched, it's a strong indicator)
  if (original.profile.social.linkedin === enriched.linkedin_url) score += 2;
  if (original.profile.social.twitter === enriched.twitter_url) score += 2;
  if (original.profile.social.github === enriched.github_url) score += 2;
  if (confident(score)) return true;

  // Match organization name
  if (original.company.name === enriched.organization?.name) score += 1;
  else {
    for (const employment of enriched.employment_history) {
      if (employment.organization_name?.includes(original.company.name)) {
        score += 1;
        break;
      }
    }
  }
  if (confident(score)) return true;

  return false;
}
