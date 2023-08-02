import db from "./db";
import router from "./router";

const main = async () => {
  db.migrate();
  router.start();
};

main();
