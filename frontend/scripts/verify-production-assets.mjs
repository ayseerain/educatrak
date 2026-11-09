import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetsDirectory = path.resolve(scriptDirectory, "../dist/assets");
const blockedMarkers = [
  "guardian@example.test",
  "jamie.guardian@example.test",
  "alex.guardian@example.test",
  "0917 555 0101",
  "0917 555 0102",
  "0917 555 0103",
  "No guardian mobile number",
  "Not configured",
  "Casey Cashier",
  "Avery Sample Student",
  "Amara Villanueva (sample)",
  "Basil Mercado",
  "Cora Navarro (sample)",
  "Jordan Sample Student",
  ...Array.from({ length: 3 }, (_, index) => `sample-${1001 + index}`),
  ...Array.from({ length: 3 }, (_, index) => `S-${1001 + index}`),
  "account-1001-2026",
  "account-1001-2027",
  "account-1002-2026",
  "account-1003-2026",
  ...Array.from({ length: 11 }, (_, index) => `mock-payment-${index}`),
  ...Array.from({ length: 11 }, (_, index) => `OR-2026-${String(1000 + index).padStart(6, "0")}`),
  "SY 2026-2027",
  "SAMPLE-4001",
  "SAMPLE-5001",
  "demo.cashier",
  "cashier123",
  "admin123",
  "password123",
  "mock-payment-0",
  "receipt-1001",
  "Juan Dela Cruz (sample)",
  "Maria Santos (sample)",
  "Pedro Reyes (sample)",
  "Ana Bautista (sample)",
  "Jose Ramirez (sample)",
  "Casey Cashier (sample)",
  "Avery Accounting (sample)",
  "Alex Administrator (sample)",
  "Arden Auditor (sample)",
  "Riley Registrar (sample)",
  "sample.cashier",
  "sample.accounting",
  "sample.admin",
  "sample.auditor",
  "sample.registrar",
  "SamplePass123!",
  "OR-2026-1000",
  "OR-2026-002000",
  "Try cashier@demo.test",
];

const assetNames = (await readdir(assetsDirectory)).filter((name) => name.endsWith(".js"));
if (assetNames.length === 0) {
  throw new Error(`No production JavaScript assets found in ${assetsDirectory}. Run npm run build first.`);
}

const findings = [];
for (const assetName of assetNames) {
  const content = await readFile(path.join(assetsDirectory, assetName), "utf8");
  for (const marker of blockedMarkers) {
    if (content.includes(marker)) findings.push(`${assetName}: ${marker}`);
  }
}

if (findings.length > 0) {
  console.error("Development fixture markers found in production assets:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${blockedMarkers.length} development fixture/contact/credential markers are absent from ${assetNames.length} production JavaScript assets.`);
}
