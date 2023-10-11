import { UUID } from "crypto";

export type Device = {
  _id: UUID;
  _createdAt: string;
  token: string;
};
