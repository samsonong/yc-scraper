import fs from "fs";
import { writeToFile } from "../../fs/writeToFile";
import { consoleLog } from "../../terminal/consoleLog";
import { GetFoundersType } from "../ycombinator.com/getFounders";
import { bulkMatchPeople } from "./api/v1/people/bulk_match/bulkMatchPeople";
import { BulkMatchResponseDto } from "./api/v1/people/bulk_match/response.dto";
import { APOLLO_IO_CONSTANTS } from "./constants";

const filePath = "output/enriched-yc-founders.json";

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
      "success",
    );
    return;
  }

  consoleLog(
    enrichedFounders.length === 0
      ? `\`${filePath}\` not found! Starting enrichment process...\n`
      : `\`${filePath}\` found with ${enrichedFounders.length} records! Continuing enrichment process...\n`,
    "info",
  );

  // * Remove founders that have already been enriched
  const foundersToProcess: GetFoundersType[] = founders.filter(
    (founder) =>
      !enrichedFounders.find(
        (enrichedFounder) =>
          enrichedFounder.linkedin_url === founder.profile.social.linkedin,
      ),
  );

  // * Enrich founders up to Apollo.io's hourly limit
  const newlyEnrichedFounders: EnrichedFounders["data"] = [];
  const {
    day: dailyLimit,
    hour: hourlyLimit,
    minute: minuteLimit,
    request: perRequestLimit,
  } = APOLLO_IO_CONSTANTS.apiRateLimit;
  let maxIterations = Math.min(hourlyLimit, foundersToProcess.length);
  let dailyRequestLeft = dailyLimit;

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

      // * Push newly enriched founders
      newlyEnrichedFounders.push(...data);
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
  });

  consoleLog(
    `Completed enrichment process. Data available in \`${filePath}\``,
    "success",
  );
  consoleLog(
    `Number of founders enriched: ${newlyEnrichedFounders.length}`,
    "info",
    { dim: true },
  );
  consoleLog(
    `Total number of enriched founders: ${combinedEnrichedFounders.length}`,
    "info",
    { dim: true },
  );
  consoleLog(
    `Numbers of founders left to enrich: ${foundersToProcess.length - newlyEnrichedFounders.length}`,
    "info",
    { dim: true },
  );
  consoleLog(`[Apollo] Daily requests left: ${dailyRequestLeft}`, "info", {
    dim: true,
  });
}
