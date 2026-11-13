# DEVASHRI camera-frame analysis — model selection

**Status: implementation complete when CI passes; NOT an operational accuracy certification.** This change is code-only and does not modify Vercel deployment or external provider permissions.

## Why the screenshot showed a model error

The original gateway allowed exactly `meta-models/muse-spark-open` (816B total, 42B active). Groq supplies that model only to approved preview accounts. Even with a working Groq key and working Caltrans/TfL still images, DEVASHRI couldn't interpret the image when the preview model was missing from `GET https://api.groq.com/openai/v1/models`.

The public Groq [vision API documentation](https://console.groq.com/docs/vision) lists `qwen/qwen3.8-27b` as a supported multimodal model with an image input, so the code now uses provider-verified model discovery to choose an explicitly labelled image-capable model.

## Routing policy

| Request type | Preferred model | Alternative | Important truth |
|---|---|---|---|
| General conversation, data-source interpretation, web research | `openai/gpt-oss-120b` | None (existing text-only guard) | Does not accept images |
| Explicit authorized public snapshot question | `meta-models/muse-spark-open` | `qwen/qwen3.8-27b` when `ASURA_VISION_POLICY=auto` and listed by Groq | The alternative is **27B**, not 816B, and is never described as a 120B vision inference |
| Image question when `ASURA_VISION_POLICY=preview-only` | `meta-models/muse-spark-open` | None | Unavailable preview model returns explicit failure; no fabricated scene answer |

Default policy if the optional setting is absent: `auto`.

No request to Groq can grant an account access to preview-only models. This implementation does not circumvent such permissions.

## How to use

1. Configure `GROQ_API_KEY` in the **server-side** environment; don't paste credentials in chat or commit them.
2. Optionally set `ASURA_VISION_POLICY=auto` (the default).
3. Open **Public Camera Explorer**, select a Caltrans or TfL published snapshot, and choose **Ask DEVASHRI**.
4. The preview should show the camera image. The model status should identify the exact multimodal model listed by Groq.
5. Enter your own image question. This triggers a new, authorized still-frame fetch; the model receives its JPEG/PNG bytes through an image data URI and the original user question. The response includes the actual model ID and whether it is a Qwen fallback.
6. If a camera source is unavailable, a preview entitlement is missing, or the image model returns an error, the request fails visibly instead of inventing image observations.

The source capture time is **not independently verified** by ASURA. The preview and analyzed frame may differ. One image cannot establish a person's identity, continuous movement, collision timing, traffic counts over time, or a complete live video stream.

## Testing

Run `npm run test:vision`. The tests mock model discovery and image completions to verify preferred/alternative model selection, strict-preview failure, correct image payload forwarding, text-model isolation, and provider-error handling. The GitHub CI workflow runs these tests together with the existing public-source contract suite and a Next.js build. Mocked tests prove routing behavior, **not** that a real Groq key currently has Qwen access or that visual descriptions are accurate.

## Operational evaluation still required

Create a consented, representative still-frame evaluation set (day/night, rain/fog, occlusion, low resolution, image-source failure and an intentionally mismatched timestamp). Score relevant observable statements against independent human annotations, report abstentions and uncertainty, and preserve snapshot provenance. Do not promote a camera's metadata or a single image to a verified 24/7 observation without a separately tested live stream and capture-time contract.
