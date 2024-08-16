import { z } from "zod";

export type BulkMatchRequestDto = {
  reveal_personal_emails?: boolean;
  reveal_phone_number?: boolean;
  webhook_url?: string;
  details: People[];
};

type People = {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  hashed_email?: string;
  organization_name?: string;
  domain?: string;
  id?: string;
  linkedin_url?: string;
};

export const BulkMatchRequestDtoSchema = z.object({
  reveal_personal_emails: z.boolean().optional(), // Must be boolean
  reveal_phone_number: z.boolean().optional(), // Must be boolean
  webhook_url: z.string().url("Must be a valid URL").optional(), // Valid URL for webhook
  details: z.array(
    z.object({
      first_name: z.string().min(1).max(50).optional(), // At least 1 character, up to 50
      last_name: z.string().min(1).max(50).optional(), // At least 1 character, up to 50
      name: z.string().min(1).max(100).optional(), // At least 1 character, up to 100
      email: z.string().email().optional(), // Must be a valid email
      hashed_email: z
        .string()
        .regex(
          /^[a-f0-9]{32}$|^[a-f0-9]{64}$/,
          "Must be a valid MD5 or SHA256 hash",
        )
        .optional(), // Valid MD5 (32 chars) or SHA256 (64 chars) hash
      organization_name: z.string().min(1).max(100).optional(), // At least 1 character, up to 100
      domain: z
        .string()
        .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain")
        .optional(), // Domain format validation
      id: z.string().uuid("Invalid ID format").optional(), // Must be a valid UUID
      linkedin_url: z.string().url("Must be a valid URL").optional(), // Valid URL for LinkedIn
    }),
  ), // Array of People objects
});
