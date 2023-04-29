import { BankSlug, ExtractorAccount, ExtractorCredentials } from ".";

export type Config = {
  accounts: ExtractorAccount[];
  credentials: Record<BankSlug, ExtractorCredentials>;
};
