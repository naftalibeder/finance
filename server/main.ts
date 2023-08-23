import db from "./db";
import router from "./router";

const start = async () => {
  db.migrate();
  router.start();
};

const stop = () => {
  router.stop();
};

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

start();
