import { ConsoleMessage, Page } from "puppeteer";
import { consoleLog } from "../terminal/consoleLog";

type Props = {
  page: Page;
};

/**
 * Blocks resource loading based on a schema or list of resource types
 */
export function bubblePageLogs({ page }: Props): void {
  page.on("console", (msg: ConsoleMessage) => {
    consoleLog(`PAGE LOG: "${msg.text()}"`, undefined, "dim");
  });
}
