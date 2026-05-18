import OpenAI from "openai";
import { type NeedsReview, type WineEntry } from "./types.js";

const SEGMENT_MARKERS = /\b(?:next\s+bottle|next\s+one|next)\b/gi;

const WINE_MODEL = () => process.env.OPENAI_WINE_MODEL?.trim() || "gpt-4o-mini";

const WINE_SCHEMA_PROMPT = `You extract structured wine data from a spoken transcript segment.

Return a single JSON object with exactly these string fields:
Vintage, Producer, Varietal, Name, Country, Region, Notes, Grapes, NeedsReview

Rules:
- Use empty string "" for any field not clearly stated.
- Normalize obvious varietal and region spellings (e.g. "cab sav" → "Cabernet Sauvignon").
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

const parseWineJson = (raw: string): WineEntry => {
  const parsed = JSON.parse(raw) as Partial<WineEntry>;
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
  return applyNeedsReviewRules(entry);
};

const parseSegmentWithLlm = async (
  client: OpenAI,
  segment: string
): Promise<WineEntry> => {
  const response = await client.chat.completions.create({
    model: WINE_MODEL(),
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: WINE_SCHEMA_PROMPT },
      {
        role: "user",
        content: `Transcript segment:\n\n${segment}`
      }
    ]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { ...emptyEntry(), Notes: segment, NeedsReview: "yes" };
  }

  try {
    return parseWineJson(content);
  } catch {
    return { ...emptyEntry(), Notes: segment, NeedsReview: "yes" };
  }
};

export const parseTranscriptToWineEntries = async (
  transcript: string
): Promise<WineEntry[]> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for wine parsing.");
  }

  const segments = segmentTranscript(transcript);
  if (segments.length === 0) {
    return [];
  }

  const client = new OpenAI({ apiKey });
  const entries: WineEntry[] = [];

  for (const segment of segments) {
    entries.push(await parseSegmentWithLlm(client, segment));
  }

  return entries;
};
