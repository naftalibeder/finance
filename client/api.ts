// @ts-ignore
const serverUrl = import.meta.env.VITE_SERVER_URL;

export const post = async <
  Args = Record<string, any>,
  Payload = Record<string, any>
>(
  path: string,
  args?: Args
): Promise<Payload> => {
  const body: Record<string, any> = { ...args };
  const token = localStorage.getItem("token");
  if (token) {
    body.token = token;
  }

  const url = `${serverUrl}/${path}`;
  console.log("Request:", url, JSON.stringify(body));
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as Payload;
  const code = res.status;
  if (code !== 200) {
    throw payload["error"];
  }

  console.log("Response:", url, payload);
  return payload;
};
