import got from "got";
import { ExtractApiArgs, ExtractApiPayloadChunk } from "shared";
import db from "./db.js";

export const extractAllPending = async () => {
  const pendingExtractions = await db.getExtractionsPending();
  if (pendingExtractions.length === 0) {
    throw "No pending extractions found";
  }

  const promises: Promise<void>[] = [];

  for (const pendingExtraction of pendingExtractions) {
    const promise = new Promise<void>(async (res, rej) => {
      const extractionId = pendingExtraction._id;
      const accountId = pendingExtraction.accountId;
      const account = await db.getAccount(accountId);
      if (!account) {
        rej(`No account found with id ${accountId}`);
        return;
      }

      console.log(`Starting extraction for account ${account.display}`);

      await db.updateExtraction(extractionId, {
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const bankCreds = await db.getBankCreds(
        account.bankId,
        process.env.USER_PASSWORD
      );
      const args: ExtractApiArgs = {
        account,
        bankCreds,
      };

      const url = `${process.env.EXTRACTOR_URL_LOCALHOST}/extract`;
      const stream = got.stream(url, { method: "POST", json: args });

      const decoder = new TextDecoder("utf8");
      let buffer = "";
      stream.on("data", async (d) => {
        let chunk: ExtractApiPayloadChunk;
        try {
          buffer += decoder.decode(d);
          chunk = JSON.parse(buffer);
          buffer = "";
          console.log("Received chunk:", Object.keys(chunk));
        } catch (e) {
          console.log("Error decoding progress chunk from extractor");
          return;
        }

        if (chunk.extraction) {
          console.log(
            "Received extraction update:",
            Object.keys(chunk.extraction)
          );
          try {
            await db.updateExtraction(extractionId, chunk.extraction);
          } catch (e) {
            console.log(`Error updating extraction: ${e}`);
          }
        }

        if (chunk.price) {
          console.log("Received account update:", Object.keys(chunk.price));
          await db.updateAccount(account._id, {
            ...account,
            price: chunk.price,
          });
          await db.updateExtraction(extractionId, {
            updatedAt: new Date().toISOString(),
          });
        }

        if (chunk.transactions) {
          const foundCt = chunk.transactions.length;
          const addCt = await db.addTransactions(chunk.transactions);
          console.log(
            `Received transactions update: ${foundCt} total, ${addCt} new`
          );
          const extraction = await db.getExtraction(extractionId);
          await db.updateExtraction(extractionId, {
            foundCt: (extraction?.foundCt ?? 0) + foundCt,
            addCt: (extraction?.addCt ?? 0) + addCt,
            updatedAt: new Date().toISOString(),
          });
        }

        if (chunk.needMfaCode) {
          await db.setMfaInfo({ bankId: account.bankId });
        }

        if (chunk.mfaFinish) {
          await db.deleteMfaInfo(account.bankId);
        }
      });
      stream.on("end", async () => {
        console.log("Extraction ended");
        await db.updateExtraction(extractionId, {
          finishedAt: new Date().toISOString(),
        });
        res();
      });
      stream.on("close", async () => {
        console.log("Extraction closed");
        await db.abortAllUnfinishedExtractions();
        stream.destroy();
        rej("Extraction closed");
      });
      stream.on("error", async (e) => {
        console.log("Extraction error:", e);
        await db.abortAllUnfinishedExtractions();
        stream.destroy();
        rej("Extraction closed");
      });
    });

    promises.push(promise);
  }

  // Not awaiting so that the enclosing function can complete once the extractions begin.
  (async () => {
    try {
      await Promise.allSettled(promises);
    } catch (e) {
      console.log(
        `Unrecoverable error in long-running accounts extraction process: ${e}`
      );
    }
  })();
};
