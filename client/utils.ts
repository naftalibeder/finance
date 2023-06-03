// TODO: Fix this error if possible.
// @ts-ignore
import { Price } from "shared";

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

export const secAgo = (s: string): number | undefined => {
  const d = new Date(s);
  if (!d) {
    return undefined;
  }

  const msAgo = new Date().valueOf() - new Date(d).valueOf();
  return msAgo / 1000;
};

export const daysBetweenDates = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const cur = start;

  dates.push(new Date(cur.getTime()));

  while (cur.getTime() < end.getTime()) {
    cur.setDate(cur.getDate() + 1);
    dates.push(new Date(cur.getTime()));
  }

  return dates;
};

export const prettyCurrency = (a: Price) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: a.currency,
  }).format(a.amount);
};
