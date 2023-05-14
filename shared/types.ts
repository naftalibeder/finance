type Account = {
  id: string;
  number: string;
  price: Price;
};

type Transaction = {
  date: string;
  accountId: string;
  payee: string;
  price: Price;
  description: string;
};

type Price = {
  amount: number;
  currency: string;
};

type ConfigBankId = "charles-schwab-bank" | "chase-bank";

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
  };
  columnMap: Record<
    keyof Transaction | "priceWithdrawal" | "priceDeposit",
    number
  >;
  skip: boolean;
};

type ConfigCredentials = {
  username: string;
  password: string;
};

type BufferChunk = {
  message: string;
  needsInput?: boolean;
};

export {
  Account,
  Transaction,
  Price,
  ConfigBankId,
  Config,
  ConfigAccount,
  ConfigCredentials,
  BufferChunk,
};
