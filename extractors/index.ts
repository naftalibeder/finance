import { BankName, Extractor } from "../types";
import { extractor as charlesSchwabBank } from "./charlesSchwabBank";

const extractors: Record<BankName, Extractor> = {
  "charles-schwab-bank": charlesSchwabBank,
};

export default extractors;
