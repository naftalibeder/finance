import { ConfigAccount, Price } from "shared";

export const toPretty = (o: ConfigAccount): string => {
  return `${o.info.bankId}-${o.info.id}`;
};

// TODO: Handle "01/18/2022 as of 01/15/2022" etc.
export const toDate = (s: string): Date | undefined => {
  const date = new Date(s);
  if (isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

// TODO: Handle other currencies. Consider https://github.com/dinerojs/dinero.js.
export const toPrice = (s: string): Price | undefined => {
  const valueStr = s.replace("$", "").replace(",", "");
  const currency = "USD";

  const amount = parseFloat(valueStr);
  if (isNaN(amount)) {
    return undefined;
  }

  return {
    amount,
    currency,
  };
};

export const toYYYYMMDD = (d: Date): string => {
  return d.toLocaleDateString("en-CA");
};

export const delay = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};
