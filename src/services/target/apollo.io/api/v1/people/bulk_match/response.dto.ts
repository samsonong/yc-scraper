export type BulkMatchResponseDto = {
  data: Match[];

  // Rate limit fields from header
  daily_requests_left: number;
  hourly_requests_left: number;
  minute_requests_left: number;
};

export type BulkMatchRawResponseDto = {
  status: string;
  error_code: string | null;
  error_message: string | null;
  total_requested_enrichments: number;
  unique_enriched_records: number;
  missing_records: number;
  credits_consumed: number;
  matches: Match[];
};

type EmploymentHistory = {
  _id: string;
  created_at: string | null;
  current: boolean;
  degree: string | null;
  description: string | null;
  emails: string | null;
  end_date: string | null;
  grade_level: string | null;
  kind: string | null;
  major: string | null;
  organization_id: string | null;
  organization_name: string;
  raw_address: string | null;
  start_date: string;
  title: string;
  updated_at: string | null;
  id: string;
  key: string;
};

type Organization = {
  id: string;
  name: string;
  website_url: string | null;
  blog_url: string | null;
  angellist_url: string | null;
  linkedin_url: string;
  twitter_url: string | null;
  facebook_url: string | null;
  primary_phone: {
    number: string;
    source: string;
    country_code_added_from_hq: boolean;
  } | null;
  languages: string[];
  alexa_ranking: number | null;
  phone: string | null;
  linkedin_uid: string | null;
  founded_year: number | null;
  publicly_traded_symbol: string | null;
  publicly_traded_exchange: string | null;
  logo_url: string | null;
  crunchbase_url: string | null;
  primary_domain: string | null;
  industry: string | null;
  keywords: string[];
  estimated_num_employees: number | null;
  industries: string[];
  secondary_industries: string[];
  snippets_loaded: boolean;
  industry_tag_id: string | null;
  industry_tag_hash: Record<string, string>;
  retail_location_count: number | null;
  raw_address: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

type PhoneNumber = {
  raw_number: string;
  sanitized_number: string;
  type: string;
  position: number;
  status: string;
  dnc_status: string | null;
  dnc_other_info: string | null;
};

type Match = {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url: string;
  title: string;
  email_status: string | null;
  photo_url: string;
  twitter_url: string | null;
  github_url: string | null;
  facebook_url: string | null;
  extrapolated_email_confidence: string | null;
  headline: string;
  email: string;
  organization_id: string;
  employment_history: EmploymentHistory[];
  state: string;
  city: string;
  country: string;
  organization: Organization;
  account_id: string;
  account: Organization;
  phone_numbers: PhoneNumber[];
  intent_strength: string | null;
  show_intent: boolean;
  revealed_for_current_team: boolean;
  hashed_email: string;
  personal_emails: string[];
  departments: string[];
  subdepartments: string[];
  functions: string[];
  seniority: string;
};
