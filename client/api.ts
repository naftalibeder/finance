// @ts-ignore
const serverUrl = import.meta.env.VITE_SERVER_URL;

export const post = async <Payload, Args = undefined>(
  path: string,
  args?: Args
): Promise<Payload> => {
  const body = new URLSearchParams();
  if (args) {
    Object.entries(args).forEach(([k, v]) => {
      body.set(k, v);
    });
  }
  const token = localStorage.getItem("token");
  if (token) {
    body.set("token", token);
  }

  const url = `${serverUrl}/${path}`;
  console.log("Request:", url, body.toString());
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = (await res.json()) as Payload;
  const code = res.status;
  if (code !== 200) {
    throw payload["error"];
  }

  console.log("Response:", url, payload);
  return payload;
};
