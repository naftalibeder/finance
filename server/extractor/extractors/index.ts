import { ConfigBankId } from "shared";
import { Extractor } from "types";
import { extractor as charlesSchwabBank } from "./charlesSchwabBank";

const extractors: Record<ConfigBankId, Extractor> = {
  "charles-schwab-bank": charlesSchwabBank,
};

export default extractors;
