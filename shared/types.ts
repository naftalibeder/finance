type Account = {
  id: string;
  number: string;
  kind: AccountKind;
  type: AccountType;
  price: Price;
  meta?: {
    createdAt: string;
    updatedAt: string;
  };
};

type AccountKind = "checking" | "savings" | "brokerage" | "credit" | "debit";

type AccountType = "assets" | "liabilities" | "equity" | "revenue" | "expenses";

type Transaction = {
  date: string;
  postDate: string;
  accountId: string;
  payee: string;
  price: Price;
  type: string;
  description: string;
  meta?: {
    createdAt: string;
    updatedAt: string;
  };
};

type Price = {
  amount: number;
  currency: string;
};

type Config = {
  accounts: ConfigAccount[];
  credentials: Record<ConfigBankId, ConfigCredentials>;
};

type ConfigAccount = {
  info: {
    id: string;
    bankId: ConfigBankId;
    display: string;
    number: string;
    kind: AccountKind;
    type: AccountType;
  };
  skip: boolean;
};

type ConfigBankId = "charles-schwab-bank" | "chase-bank";

type ConfigCredentials = {
  username: string;
  password: string;
};

type MfaInfo = {
  bankId: ConfigBankId;
  code?: string;
  requestedAt: string;
};

type ExtractionStatus = {
  status: "idle" | "set-up" | "run-extractor" | "wait-for-mfa" | "tear-down";
  accountId?: string;
  mfaInfos: MfaInfo[];
};

export {
  Account,
  AccountKind,
  AccountType,
  Transaction,
  Price,
  Config,
  ConfigAccount,
  ConfigBankId,
  ConfigCredentials,
  MfaInfo,
  ExtractionStatus,
};
