import fs from "node:fs/promises";
import path from "node:path";

import { appConfig } from "@/lib/config";

function sanitizeName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureStorageDirs() {
  await fs.mkdir(appConfig.uploadDir, { recursive: true });
  await fs.mkdir(appConfig.artifactDir, { recursive: true });
}

export async function saveUploadedFile(file: File) {
  await ensureStorageDirs();
  const safeOriginal = sanitizeName(file.name || "evidence.bin");
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeOriginal}`;
  const absolutePath = path.resolve(appConfig.uploadDir, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    filename: uniqueName,
    absolutePath,
    sizeBytes: buffer.length,
  };
}

export async function readStoredFile(storagePath: string) {
  return fs.readFile(storagePath);
}

export async function saveArtifactBuffer(fileName: string, buffer: Buffer) {
  await ensureStorageDirs();
  const safeName = sanitizeName(fileName);
  const fullPath = path.resolve(appConfig.artifactDir, `${Date.now()}-${safeName}`);
  await fs.writeFile(fullPath, buffer);
  return {
    storagePath: fullPath,
    sizeBytes: buffer.length,
    fileName: path.basename(fullPath),
  };
}
