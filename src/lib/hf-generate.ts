import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_API_KEY!);
const hfVideo = hf as unknown as {
  imageToVideo: (args: unknown) => Promise<Blob>;
};

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 4,
  delayMs = 8000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isLoading = msg.includes("loading") || msg.includes("503");
      if (isLoading && attempt < retries) {
        console.log(`  ⏳ Модель загружается, жду ${delayMs / 1000}с (попытка ${attempt}/${retries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Превышено количество попыток");
}

export async function generateSceneImage(visualPrompt: string): Promise<string> {
  const blob = await withRetry(() =>
    hf.textToImage({
      model: "black-forest-labs/FLUX.1-dev",
      inputs: visualPrompt,
      parameters: {
        width: 1280,
        height: 720,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      },
    })
  );

  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

export async function generateSceneVideo(imageBase64: string): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const imageBlob = new Blob([imageBuffer], { type: "image/png" });

  const blob = await withRetry(
    () =>
      hfVideo.imageToVideo({
        model: "tencent/HunyuanVideo",
        inputs: imageBlob,
        parameters: {
          num_inference_steps: 30,
          fps: 24,
          num_frames: 97,
          guidance_scale: 6.0,
          embedded_guidance_scale: 6.0,
        },
      }),
    5,
    15000
  );

  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

export async function generateSceneVideoFallback(imageBase64: string): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const imageBlob = new Blob([imageBuffer], { type: "image/png" });

  const blob = await withRetry(() =>
    hfVideo.imageToVideo({
      model: "stabilityai/stable-video-diffusion-img2vid-xt",
      inputs: imageBlob,
      parameters: {
        motion_bucket_id: 127,
        fps: 8,
        decode_chunk_size: 8,
      },
    })
  );

  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}
