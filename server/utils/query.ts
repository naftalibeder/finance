import { ComparisonOperator, Filter, PriceFilter, DateFilter } from "shared";

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
