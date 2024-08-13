import { HTTPRequest, Page, ResourceType } from "puppeteer";

type Props = {
  page: Page;
  rule: {
    schema?: "aesthetics";
    list?: ResourceType[];
  };
};

/**
 * Blocks resource loading based on a schema or list of resource types
 */
export function filterResourceLoading({
  page,
  rule: { schema, list },
}: Props): void {
  if (schema === "aesthetics") {
    list = ["image", "font", "media", "stylesheet", "other"];
  } else if (!list) {
    throw new Error("`filterResourceLoading()` requires a `list` or `schema`");
  }

  page.on("request", (request: HTTPRequest) => {
    if (list.includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });
}
