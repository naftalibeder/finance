// TODO: Fix this error if possible.
// @ts-ignore
import { Transaction } from "shared";

export type TransactionsByDate = {
  date: string;
  ratioAlongRange: number;
  transactions: Transaction[];
};
