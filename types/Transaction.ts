export type Transaction = {
  date: string;
  account: string;
  payee: string;
  price: {
    amount: number;
    currency: string;
  };
  description: string;
};
