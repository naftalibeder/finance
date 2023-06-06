// TODO: Fix this error if possible.
// @ts-ignore
import { Price, Transaction } from "shared";
import { TransactionsByDate } from "types";

export const prettyDate = (
  o?: Date | string,
  opts?: { includeTime?: boolean }
): string | undefined => {
  if (!o) {
    return undefined;
  }

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

export const buildTransactionsByDateArray = (
  transactions: Transaction[],
  transactionsEarliestDate: string
): {
  byDate: TransactionsByDate[];
  maxCtOnDate: number;
} => {
  const byDate: TransactionsByDate[] = [
    {
      date: transactionsEarliestDate,
      transactions: [],
    },
  ];
  let maxCtOnDate = 0;
  let latest = byDate[0];

  if (transactions.length > 0) {
    for (let i = transactions.length - 1; i >= 0; i--) {
      const t = transactions[i];
      latest = byDate[byDate.length - 1];

      if (t.date === latest.date) {
        latest.transactions.push(t);
      } else {
        const datesUntilCurrent = datesInRange(
          new Date(latest.date),
          new Date(t.date)
        );
        for (const d of datesUntilCurrent) {
          byDate.push({
            date: d.toISOString(),
            transactions: [],
          });
        }
        latest = byDate[byDate.length - 1];
        latest.transactions.push(t);
      }

      latest = byDate[byDate.length - 1];
      if (latest.transactions.length > maxCtOnDate) {
        maxCtOnDate = latest.transactions.length;
      }
    }

    const datesUntilNow = datesInRange(new Date(latest.date), new Date());
    for (const d of datesUntilNow) {
      byDate.push({
        date: d.toISOString(),
        transactions: [],
      });
    }
  }

  return {
    byDate,
    maxCtOnDate,
  };
};

export const prettyCurrency = (a: Price) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: a.currency,
  }).format(a.amount);
};
