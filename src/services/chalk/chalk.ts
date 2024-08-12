import c, { Chalk } from "chalk";

type Types = "link";
export type ConsoleLevels = "error" | "warn" | "debug" | "info" | "success";

export function chalk(
  string: string,
  type: Types | ConsoleLevels,
  dim?: boolean
) {
  let formatter: Chalk;

  switch (type) {
    // * ConsoleLevels
    case "debug":
      formatter = c.gray;
      break;
    case "info":
      formatter = c.blue;
      break;
    case "success":
      formatter = c.green;
      break;
    case "warn":
      formatter = c.yellow;
      break;
    case "error":
      formatter = c.red;
      break;

    // * Other utility types
    case "link":
      formatter = c.underline.blue;
      break;
  }

  if (dim) return formatter.dim(string);
  return formatter(string);
}
