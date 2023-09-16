import db from "./db.js";
import router from "./router.js";
import { DB_SQL_PATH } from "./paths.js";

const start = async () => {
  await db.connect(DB_SQL_PATH);
  await router.start();
};

const stop = async () => {
  await db.close();
  await router.stop();
};

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

start();
