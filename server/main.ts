import db from "./db";
import extractor from "./extractor";
import router from "./router";

const start = async () => {
  db.migrate();
  router.start();
  extractor.schedule();
};

const stop = () => {
  router.stop();
  extractor.unschedule();
};

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

start();
