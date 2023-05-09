import express from "express";

const main = async () => {
  const port = process.env.CLIENT_PORT;

  const app = express();

  app.use(express.static("./dist"));

  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

main();
