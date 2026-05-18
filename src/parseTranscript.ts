import { SpeechClient } from "@prof401/speech-whisper-kit";
import { isSpecificGrapeVarietal } from "./grapeVarietals.js";
import { type NeedsReview, type WineEntry } from "./types.js";

const SEGMENT_MARKERS = /\b(?:next\s+bottle|next\s+one|next)\b/gi;

export const WINE_SCHEMA_PROMPT = `You extract structured wine data from a spoken transcript segment.

Return a single JSON object with exactly these string fields:
Vintage, Producer, Varietal, Name, Country, Region, Notes, Grapes, NeedsReview

Rules:
- Use empty string "" for any field not clearly stated.
- Normalize obvious varietal and region spellings (e.g. "cab sav" → "Cabernet Sauvignon").
- When Varietal is a single grape variety (e.g. Cabernet Sauvignon, Pinot Noir), set Grapes to that grape unless the speaker gave a different grape breakdown.
- For blends or non-grape styles (e.g. Red Blend, Bordeaux Blend), leave Grapes empty unless grapes are explicitly stated.
- NeedsReview must be "yes" or "no" (lowercase).
- Set NeedsReview to "yes" if ANY of these apply:
  - Vintage missing or not a plausible 4-digit year (1800–2099)
  - Producer missing
  - Varietal unclear or missing
  - The segment is ambiguous or mixes multiple wines
- Otherwise NeedsReview is "no".

Respond with JSON only, no markdown.`;

export const segmentTranscript = (transcript: string): string[] =>
  transcript
    .split(SEGMENT_MARKERS)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const isValidVintage = (vintage: string): boolean => {
  const year = Number.parseInt(vintage.trim(), 10);
  return Number.isInteger(year) && year >= 1800 && year <= 2099;
};

const applyNeedsReviewRules = (entry: WineEntry): WineEntry => {
  const vintageMissing = !entry.Vintage.trim();
  const vintageInvalid = !vintageMissing && !isValidVintage(entry.Vintage);
  const producerMissing = !entry.Producer.trim();
  const varietalUnclear = !entry.Varietal.trim();

  const needsReview: NeedsReview =
    entry.NeedsReview === "yes" ||
    vintageMissing ||
    vintageInvalid ||
    producerMissing ||
    varietalUnclear
      ? "yes"
      : "no";

  return { ...entry, NeedsReview: needsReview };
};

const enrichGrapesFromVarietal = (entry: WineEntry): WineEntry => {
  if (entry.Grapes.trim() || !entry.Varietal.trim()) {
    return entry;
  }
  if (!isSpecificGrapeVarietal(entry.Varietal)) {
    return entry;
  }
  return { ...entry, Grapes: entry.Varietal };
};

const emptyEntry = (): WineEntry => ({
  Vintage: "",
  Producer: "",
  Varietal: "",
  Name: "",
  Country: "",
  Region: "",
  Notes: "",
  Grapes: "",
  NeedsReview: "yes"
});

const stripJsonFences = (raw: string): string => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
};

const parseWineJson = (raw: string): WineEntry => {
  const parsed = JSON.parse(stripJsonFences(raw)) as Partial<WineEntry>;
  const entry: WineEntry = {
    ...emptyEntry(),
    Vintage: String(parsed.Vintage ?? "").trim(),
    Producer: String(parsed.Producer ?? "").trim(),
    Varietal: String(parsed.Varietal ?? "").trim(),
    Name: String(parsed.Name ?? "").trim(),
    Country: String(parsed.Country ?? "").trim(),
    Region: String(parsed.Region ?? "").trim(),
    Notes: String(parsed.Notes ?? "").trim(),
    Grapes: String(parsed.Grapes ?? "").trim(),
    NeedsReview: parsed.NeedsReview === "no" ? "no" : "yes"
  };
  return applyNeedsReviewRules(enrichGrapesFromVarietal(entry));
};

const parseSegmentWithNormalize = async (
  client: SpeechClient,
  segment: string
): Promise<WineEntry> => {
  const content = await client.normalize(segment, WINE_SCHEMA_PROMPT);
  if (!content.trim()) {
    return { ...emptyEntry(), Notes: segment, NeedsReview: "yes" };
  }

  try {
    return parseWineJson(content);
  } catch {
    return { ...emptyEntry(), Notes: segment, NeedsReview: "yes" };
  }
};

export const parseTranscriptToWineEntries = async (
  transcript: string,
  client: SpeechClient
): Promise<WineEntry[]> => {
  const segments = segmentTranscript(transcript);
  if (segments.length === 0) {
    return [];
  }

  const entries: WineEntry[] = [];
  for (const segment of segments) {
    entries.push(await parseSegmentWithNormalize(client, segment));
  }
  return entries;
};
