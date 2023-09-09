import { Account, Transaction, Extraction, MfaInfo } from "shared";

export type Database = {
  user: User;
  bankCredentials: string;
  accounts: Account[];
  transactions: Transaction[];
  extractions: Extraction[];
  mfaInfos: MfaInfo[];
};

export type User = {
  email: string;
  password: string;
  devices: {
    [name: string]: {
      token: string;
      createdAt: string;
    };
  };
};
