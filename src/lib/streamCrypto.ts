/**
 * Nanaflix Stream Payload Obfuscation & Protection
 * Mã hóa URL stream để ngăn người ngoài soi trực tiếp domain nguồn từ Network API và Page Source.
 * Thuật toán XOR + Base64URL đối xứng cực nhanh (< 0.05ms), hoạt động đồng bộ trên cả Server và Client.
 */

const STREAM_SALT = "Nanaflix_Cinema_Vault_2026_SecureKey_v1";

export function encodeStreamUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("nf_enc_")) return trimmed;

  try {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(trimmed);
    const saltBytes = encoder.encode(STREAM_SALT);

    const xorBytes = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      xorBytes[i] = dataBytes[i] ^ saltBytes[i % saltBytes.length];
    }

    let binary = "";
    for (let i = 0; i < xorBytes.length; i++) {
      binary += String.fromCharCode(xorBytes[i]);
    }

    const base64 = btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return `nf_enc_${base64}`;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[streamCrypto] encodeStreamUrl error:", err);
    }
    return trimmed;
  }
}

export function decodeStreamUrl(tokenOrUrl: string | null | undefined): string {
  if (!tokenOrUrl || typeof tokenOrUrl !== "string") return "";
  const trimmed = tokenOrUrl.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("nf_enc_")) return trimmed;

  try {
    const base64 = trimmed.slice(7).replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLen);

    const binary = atob(padded);
    const dataBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      dataBytes[i] = binary.charCodeAt(i);
    }

    const saltBytes = new TextEncoder().encode(STREAM_SALT);
    const xorBytes = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      xorBytes[i] = dataBytes[i] ^ saltBytes[i % saltBytes.length];
    }

    return new TextDecoder().decode(xorBytes);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[streamCrypto] decodeStreamUrl error:", err);
    }
    return tokenOrUrl;
  }
}

