import { UUID } from "crypto";

/** Well, a user. */
export type User = {
  _id: UUID;
  email: string;
  password: string;
  bankCredentials: string;
};

/** A universal description of a bank, unrelated to any particular user. */
export type Bank = {
  id: string;
  displayName: string;
  displayNameShort: string;
  supportedAccountKinds: Account["kind"][];
};

/** A dictionary mapping bank id to bank credentials. */
export type BankCredsMap = Record<string, BankCreds>;

/** Credentials for authenticating with a bank. */
export type BankCreds = {
  username: string;
  password: string;
};

/** An account for a specific user at a bank. */
export type Account = {
  /** A globally unique id representing the account internally. */
  _id: UUID;
  _createdAt: string;
  _updatedAt: string;
  /** A unique id that matches one of the available extractors. */
  bankId: string;
  /** The display name or nickname of the account. */
  display: string;
  /** The account number. */
  number: string;
  /** The purpose of the account, e.g. checking, brokerage, etc. */
  kind:
    | "checking"
    | "savings"
    | "brokerage"
    | "credit"
    | "debit"
    | "unselected";
  /** The type of resource stored in the account. */
  type: "assets" | "liabilities" | "equity" | "revenue" | "expenses";
  /** The user's preferred mode for receiving multi-factor codes. */
  preferredMfaOption: MfaOption;
  /** The current value of the account's assets. */
  price: Price;
};

export type MfaOption = "sms" | "email";

/** A unique transaction. */
export type Transaction = {
  /** A globally unique id representing the transaction internally. */
  _id: UUID;
  _createdAt: string;
  _updatedAt: string;
  date: string;
  postDate: string;
  accountId: Account["_id"];
  payee: string;
  price: Price;
  type: string;
  description: string;
  memo: string;
};

/** An amount of money in a specific currency. */
export type Price = {
  amount: number;
  currency: "USD";
};

export type MfaInfo = {
  bankId: string;
  code?: string;
  requestedAt: string;
};

/** Information about the extraction for a single account. */
export type Extraction = {
  _id: UUID;
  accountId: UUID;
  queuedAt: string;
  startedAt?: string;
  updatedAt?: string;
  finishedAt?: string;
  foundCt: number;
  addCt: number;
  error?: string;
};

export interface TextFilter {
  readonly type: "text";
  text: string;
}

export type ComparisonOperator = "lt" | "lte" | "gt" | "gte" | "eq";

export interface ComparisonFilter<T> {
  readonly type: "comparison";
  operator: ComparisonOperator;
  value: T;
}

export interface DateFilter extends ComparisonFilter<Date> {
  readonly valueType: "date";
}

export interface PriceFilter extends ComparisonFilter<Price> {
  readonly valueType: "price";
}

export type Filter = TextFilter | PriceFilter | DateFilter;

export type PaginationApiPayload = {
  page: number;
  pageItemCt: number;
  pageItemMaxCt: number;
  totalItemCt: number;
  totalPageCt: number;
};

export type GetUserApiPayload = {
  data: {
    user: User;
  };
};

export type SignInApiArgs = {
  email: string;
  password: string;
};

export type SignInApiPayload = {
  deviceId: string;
  token: string;
};

export type VerifyDeviceApiArgs = {
  deviceId: string;
  token: string;
};

export type GetBanksApiPayload = {
  data: {
    banks: Bank[];
    credsExistMap: Record<string, boolean>;
  };
};

export type UpdateBankCredsApiArgs = BankCreds & {
  bankId: string;
};

export type DeleteBankCredsApiArgs = {
  bankId: string;
};

export type GetAccountsApiPayload = {
  data: {
    accounts: Account[];
    sum: Price;
  };
};

export type CreateAccountApiPayload = {
  data: {
    account: Account;
  };
};

export type UpdateAccountApiArgs = {
  account: Omit<Account, "_pending" | "_createdAt" | "_updatedAt" | "price">;
};

export type UpdateAccountApiPayload = {
  data: {
    account?: Account;
  };
};

export type DeleteAccountApiArgs = {
  accountId: UUID;
};

export type GetTransactionsApiArgs = {
  query: string;
  page: number;
};

export type GetTransactionsApiPayload = {
  data: {
    items: Transaction[];
    itemsSum: Price;
    totalSum: Price;
    totalMax: Price;
  };
  pagination: PaginationApiPayload;
};

export type ExtractApiArgs = {
  account: Account;
  bankCreds: BankCreds;
};

export type ExtractApiPayloadChunk = {
  message?: string;
  extraction?: Partial<Extraction>;
  price?: Price;
  transactions?: Transaction[];
  needMfaCode?: boolean;
  mfaFinish?: boolean;
};

export type GetExtractionsApiPayload = {
  data: {
    extractions: Extraction[];
  };
};

export type GetExtractionsUnfinishedApiPayload = {
  data: {
    extractions: Extraction[];
  };
};

export type AddExtractionsApiArgs = {
  accountIds: UUID[];
};

export type GetMfaInfoApiPayload = {
  data: {
    mfaInfos: MfaInfo[];
  };
};

export type SetMfaInfoApiArgs = {
  bankId: string;
  option?: string;
  code?: string;
};

export type GetExtractorBanksApiPayload = {
  data: {
    banks: Bank[];
  };
};
