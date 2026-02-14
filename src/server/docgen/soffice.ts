import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function run(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {},
) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        // Evita problemas raros de localizacion/encoding en headless.
        LANG: process.env.LANG || "C.UTF-8",
      },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`soffice timeout (${timeoutMs}ms)`));
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`soffice exit code ${code}\n${stderr || stdout}`.trim()));
    });
  });
}

export async function convertPptxBufferToPdf(pptxBuffer: Buffer) {
  const sofficeBin = process.env.SOFFICE_BIN || "soffice";
  const timeoutMsRaw = process.env.SOFFICE_TIMEOUT_MS;
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : 45_000;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sigea-pptx2pdf-"));
  const inPath = path.join(tempDir, "document.pptx");
  const outPath = path.join(tempDir, "document.pdf");
  const profileDir = path.join(tempDir, "profile");
  const profileUri = pathToFileURL(profileDir).href;

  try {
    await fs.mkdir(profileDir, { recursive: true });
    await fs.writeFile(inPath, pptxBuffer);

    await run(
      sofficeBin,
      [
        "--headless",
        "--nologo",
        "--nofirststartwizard",
        "--nodefault",
        "--norestore",
        `-env:UserInstallation=${profileUri}`,
        "--convert-to",
        "pdf",
        "--outdir",
        tempDir,
        inPath,
      ],
      { cwd: tempDir, timeoutMs },
    );

    return await fs.readFile(outPath);
  } catch (error) {
    // Mensaje mas accionable para entornos que no incluyen LibreOffice.
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
      throw new Error(
        "No se encontro `soffice` (LibreOffice). Instala LibreOffice en el runtime o define SOFFICE_BIN.",
      );
    }
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

