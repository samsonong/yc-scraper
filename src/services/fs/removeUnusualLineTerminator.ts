export function removeUnusualLineTerminator(string: string) {
  return string.replace(/\u2028/g, "").replace(/\u2029/g, "");
}
