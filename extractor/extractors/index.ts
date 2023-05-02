import { BankSlug, Extractor } from "../types";
import { extractor as charlesSchwabBank } from "./charlesSchwabBank";
import { extractor as chaseBank } from "./chaseBank";

const extractors: Record<BankSlug, Extractor> = {
  "charles-schwab-bank": charlesSchwabBank,
  "chase-bank": chaseBank,
};

export default extractors;
