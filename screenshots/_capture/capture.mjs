import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const directory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(directory, "..");
const baseUrl = (process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:5173").replace(/\/$/, "");
const viewport = { width: 1536, height: 864 };
const deviceScaleFactor = 2;
const timeZoneId = process.env.CAPTURE_TIME_ZONE ?? "Asia/Manila";

const roles = {
  cashier: { username: "sample.cashier", password: process.env.CAPTURE_PASSWORD_CASHIER },
  accounting: { username: "sample.accounting", password: process.env.CAPTURE_PASSWORD_ACCOUNTING },
  registrar: { username: "sample.registrar", password: process.env.CAPTURE_PASSWORD_REGISTRAR },
  auditor: { username: "sample.auditor", password: process.env.CAPTURE_PASSWORD_AUDITOR },
  administrator: { username: "sample.admin", password: process.env.CAPTURE_PASSWORD_ADMINISTRATOR },
  "super-admin": { username: "sample.superadmin", password: process.env.CAPTURE_PASSWORD_SUPER_ADMIN },
};

const screens = [
  { number: 1, role: "both", name: "Login", route: "/login", state: "Default sign-in form", file: "01_both_login.png" },
  { number: 2, role: "cashier", name: "Dashboard", route: "/", state: "Cashier overview", file: "02_cashier_dashboard.png" },
  { number: 3, role: "accounting", name: "Dashboard", route: "/", state: "Accounting overview", file: "03_accounting_dashboard.png" },
  { number: 4, role: "registrar", name: "Dashboard", route: "/", state: "Registrar overview", file: "04_registrar_dashboard.png" },
  { number: 5, role: "auditor", name: "Dashboard", route: "/", state: "Auditor overview", file: "05_auditor_dashboard.png" },
  { number: 6, role: "administrator", name: "Dashboard", route: "/", state: "Administrator overview", file: "06_administrator_dashboard.png" },
  { number: 7, role: "super-admin", name: "Dashboard", route: "/", state: "Super Admin overview", file: "07_super-admin_dashboard.png" },
  { number: 8, role: "administrator", name: "User management", route: "/admin/users", state: "Default user list", file: "08_administrator_user-management.png" },
  { number: 9, role: "super-admin", name: "Role matrix", route: "/admin/roles", state: "Default reference", file: "09_super-admin_role-matrix.png" },
  { number: 10, role: "registrar", name: "Student directory", route: "/students", state: "Default student list", file: "10_registrar_student-directory.png" },
  { number: 11, role: "registrar", name: "Student profile", route: "/students/sample-1001", state: "Synthetic sample student", file: "11_registrar_student-profile.png" },
  { number: 12, role: "registrar", name: "Student masterlist import", route: "/students/import", state: "Empty import form", file: "12_registrar_student-masterlist-import.png" },
  { number: 13, role: "cashier", name: "Billing accounts", route: "/accounts", state: "Default account list", file: "13_cashier_billing-accounts.png" },
  { number: 14, role: "cashier", name: "Billing account detail", route: "/accounts/account-1001-2026", state: "Synthetic sample account", file: "14_cashier_billing-account-detail.png" },
  { number: 15, role: "cashier", name: "Record payment", route: "/payments/new", state: "Empty payment form", file: "15_cashier_record-payment.png" },
  { number: 16, role: "cashier", name: "Transaction history", route: "/payments", state: "Default payment list", file: "16_cashier_transaction-history.png" },
  { number: 17, role: "cashier", name: "Receipt print view", route: "/receipts/mock-payment-4/print", state: "Synthetic sample receipt", file: "17_cashier_receipt-print-view.png" },
  { number: 18, role: "accounting", name: "Void approvals", route: "/voids", state: "Default approval queue", file: "18_accounting_void-approvals.png" },
  { number: 19, role: "cashier", name: "Notification log", route: "/followup?view=notifications", state: "Default notification log", file: "19_cashier_notification-log.png" },
  { number: 20, role: "accounting", name: "Follow-up workspace", route: "/followup", state: "Default overdue list", file: "20_accounting_follow-up-workspace.png" },
  { number: 21, role: "accounting", name: "Reports hub", route: "/reports", state: "Available reports", file: "21_accounting_reports-hub.png" },
  { number: 22, role: "accounting", name: "Outstanding balances report", route: "/reports/outstanding", state: "Default report", file: "22_accounting_outstanding-balances-report.png" },
  { number: 23, role: "auditor", name: "Audit review", route: "/admin/audit-log", state: "Default audit log", file: "23_auditor_audit-review.png" },
  { number: 24, role: "administrator", name: "Backup and recovery", route: "/admin/backup", state: "Backup status", file: "24_administrator_backup-and-recovery.png" },
  { number: 25, role: "accounting", name: "Finance settings", route: "/settings/fees", state: "Fee schedules", file: "25_accounting_finance-settings.png" },
  { number: 26, role: "administrator", name: "System settings", route: "/settings/school", state: "School year and terms", file: "26_administrator_system-settings.png" },
  { number: 27, role: "cashier", name: "End-of-day close-out", route: "/closeout", state: "Default close-out workspace", file: "27_cashier_end-of-day-close-out.png" },
];

function manilaTimestamp() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZoneId,
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date()).reduce((values, part) => ({ ...values, [part.type]: part.value }), {});
  return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year} — ${parts.hour}:${parts.minute}:${parts.second} ${timeZoneId}`;
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: path.resolve(directory, "..", ".."), encoding: "utf8" }).trim();
  } catch {
    return "Unavailable";
  }
}

function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function waitForStablePage(page, screen) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 });
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-delay: 0ms !important;
      transition-duration: 0.01ms !important;
      transition-delay: 0ms !important;
      scroll-behavior: auto !important;
      caret-color: transparent !important;
    }
  ` });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForFunction(() => ![...document.querySelectorAll("*")].some((node) => {
    const text = node.textContent?.trim() ?? "";
    const style = getComputedStyle(node);
    return /^loading(?:[\s\S]*?)?[.…]{0,3}$/i.test(text) && style.visibility !== "hidden" && style.display !== "none";
  }), undefined, { timeout: 15_000 });
  const alerts = await page.locator('[role="alert"]:visible').allTextContents();
  if (alerts.length) throw new Error(`${screen.name} displayed an alert: ${alerts.join(" | ")}`);
  const loading = await page.locator('text=/loading|skeleton/i').evaluateAll((nodes) => nodes.filter((node) => {
    const style = getComputedStyle(node);
    return style.visibility !== "hidden" && style.display !== "none";
  }).length);
  if (loading) throw new Error(`${screen.name} still displayed loading content.`);
}

async function requiredViewportHeight(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll("*")].map((element) => {
      const style = getComputedStyle(element);
      const scrollable = /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 4;
      return { element, score: scrollable ? element.clientWidth * (element.scrollHeight - element.clientHeight) : 0 };
    }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score);
    const target = candidates[0]?.element;
    if (!target) return window.innerHeight;
    return Math.max(window.innerHeight, Math.ceil(target.getBoundingClientRect().top + target.scrollHeight));
  });
}

async function logIn(context, role) {
  const credentials = roles[role];
  if (!credentials?.password) throw new Error(`Missing CAPTURE_PASSWORD_${role.toUpperCase().replaceAll("-", "_")}.`);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await page.getByLabel(/username/i).fill(credentials.username);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
  await waitForStablePage(page, { name: `${role} sign-in check` });
  return page;
}

async function capture(page, screen) {
  await page.goto(`${baseUrl}${screen.route}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await waitForStablePage(page, screen);
  const captureHeight = await requiredViewportHeight(page);
  if (captureHeight > 5_000) throw new Error(`${screen.name} is ${captureHeight}px tall and needs an explicit capture-height decision.`);
  if (captureHeight > viewport.height) await page.setViewportSize({ width: viewport.width, height: captureHeight });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const screenshot = await page.screenshot({ path: path.join(outputDirectory, screen.file), type: "png" });
  if (captureHeight > viewport.height) await page.setViewportSize(viewport);
  const size = pngSize(screenshot);
  const expectedWidth = viewport.width * deviceScaleFactor;
  if (size.width !== expectedWidth) throw new Error(`${screen.name} width is ${size.width}px; expected ${expectedWidth}px.`);
  if (size.height !== captureHeight * deviceScaleFactor) throw new Error(`${screen.name} height is ${size.height}px; expected ${captureHeight * deviceScaleFactor}px.`);
  return { ...screen, scrolling: captureHeight > viewport.height, size };
}

function indexMarkdown(results) {
  const rows = results.map((result) => `| [${result.file}](${result.file}) | ${result.role} | ${result.name} | \`${result.route}\` | ${result.state} | ${result.scrolling ? "Scrolling" : "Single"} | ${result.size.width} × ${result.size.height} |`).join("\n");
  return `# EducatraK screenshot index\n\n- Commit: \`${gitCommit()}\`\n- Data source: local Vite application with the project's MockDB, which declares all captured records synthetic development data.\n- Captured: ${manilaTimestamp()}\n- Viewport: ${viewport.width} × ${viewport.height} CSS pixels (1920 × 1080 display at 125% scaling); device scale factor ${deviceScaleFactor}.\n- Browser context: Chromium, light color scheme, reduced motion, ${timeZoneId}.\n- Page injections: a capture-only style disables animations and transitions, disables smooth scrolling, and hides input carets. No application source was changed.\n- Skipped: Ledger Import (M12) — excluded at the user's direction.\n\n| File | Role | Screen | Route | State | Capture | Pixel size |\n|---|---|---|---|---|---|---|\n${rows}\n`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const shared = { viewport, deviceScaleFactor, colorScheme: "light", reducedMotion: "reduce", locale: "en-PH", timezoneId: timeZoneId };
  const results = [];
  try {
    const loginContext = await browser.newContext(shared);
    const loginPage = await loginContext.newPage();
    await loginPage.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    results.push(await capture(loginPage, screens[0]));
    await loginContext.close();

    const screensByRole = Object.groupBy(screens.slice(1), ({ role }) => role);
    for (const [role, roleScreens] of Object.entries(screensByRole)) {
      const context = await browser.newContext(shared);
      const page = await logIn(context, role);
      for (const screen of roleScreens) results.push(await capture(page, screen));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  await writeFile(path.join(outputDirectory, "INDEX.md"), indexMarkdown(results));
  console.table(results.map(({ file, scrolling, size }) => ({ file, capture: scrolling ? "scrolling" : "single", pixels: `${size.width}x${size.height}` })));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
