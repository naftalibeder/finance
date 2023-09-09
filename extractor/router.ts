import express from "express";
import bodyParser from "body-parser";
import { Server } from "http";
import {
  Bank,
  ExtractApiArgs,
  ExtractApiPayloadChunk,
  GetBanksApiPayload,
} from "shared";
import { runAccount } from "./extractor.js";
import { extractors } from "./extractors/index.js";

const expressApp = express();
let expressServer: Server | undefined;
const port = process.env.EXTRACTOR_PORT;

const start = () => {
  expressApp.use(bodyParser.json());
  expressApp.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  expressApp.post("/extract", async (req, res) => {
    const args = req.body as ExtractApiArgs;
    console.log(`Running extractor for ${args.account.display}`);

    res.setHeader("Content-Type", "text/javascript");
    res.setHeader("Transfer-Encoding", "chunked");

    const sendChunk = async (obj: ExtractApiPayloadChunk) => {
      res.write(JSON.stringify(obj));
    };

    try {
      await runAccount(args.account, args.bankCreds, (event) => {
        const { message, ...rest } = event;
        if (message) {
          const { account } = args;
          const { message } = event;
          console.log(`${account.display} | ${account.bankId} | ${message}`);
        }

        if (Object.keys(rest).length > 0) {
          sendChunk(rest);
        }
      });
    } catch (e) {
      console.log("Error running extractor:", e);
      res.end();
      return;
    }

    res.end();
  });

  expressApp.post("/banks", async (req, res) => {
    const banks: Bank[] = Object.values(extractors).map((o) => {
      return {
        id: o.bankId,
        displayName: o.bankDisplayName,
        displayNameShort: o.bankDisplayNameShort,
        supportedAccountKinds: o.supportedAccountKinds,
      };
    });
    const payload: GetBanksApiPayload = {
      data: {
        banks,
      },
    };
    res.status(200).send(payload);
  });

  expressServer = expressApp.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

const stop = () => {
  expressServer?.close();
};

export default {
  start,
  stop,
};
