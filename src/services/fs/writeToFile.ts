import fs from "fs";
import { consoleLog } from "../terminal/consoleLog";
import { removeUnusualLineTerminator } from "./removeUnusualLineTerminator";
import { chalk } from "../chalk/chalk";
type Props = {
  prettyName: string;
  filePath: string;
  data: unknown;
  writeRaw?: true;
};

export function writeToFile({ prettyName, filePath, data, writeRaw }: Props) {
  // * If filePath does not start with `output/`, prepend it
  if (!filePath.startsWith("output/")) {
    filePath = `output/${filePath}`;
  }

  // * If `output` folder does not exist, create it
  if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
  }

  function replacer(key: string, value: unknown) {
    if (typeof value === "string") {
      return removeUnusualLineTerminator(value);
    }
    return value;
  }
  fs.writeFile(
    filePath,
    writeRaw ? (data as string) : JSON.stringify(data, replacer, 2),
    (err) => {
      if (err) {
        throw new Error(`Error writing file: ${err}`);
      } else {
        consoleLog(
          `List of ${prettyName} available in ${chalk(filePath, "link")}\n`,
          "success"
        );
      }
    }
  );
}
