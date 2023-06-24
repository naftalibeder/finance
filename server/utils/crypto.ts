import crypto from "crypto";

const algorithm = "aes-256-cbc";
const algorithmRequiredKeyLen = 32;

const initVec = Buffer.alloc(16).fill("0");
const passwordHashSalt = "abcde";

const hashFromPassword = (password: string): Buffer => {
  return crypto.scryptSync(password, passwordHashSalt, algorithmRequiredKeyLen);
};

export const decrypt = (str: string, password: string): string => {
  const hash = hashFromPassword(password);
  const decipher = crypto.createDecipheriv(algorithm, hash, initVec);
  let decryptedData = decipher.update(str, "hex", "utf8");
  decryptedData += decipher.final("utf8");
  return decryptedData;
};

export const encrypt = (str: string, password: string): string => {
  const hash = hashFromPassword(password);
  const cipher = crypto.createCipheriv(algorithm, hash, initVec);
  let encryptedData = cipher.update(str, "utf8", "hex");
  encryptedData += cipher.final("hex");
  return encryptedData;
};
