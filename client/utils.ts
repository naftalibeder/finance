export const prettyDate = (s?: string): string | undefined => {
  const d = new Date(s);

  if (!d) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
};
