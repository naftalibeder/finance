// @ts-ignore
import { Transaction } from "shared";

export type TransactionDateGroup = {
  date: string;
  ratioAlongRange: number;
  transactions: Transaction[];
};
