import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { writeSessionCsv } from "./csvWriter.js";
import { parseTranscriptToWineEntries } from "./parseTranscript.js";
import { createSpeechClient } from "./recording.js";

const waitForEnter = async (prompt: string): Promise<void> => {
  const rl = readline.createInterface({ input, output });
  try {
    await rl.question(prompt);
  } finally {
    rl.close();
  }
};

const main = async (): Promise<void> => {
  const client = createSpeechClient();

  await waitForEnter("Press Enter to start recording.");
  await client.startRecording();

  output.write(
    "Recording… Say 'Next bottle' between bottles. Press Enter to stop.\n"
  );
  await waitForEnter("");

  const audioBuffer = await client.stopRecording();
  output.write("Transcribing…\n");
  const transcript = await client.transcribe(audioBuffer);

  output.write("Parsing transcript…\n");
  const entries = await parseTranscriptToWineEntries(transcript, client);
  const csvPath = await writeSessionCsv(entries);

  const needsReviewCount = entries.filter((e) => e.NeedsReview === "yes").length;

  output.write("\nSession complete\n");
  output.write(`  Bottles parsed: ${entries.length}\n`);
  output.write(`  CSV file: ${csvPath}\n`);
  output.write(`  Needs review: ${needsReviewCount}\n`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
