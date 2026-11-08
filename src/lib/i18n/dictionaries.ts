import { fr, type Dictionary } from "./fr";
import { ar } from "./ar";
import type { Locale } from "./config";

export const dictionaries: Record<Locale, Dictionary> = { fr, ar };
export type { Dictionary };
