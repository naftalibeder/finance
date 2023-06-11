import {
  Account,
  ComparisonOperator,
  DateFilter,
  Filter,
  Price,
  PriceFilter,
  Transaction,
} from "shared";

const comparisonOperatorMap: Record<string, ComparisonOperator> = {
  "<": "lt",
  "<=": "lte",
  ">": "gt",
  ">=": "gte",
  "=": "eq",
};

export const buildFiltersFromQuery = (query: string): Filter[] => {
  let filters: Filter[] = [];
  const queryParts = query.toLowerCase().split(" ");
  for (const p of queryParts) {
    const priceRangeResult = /^(\d+\.?\d*)-(\d+\.?\d*)/.exec(p);
    const priceComparisonResult = /^(>|>=|<|<=|=|~?)(\d+(\.\d+)?)$/.exec(p);
    const dateComparisonResult =
      /^(>|>=|<|<=|=|~?)(\d{4}\/\d{1,2}(\/\d{1,2})?)/.exec(p);
    const textResult = /^[a-zZA-Z0-9]+/.exec(p);

    if (priceRangeResult) {
      const [, lower, upper] = priceRangeResult;
      const amountLower = parseFloat(lower);
      const amountUpper = parseFloat(upper);
      const filterLower: PriceFilter = {
        type: "comparison",
        valueType: "price",
        operator: "gt",
        value: {
          amount: amountLower,
          currency: "USD",
        },
      };
      const filterUpper: PriceFilter = {
        type: "comparison",
        valueType: "price",
        operator: "lt",
        value: {
          amount: amountUpper,
          currency: "USD",
        },
      };
      filters.push(filterLower, filterUpper);
    } else if (priceComparisonResult) {
      const [, operatorStr, amountStr] = priceComparisonResult;
      const amount = parseFloat(amountStr);
      if (operatorStr === "~") {
        const filterLower: PriceFilter = {
          type: "comparison",
          valueType: "price",
          operator: "gt",
          value: {
            amount: amount * 0.95,
            currency: "USD",
          },
        };
        const filterUpper: PriceFilter = {
          type: "comparison",
          valueType: "price",
          operator: "lt",
          value: {
            amount: amount * 1.05,
            currency: "USD",
          },
        };
        filters.push(filterLower, filterUpper);
      } else {
        const filter: PriceFilter = {
          type: "comparison",
          valueType: "price",
          operator: comparisonOperatorMap[operatorStr],
          value: {
            amount: amount,
            currency: "USD",
          },
        };
        filters.push(filter);
      }
    } else if (dateComparisonResult) {
      const [, operatorStr, dateStr] = dateComparisonResult;
      const date = new Date(dateStr);
      const filter: DateFilter = {
        type: "comparison",
        valueType: "date",
        operator: comparisonOperatorMap[operatorStr],
        value: date,
      };
      filters.push(filter);
    } else if (textResult) {
      filters.push({
        type: "text",
        text: textResult[0],
      });
    }
  }

  return filters;
};

export const transactionMatchesFilters = (
  t: Transaction,
  filters: Filter[]
): boolean => {
  let isMatch = true;

  for (const f of filters) {
    switch (f.type) {
      case "text":
        const area = [t.payee, t.description, t.type, t.price.amount]
          .join(" ")
          .toLowerCase();
        if (!area.includes(f.text)) {
          isMatch = false;
        }
        break;
      case "comparison": {
        let transactionValue: number = 0;
        let filterValue: number = 0;
        if (f.valueType === "price") {
          transactionValue = Math.abs(t.price.amount);
          filterValue = Math.abs(f.value.amount);
        } else if (f.valueType === "date") {
          transactionValue = new Date(t.date).valueOf();
          filterValue = f.value.valueOf();
        }
        switch (f.operator) {
          case "lt":
            if (!(transactionValue < filterValue)) {
              isMatch = false;
            }
            break;
          case "lte":
            if (!(transactionValue <= filterValue)) {
              isMatch = false;
            }
            break;
          case "gt":
            if (!(transactionValue > filterValue)) {
              isMatch = false;
            }
            break;
          case "gte":
            if (!(transactionValue >= filterValue)) {
              isMatch = false;
            }
            ``;
            break;
          case "eq":
            if (transactionValue !== filterValue) {
              isMatch = false;
            }
            break;
        }
        break;
      }
    }
  }

  return isMatch;
};

export const prettyAccount = (o: Account): string => {
  return `${o.bankId}-${o._id}`;
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

export const delay = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};
