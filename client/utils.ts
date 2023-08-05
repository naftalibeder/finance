// @ts-ignore
import { Price, Transaction } from "shared";
import { TransactionDateGroup } from "types";

export const prettyDate = (
  d?: Date | string,
  opts?: { includeTime?: "hr" | "hr:min" }
): string | undefined => {
  if (!d) {
    return undefined;
  }

  d = new Date(d);

  const year = d.getFullYear();
  const monthNum = d.getMonth() + 1;
  const month = monthNum < 10 ? `0${monthNum}` : monthNum;
  const dateNum = d.getDate();
  const date = dateNum < 10 ? `0${dateNum}` : dateNum;
  const hr = d.getHours();
  const hr12 = hr % 12;
  const min = d.getMinutes();
  const minStr = min < 10 ? `0${min}` : min;
  const period = hr < 12 ? "a" : "p";

  if (opts?.includeTime) {
    const time =
      opts.includeTime === "hr"
        ? `${hr12}${period}`
        : `${hr12}:${minStr}${period}`;
    return `${year}.${month}.${date} ${time}`;
  } else {
    return `${year}.${month}.${date}`;
  }
};

export const prettyTimeAgo = (s: string): string | undefined => {
  const sec = secAgo(s);
  if (!sec) {
    return undefined;
  }

  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (sec < 60) {
    return `${sec}s`;
  } else if (min < 60) {
    return `${min}m`;
  } else if (hr < 24) {
    return `${hr}h`;
  } else {
    return `${day}d`;
  }
};

export const prettyDuration = (ms: number): string => {
  const sec = Math.round(ms / 1000);
  const min = sec / 60;
  const hr = min / 60;

  if (sec < 60) {
    return `${sec}s`;
  } else if (min < 60) {
    return `${Math.floor(min)}m${sec % 60}s`;
  } else {
    return `${Math.floor(hr)}hr${min % 60}m`;
  }
};

export const prettyDurationBetweenDates = (
  start: Date | string,
  end: Date | string
): string => {
  start = new Date(start);
  end = new Date(end);
  const ms = end.valueOf() - start.valueOf();
  return prettyDuration(ms);
};

export const secAgo = (s: string): number | undefined => {
  const d = new Date(s);
  if (!d) {
    return undefined;
  }

  const msAgo = new Date().valueOf() - new Date(d).valueOf();
  return Math.round(msAgo / 1000);
};

export const datesInRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const cur = start;

  dates.push(new Date(cur.getTime()));

  while (cur.getTime() < end.getTime()) {
    cur.setDate(cur.getDate() + 1);
    dates.push(new Date(cur.getTime()));
  }

  return dates;
};

export const buildTransactionsDateGroups = (
  transactions: Transaction[],
  transactionsEarliestDate: string
): TransactionDateGroup[] => {
  const entireRangeMs =
    new Date().valueOf() - new Date(transactionsEarliestDate).valueOf();

  const list: TransactionDateGroup[] = [
    {
      date: transactionsEarliestDate,
      ratioAlongRange: 0,
      transactions: [],
    },
  ];
  let latest = list[0];

  for (let i = transactions.length - 1; i >= 0; i--) {
    const t = transactions[i];
    latest = list[list.length - 1];

    if (t.date === latest.date) {
      latest.transactions.push(t);
    } else {
      const progressRangeMs =
        new Date(t.date).valueOf() -
        new Date(transactionsEarliestDate).valueOf();
      list.push({
        date: t.date,
        ratioAlongRange: progressRangeMs / entireRangeMs,
        transactions: [t],
      });
      latest = list[list.length - 1];
    }
  }

  return list;
};

export const prettyCurrency = (p: Price) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.currency,
  }).format(p.amount);
};

export const prettyNumber = (n: number) => {
  return new Intl.NumberFormat("en-US").format(n);
};

export const titleCase = (s: string): string => {
  return s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase();
};

export const delay = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};
