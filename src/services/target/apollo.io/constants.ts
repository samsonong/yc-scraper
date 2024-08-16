import { config } from "@dotenvx/dotenvx";

config();

export const APOLLO_IO_CONSTANTS = {
  apiRateLimit: {
    day: 600,
    hour: 200,
    minute: 50,
    request: 10,
  },
  apiKey: process.env.APOLLO_IO_API_KEY,
};
