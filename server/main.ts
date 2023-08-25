import db from "./db.js";
import router from "./router.js";

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
