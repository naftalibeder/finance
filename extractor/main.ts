import router from "./router";

const start = async () => {
  router.start();
};

const stop = () => {
  router.stop();
};

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

start();
