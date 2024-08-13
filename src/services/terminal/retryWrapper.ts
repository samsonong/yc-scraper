export async function retryWrapper<T>(
  fn: () => Promise<T>,
  retries = 3,
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (retries <= 0) throw err;
    return retryWrapper(fn, retries - 1);
  }
}
