import { consoleLog } from "../../../../../../terminal/consoleLog";
import { APOLLO_IO_CONSTANTS } from "../../../../constants";
import { BulkMatchRequestDto, BulkMatchRequestDtoSchema } from "./request.dto";
import { BulkMatchRawResponseDto, BulkMatchResponseDto } from "./response.dto";

const url = new URL("https://api.apollo.io/api/v1/people/bulk_match");
const xApiKey = APOLLO_IO_CONSTANTS.apiKey;

export async function bulkMatchPeople(
  props: BulkMatchRequestDto & { silent?: boolean },
): Promise<BulkMatchResponseDto> {
  if (!xApiKey) {
    throw new Error("Check if you've added `APOLLO_API_KEY` in `.env`");
  }

  if (
    props.details.length <= 0 ||
    props.details
      .map((p) => Object.values(p).some((v) => v !== undefined))
      .includes(false)
  ) {
    throw new Error("You trying to invoke a spirit or something?");
  }

  const { silent, ...body } = props;

  const validatedBody = BulkMatchRequestDtoSchema.parse(body);

  const init: RequestInit = {
    method: "post",
    body: JSON.stringify(validatedBody),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": xApiKey,
    },
  };

  const response: Response = await fetch(url, init);
  const responseData = (await response.json()) as BulkMatchRawResponseDto;
  const daily_requests_left = Number.parseInt(
    // Not critical, so default to -1
    response.headers.get("x-24-hour-requests-left") || "-1",
  );
  const hourly_requests_left = Number.parseInt(
    // Not critical, so default to -1
    response.headers.get("x-hourly-requests-left") || "-1",
  );
  const minute_requests_left = Number.parseInt(
    // Not critical, so default to -1
    response.headers.get("x-minute-requests-left") || "-1",
  );

  if (responseData.status !== "success") {
    const error = `POST ${responseData.error_code}:  ${responseData.error_message}`;
    consoleLog(error, "error");
    throw new Error(error);
  }

  const {
    total_requested_enrichments,
    unique_enriched_records,
    credits_consumed,
    matches,
  } = responseData;

  consoleLog(
    `${unique_enriched_records}/${total_requested_enrichments} enriched. ${credits_consumed} credits consumed.`,
    "info",
    { dim: true, silent },
  );
  consoleLog(
    `${daily_requests_left}/${hourly_requests_left}/${minute_requests_left} credits left this day/hour/minute`,
    "info",
    { dim: true, silent },
  );

  return {
    daily_requests_left,
    hourly_requests_left,
    minute_requests_left,
    data: matches,
  };
}
