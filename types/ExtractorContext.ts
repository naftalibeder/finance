import { BankName, Transaction } from ".";

export type ExtractorContext = {
  bank: BankName;
  username: string;
  password: string;
  account: string;
  deleteRows: number[];
  columnMap: Record<keyof Transaction, number>;
};
