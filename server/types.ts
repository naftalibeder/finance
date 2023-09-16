import { UUID } from "crypto";

export type User = {
  _id: UUID;
  email: string;
  password: string;
  bankCredentials: string;
};

export type Device = {
  _id: UUID;
  _createdAt: string;
  token: string;
};
