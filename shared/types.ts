type Account = {
  id: string;
  number: string;
  price: Price;
  createdAt?: string;
  updatedAt?: string;
};

type Transaction = {
  date: string;
  accountId: string;
  payee: string;
  price: Price;
  description: string;
  createdAt?: string;
  updatedAt?: string;
};

type Price = {
  amount: number;
  currency: string;
};

type ConfigBankId = "charles-schwab-bank" | "chase-bank";

type Config = {
  accounts: ConfigAccount[];
  banks: Record<ConfigBankId, ConfigBank>;
  credentials: Record<ConfigBankId, ConfigCredentials>;
};

type ConfigAccount = {
  info: {
    id: string;
    bankId: ConfigBankId;
    display: string;
    number: string;
    type: "assets" | "liabilities" | "equity" | "revenue" | "expenses";
  };
  columnMap: Record<
    | keyof Omit<Transaction, "createdAt" | "updatedAt">
    | "priceWithdrawal"
    | "priceDeposit",
    number
  >;
  skip: boolean;
};

type ConfigBank = {
  exportRangeMonths: number;
};

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
  Transaction,
  Price,
  ConfigBankId,
  Config,
  ConfigAccount,
  ConfigBank,
  ConfigCredentials,
  MfaInfo,
  ExtractionStatus,
};
