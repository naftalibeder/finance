import { BankId, Extractor } from "../../types";
import { extractor as charlesSchwabBank } from "./charlesSchwabBank";

const extractors: Record<BankId, Extractor> = {
  "charles-schwab-bank": charlesSchwabBank,
};

export default extractors;
