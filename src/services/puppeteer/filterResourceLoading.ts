import { HTTPRequest, Page, ResourceType } from "puppeteer";

type Props = {
  page: Page;
  rule: {
    schema?: "aesthetics" | "media";
    list?: ResourceType[];
  };
};

/**
 * Blocks resource loading based on a schema or list of resource types
 */
export async function filterResourceLoading({
  page,
  rule: { schema, list },
}: Props): Promise<void> {
  if (schema === "aesthetics") {
    list = ["image", "font", "media", "stylesheet"];
  } else if (schema === "media") {
    list = ["image", "font", "media"];
  } else if (!list) {
    throw new Error("`filterResourceLoading()` requires a `list` or `schema`");
  }

  await page.setRequestInterception(true);
  page.on("request", (request: HTTPRequest) => {
    if (list.includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });
}
