import express from "express";
import bodyParser from "body-parser";
import { runAccount } from "./extractor";
import { Bank, ExtractApiArgs, ExtractApiPayloadChunk } from "shared";
import { extractors } from "./extractors";

const app = express();
const port = process.env.EXTRACTOR_PORT;

const start = () => {
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  app.post("/extract", async (req, res) => {
    const args = req.body as ExtractApiArgs;
    console.log(`Running extractor for ${args.account.display}`);

    res.setHeader("Content-Type", "text/javascript");
    res.setHeader("Transfer-Encoding", "chunked");

    const sendChunk = (obj: ExtractApiPayloadChunk) => {
      res.write(JSON.stringify(obj));
    };

    await runAccount(args.account, args.bankCreds, {
      onStatusChange: (extraction) => {
        sendChunk({ extraction });
      },
      onReceiveAccountValue: (price) => {
        sendChunk({ price });
      },
      onReceiveTransactions: (transactions) => {
        sendChunk({ transactions });
      },
      onNeedMfaOption: (mfaOptions) => {
        sendChunk({ mfaOptions });
      },
      onNeedMfaCode: () => {
        sendChunk({ needMfaCode: true });
      },
      onMfaUpdate: (mfaUpdate) => {
        sendChunk({ mfaUpdate });
      },
      onMfaFinish: () => {
        sendChunk({ mfaFinish: true });
      },
    });
    res.end();
  });

  app.post("/banks", async (req, res) => {
    const banks: Bank[] = Object.values(extractors).map((o) => {
      return {
        id: o.bankId,
        displayName: o.bankDisplayName,
        displayNameShort: o.bankDisplayNameShort,
        supportedAccountKinds: o.supportedAccountKinds,
      };
    });
    res.status(200).send(JSON.stringify(banks));
  });
};

const stop = () => {
  console.log("Server stopped");
  server.close();
};

const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

export default {
  start,
  stop,
};
