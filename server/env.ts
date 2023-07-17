type EnvKey = "USER_PASSWORD" | "SERVER_PORT" ;

const get = (key: EnvKey): string | undefined => {
  const value = process.env[key] as string;
  if (!value || value.length === 0) {
    return undefined;
  }
  return value;
};

const set = (key: EnvKey, value: string) => {
  process.env[key] = value;
};

export default { get, set };
