"use client";

const PREFIX = "enc:v1:";

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function keyBytesFromEnv() {
  const raw = (process.env.NEXT_PUBLIC_CIPHER_KEY || "").trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1) {
      bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return new Uint8Array(digest);
}

async function importAesKey() {
  const bytes = await keyBytesFromEnv();
  if (!bytes) return null;
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export function isClientEncrypted(value) {
  return String(value || "").startsWith(PREFIX);
}

export function canonicalLeadMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

async function importHmacKey() {
  const bytes = await keyBytesFromEnv();
  if (!bytes) return null;
  return crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function piiLookupHash(plaintext) {
  const value = String(plaintext || "").trim();
  if (!value) return "";
  const key = await importHmacKey();
  if (!key) return "";
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(sig));
}

export async function applyLeadPiiSearchParams(params, search) {
  const raw = String(search || "").trim();
  if (!raw) return params;
  params.set("search", raw);
  const digits = canonicalLeadMobile(raw);
  if (digits.length === 10) {
    const hash = await piiLookupHash(digits);
    if (hash) params.set("mobile_hash", hash);
  } else if (raw.includes("@")) {
    const hash = await piiLookupHash(raw.toLowerCase());
    if (hash) params.set("email_hash", hash);
  }
  return params;
}

export const STUDENT_ENCRYPTED_FIELDS = [
  "student_name",
  "student_email",
  "student_mobile",
  "password",
  "student_password",
  "guardian_number_1",
  "guardian_relation_1",
  "guardian_number_2",
  "guardian_relation_2",
  "guardian_email",
  "college_name",
  "college_branch_name",
  "tpo_name",
  "tpo_number",
  "tpo_email",
  "student_degree",
  "total_percentage",
  "education_status",
  "year_of_passing",
  "mode_of_classes",
  "reference_details",
  "lead_email",
  "lead_mobile",
  "email",
  "mobile",
  "referred_email",
  "referred_mobile",
];

export async function encryptStudentRecord(record) {
  if (!record || typeof record !== "object") return record;
  const out = { ...record };
  for (const key of STUDENT_ENCRYPTED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) continue;
    if (out[key] == null || out[key] === "") continue;
    out[key] = await encryptStudentPii(String(out[key]));
  }
  return out;
}

export async function decryptStudentRecord(record) {
  if (!record || typeof record !== "object") return record;
  const out = { ...record };
  for (const key of STUDENT_ENCRYPTED_FIELDS) {
    if (key in out) out[key] = await decryptStudentPii(out[key]);
  }
  return out;
}

const PAYMENT_IMAGE_MAGIC = new TextEncoder().encode("ENCIMG1");

function bytesStartWithMagic(bytes) {
  if (!bytes || bytes.length < PAYMENT_IMAGE_MAGIC.length) return false;
  for (let i = 0; i < PAYMENT_IMAGE_MAGIC.length; i += 1) {
    if (bytes[i] !== PAYMENT_IMAGE_MAGIC[i]) return false;
  }
  return true;
}

export async function encryptPaymentImageFile(file) {
  if (!file) return file;
  const key = await importAesKey();
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_CIPHER_KEY is missing. Add a 64-character hex key in the dashboard env files."
    );
  }
  const plain = new Uint8Array(await file.arrayBuffer());
  if (bytesStartWithMagic(plain)) return file;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const packed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain)
  );
  const out = new Uint8Array(PAYMENT_IMAGE_MAGIC.length + iv.length + packed.length);
  out.set(PAYMENT_IMAGE_MAGIC, 0);
  out.set(iv, PAYMENT_IMAGE_MAGIC.length);
  out.set(packed, PAYMENT_IMAGE_MAGIC.length + iv.length);
  const baseName = String(file.name || "image").replace(/\.[^.]+$/, "") || "image";
  return new File([out], `${baseName}.enc.bin`, { type: "application/octet-stream" });
}

export async function decryptPaymentImageBytes(bytes) {
  const data =
    bytes instanceof Uint8Array
      ? bytes
      : bytes instanceof ArrayBuffer
        ? new Uint8Array(bytes)
        : new Uint8Array(bytes || []);
  if (!bytesStartWithMagic(data)) return data;
  const key = await importAesKey();
  if (!key) return data;
  try {
    const ivStart = PAYMENT_IMAGE_MAGIC.length;
    const iv = data.slice(ivStart, ivStart + 12);
    const ciphertext = data.slice(ivStart + 12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new Uint8Array(plain);
  } catch {
    return data;
  }
}

export async function appendEncryptedPaymentImage(formData, field, file) {
  if (!file) return;
  formData.append(field, await encryptPaymentImageFile(file));
}

export async function decryptApiPayload(data) {
  if (data == null) return data;
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return data;
  if (Array.isArray(data)) {
    return Promise.all(data.map(decryptApiPayload));
  }
  if (typeof data !== "object") return data;
  const out = await decryptStudentRecord(data);
  if (Array.isArray(out.results)) {
    out.results = await Promise.all(out.results.map(decryptApiPayload));
  }
  if (Array.isArray(out.errors)) {
    out.errors = await Promise.all(out.errors.map(decryptApiPayload));
  }
  return out;
}

export async function encryptStudentPii(plaintext) {
  const value = String(plaintext || "").trim();
  if (!value || isClientEncrypted(value)) return value;
  const key = await importAesKey();
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_CIPHER_KEY is missing. Add a 64-character hex key in the dashboard env files."
    );
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const packed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
  );
  const out = new Uint8Array(iv.length + packed.length);
  out.set(iv, 0);
  out.set(packed, iv.length);
  return PREFIX + bytesToBase64(out);
}

export async function decryptStudentPii(stored) {
  const value = String(stored || "");
  if (!isClientEncrypted(value)) return value;
  const key = await importAesKey();
  if (!key) return value;
  try {
    const packed = base64ToBytes(value.slice(PREFIX.length));
    const iv = packed.slice(0, 12);
    const ciphertext = packed.slice(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(plain);
  } catch {
    return value;
  }
}
