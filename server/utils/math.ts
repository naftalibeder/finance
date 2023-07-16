import { Transaction, Price } from "shared";

export const transactionsSumPrice = (transactions: Transaction[]): Price => {
  if (transactions.length === 0) {
    return {
      amount: 0,
      currency: "USD",
    };
  }

  const sum = transactions.reduce((a, c) => a + c.price.amount, 0);
  const currency = transactions[0].price.currency;

  return {
    amount: sum,
    currency,
  };
};

export const transactionsMaxPrice = (transactions: Transaction[]): Price => {
  if (transactions.length === 0) {
    return {
      amount: 0,
      currency: "USD",
    };
  }

  const max = transactions.reduce((a, c) => {
    const amount = Math.abs(c.price.amount);
    return a > amount ? a : amount;
  }, 0);
  const currency = transactions[0].price.currency;

  return {
    amount: max,
    currency,
  };
};

export const transactionsEarliestDate = (transactions: Transaction[]): string | undefined => {
  return transactions.length > 0 ? transactions[transactions.length - 1].date : undefined;
}
