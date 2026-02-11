// api/tts.ts
// Vercel serverless function — proxies TTS requests to Vertex AI.
// Authenticates via Workload Identity Federation (Vercel OIDC → GCP).
// No long-lived secrets needed — uses short-lived OIDC tokens.
//
// The request/response format is identical to AI Studio's generateContent,
// so frontend code changes are minimal (just the URL).
//
// Required environment variables (set in Vercel dashboard):
//   GCP_PROJECT_ID                         — Google Cloud project ID
//   GCP_PROJECT_NUMBER                     — Google Cloud project number (numeric)
//   GCP_SERVICE_ACCOUNT_EMAIL              — Service account email
//   GCP_WORKLOAD_IDENTITY_POOL_ID          — Workload Identity Pool ID (e.g. "vercel")
//   GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID — Pool Provider ID (e.g. "vercel")
//   GCP_REGION                             — (optional) defaults to "us-central1"
//   GCP_TTS_MODEL                          — (optional) defaults to "gemini-2.5-flash-tts"

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import {
  ExternalAccountClient,
  type BaseExternalAccountClient,
} from "google-auth-library";

// --- Configuration from environment variables ---
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || "";
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || "";
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL || "";
const GCP_WORKLOAD_IDENTITY_POOL_ID =
  process.env.GCP_WORKLOAD_IDENTITY_POOL_ID || "";
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID =
  process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID || "";
const GCP_REGION = process.env.GCP_REGION || "us-central1";
const GCP_TTS_MODEL = process.env.GCP_TTS_MODEL || "gemini-2.5-flash-tts";

// Vertex AI generateContent endpoint (same request format as AI Studio)
const VERTEX_AI_URL =
  `https://${GCP_REGION}-aiplatform.googleapis.com/v1beta1` +
  `/projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}` +
  `/publishers/google/models/${GCP_TTS_MODEL}:generateContent`;

/**
 * Create an ExternalAccountClient that exchanges Vercel's OIDC token
 * for a GCP access token via Workload Identity Federation.
 */
function createAuthClient(): BaseExternalAccountClient | null {
  return ExternalAccountClient.fromJSON({
    type: "external_account",
    audience:
      `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}` +
      `/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}` +
      `/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-` +
      `/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
    subject_token_supplier: {
      // Wrap to match ExternalAccountSupplierContext signature
      getSubjectToken: async () => getVercelOidcToken(),
    },
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  // Validate required config
  if (!GCP_PROJECT_ID || !GCP_PROJECT_NUMBER || !GCP_SERVICE_ACCOUNT_EMAIL) {
    return res.status(500).json({
      error: { message: "GCP environment variables not configured" },
    });
  }

  try {
    // Get short-lived access token via Workload Identity Federation
    const authClient = createAuthClient();
    if (!authClient) {
      throw new Error("Failed to create auth client");
    }
    // getRequestHeaders returns { Authorization: 'Bearer ...' }
    const authHeaders = await authClient.getRequestHeaders();

    // Forward request body as-is to Vertex AI
    const response = await fetch(VERTEX_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Pass through the Vertex AI response (same format as AI Studio)
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("TTS proxy error:", err);
    return res.status(500).json({
      error: { message: (err as Error).message || "Internal server error" },
    });
  }
}
