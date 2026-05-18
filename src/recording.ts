import { SpeechClient } from "@prof401/speech-whisper-kit";

export const createSpeechClient = (): SpeechClient => new SpeechClient();

export const recordSession = async (
  client: SpeechClient
): Promise<{ audio: Blob; transcript: string }> => {
  await client.startRecording();
  const audio = await client.stopRecording();
  const transcript = await client.transcribe(audio);
  return { audio, transcript };
};
