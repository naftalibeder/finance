import express from "express";
import extractor from "./extractor";
import { renderHome } from "./client";

const main = async () => {
  const app = express();
  const port = 3000;

  app.get("/", (req, res) => {
    const view = renderHome();
    res.send(view);
  });

  app.post("/extract", async (req, res) => {
    await extractor.run();
    res.send("Extraction complete.");
  });

  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

main();
