import fs from "fs";
import { removeUnusualLineTerminator } from "./removeUnusualLineTerminator";
type Props = {
  filePath: string;
  data: unknown;
};

export function writeToFile({ filePath, data }: Props) {
  // * If filePath does not start with `output/`, prepend it
  if (!filePath.startsWith("output/")) {
    filePath = `output/${filePath}`;
  }

  function replacer(key: string, value: unknown) {
    if (typeof value === "string") {
      return removeUnusualLineTerminator(value);
    }
    return value;
  }
  fs.writeFile(filePath, JSON.stringify(data, replacer, 2), (err) => {
    if (err) {
      throw new Error(`Error writing file: ${err}`);
    } else {
      console.info("List of YC companies available in `yc-companies.json`");
    }
  });
}
