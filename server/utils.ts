import { ConfigAccount, Price } from "shared";

export const prettyConfigAccount = (o: ConfigAccount): string => {
  return `${o.bankId}-${o.id}`;
};

// TODO: Handle "01/18/2022 as of 01/15/2022" etc.
export const toDate = (s: string): Date | undefined => {
  const date = new Date(s);
  if (isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

export const prettyDate = (
  o: Date | string,
  opts?: { includeTime?: boolean }
): string | undefined => {
  let d: Date;
  if (typeof o === "string") {
    try {
      d = new Date(o);
    } catch (e) {
      return undefined;
    }
  } else {
    d = o;
  }

  const year = d.getFullYear();
  const monthNum = d.getMonth() + 1;
  const month = monthNum < 10 ? `0${monthNum}` : monthNum;
  const dateNum = d.getDate();
  const date = dateNum < 10 ? `0${dateNum}` : dateNum;
  const hours = d.getHours();
  const hours12 = hours % 12;
  const period = hours < 12 ? "a" : "p";

  if (opts?.includeTime) {
    return `${year}.${month}.${date} ${hours12}${period}`;
  } else {
    return `${year}.${month}.${date}`;
  }
};

export const prettyDuration = (ms: number): string | undefined => {
  const sec = Math.round(ms / 1000);
  const min = sec / 60;
  const hr = min / 60;

  if (sec < 60) {
    return `${sec}s`;
  } else if (min < 60) {
    return `${Math.floor(min)}m${sec % 60}s`;
  }
};

// TODO: Handle other currencies. Consider https://github.com/dinerojs/dinero.js.
export const toPrice = (s: string): Price => {
  const valueStr = s.replace("$", "").replace(",", "");
  const currency = "USD";

  const amount = parseFloat(valueStr);
  if (isNaN(amount)) {
    throw `${s} cannot be parsed to a valid number`;
  }

  return {
    amount,
    currency,
  };
};

export const delay = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};
