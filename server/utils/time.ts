export const delay = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};

export const nextOccurrenceOfTime = (args: {
  from: Date;
  toHr: number;
  toMin: number;
}): Date => {
  const { from, toHr, toMin } = args;

  let target = new Date(from);
  target.setHours(toHr, toMin, 0, 0);

  if (target.getTime() < from.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target;
};
