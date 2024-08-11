import puppeteer from "puppeteer";
import { getYcBatches } from "./services/getYcBatches";

(async () => {
  const browser = await puppeteer.launch();

  const batchNumbers = await getYcBatches({ browser });
  console.log(batchNumbers);

  await browser.close();
})();
