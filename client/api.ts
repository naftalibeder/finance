import { SignInApiPayload } from "shared";

// @ts-ignore
const serverUrl = import.meta.env.VITE_SERVER_URL;

type DefaultArgs = Record<string, any> & SignInApiPayload;
type DefaultPayload = Record<string, any>;

export const post = async <Args = DefaultArgs, Payload = DefaultPayload>(
  path: string,
  args?: Args
): Promise<Payload> => {
  const url = `${serverUrl}/${path}`;

  const body: Partial<DefaultArgs> = { ...args };
  const deviceId = localStorage.getItem("deviceId");
  const token = localStorage.getItem("token");
  if (deviceId && token) {
    body.deviceId = deviceId;
    body.token = token;
  }

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
