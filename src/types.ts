export type NeedsReview = "yes" | "no";

export interface WineEntry {
  Vintage: string;
  Producer: string;
  Varietal: string;
  Name: string;
  Country: string;
  Region: string;
  Notes: string;
  Grapes: string;
  NeedsReview: NeedsReview;
}

export const CSV_COLUMNS: (keyof WineEntry)[] = [
  "Vintage",
  "Producer",
  "Varietal",
  "Name",
  "Country",
  "Region",
  "Notes",
  "Grapes",
  "NeedsReview"
];
