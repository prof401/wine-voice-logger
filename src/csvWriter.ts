import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CSV_COLUMNS, type WineEntry } from "./types.js";

const escapeCsvCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const formatTimestamp = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
};

export const sessionCsvFilename = (date = new Date()): string =>
  `wine-session-${formatTimestamp(date)}.csv`;

export const writeSessionCsv = async (
  entries: WineEntry[],
  options?: { outputDir?: string; filename?: string }
): Promise<string> => {
  const outputDir = options?.outputDir ?? process.cwd();
  await mkdir(outputDir, { recursive: true });

  const filename = options?.filename ?? sessionCsvFilename();
  const filePath = join(outputDir, filename);

  const header = CSV_COLUMNS.join(",");
  const rows = entries.map((entry) =>
    CSV_COLUMNS.map((col) => escapeCsvCell(entry[col] ?? "")).join(",")
  );

  await writeFile(filePath, [header, ...rows].join("\n") + "\n", "utf8");
  return filePath;
};
