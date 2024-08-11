import { Page } from "puppeteer";

type Props = {
  page: Page;
};

export async function scrollUntilPageEnd({ page }: Props) {
  console.info(`Scrolling till the end of the page...`);
  let prevScrollHeight = 0;
  let newScrollHeight = 0;
  do {
    prevScrollHeight = await page.evaluate(() => document.body.scrollHeight);

    // * Scroll to bottom of page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // * Wait for all network requests to finish
    await page.waitForNetworkIdle();

    newScrollHeight = await page.evaluate(() => document.body.scrollHeight);
  } while (newScrollHeight > prevScrollHeight);
}
