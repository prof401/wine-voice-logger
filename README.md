# wine-voice-logger

One-week CLI utility: record spoken wine notes, transcribe with your real speech client, parse into structured rows, and write a session CSV.

## Prerequisites

- Node.js 18+
- [ffmpeg](https://ffmpeg.org/) on your PATH (used by `@prof401/speech-whisper-kit` for microphone capture)
- A running [speech-whisper-kit](https://github.com/prof401/speech-whisper-kit) voice API (`VOICE_API_BASE_URL` + bearer token; OpenAI key lives in AWS Secrets Manager on the backend)

## Install

```bash
git clone git@github.com:prof401/wine-voice-logger.git
cd wine-voice-logger
cp .env.example .env
# Edit .env with your API URLs and keys
npm install
```

### Link the speech client locally

This app depends on `@prof401/speech-whisper-kit`. By default `package.json` points at a sibling checkout:

```json
"@prof401/speech-whisper-kit": "file:../speech-whisper-kit/packages/speech-whisper-kit"
```

After changing the speech client, rebuild it:

```bash
cd ../speech-whisper-kit/packages/speech-whisper-kit
npm install && npm run build
cd ../../wine-voice-logger
npm install
```

To use a published copy instead, replace the dependency with a version from npm/GitHub and run `npm install`.

## Run

```bash
npm start
```

### Workflow

1. Press **Enter** to start recording.
2. Walk your bottles and speak each one aloud.
3. Say **“Next bottle”**, **“Next one”**, or **“Next”** between bottles (case-insensitive).
4. Press **Enter** again to stop.
5. The app transcribes via `SpeechClient` → your voice API → Whisper.
6. Each segment is parsed via `SpeechClient.normalize()` → your voice API `/normalize` endpoint (same OpenAI secret as transcription).
7. A new CSV is written in the current directory.

### CSV output

Files are named:

```text
wine-session-YYYYMMDD-HHMMSS.csv
```

Columns (in order): `Vintage`, `Producer`, `Varietal`, `Name`, `Country`, `Region`, `Notes`, `Grapes`, `NeedsReview`.

`NeedsReview` is `yes` when vintage is missing/invalid, producer is missing, varietal is unclear, or the segment was ambiguous.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VOICE_API_BASE_URL` | Base URL for upload, transcribe, and normalize routes |
| `VOICE_API_BEARER_TOKEN` | Bearer token for the voice API |
| `SPEECH_RECORD_DEVICE` | Optional ffmpeg input (macOS default `:0`) |

OpenAI credentials and the normalize chat model (`OPENAI_NORMALIZE_MODEL`, default `gpt-4o-mini`) are configured on the **speech-whisper-kit backend**, not in this app.

## Adjust LLM model or prompt

- **Model:** set `OPENAI_NORMALIZE_MODEL` on the voice API Lambda (see speech-whisper-kit backend).
- **Prompt:** edit `WINE_SCHEMA_PROMPT` in `src/parseTranscript.ts`.

## Speech client API

The app uses the published/local package exactly as exported:

```ts
import { SpeechClient } from "@prof401/speech-whisper-kit";

const client = new SpeechClient();
await client.startRecording();
const audioBuffer = await client.stopRecording();
const transcript = await client.transcribe(audioBuffer);
const json = await client.normalize(segment, winePrompt);
```

Recording logic lives in `src/recording.ts`; parsing uses `/normalize` in `src/parseTranscript.ts`.

## License

[MIT](LICENSE)
