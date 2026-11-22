# Set Up and Test EducatraK

This guide is for a teammate setting up EducatraK on Windows. It has two paths:

- **Part 1 — quick UI test:** runs the React application with its built-in MockDB. It needs only Git and Node.js.
- **Part 2 — full local test:** runs the React application, Laravel API, MySQL database, and fictional seeded records. Use this to test the live API workflows.

All sample accounts and records below are fictional. Do not put real student, guardian, staff, financial, or credential data in the local database.

## 1. Install the required software

Install these once on the computer:

- [Git for Windows](https://git-scm.com/download/win)
- [Node.js](https://nodejs.org/) — use a current LTS release.
- For Part 2: PHP **8.4.1 or later within the 8.4.x line**, [Composer 2](https://getcomposer.org/download/), and MySQL **8.4** (the project target).

For PHP, ensure these extensions are enabled: `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `tokenizer`, `xml`, `ctype`, and `bcmath`. Start MySQL before beginning Part 2.

Open a new PowerShell window and confirm the tools are available:

```powershell
git --version
node --version
npm --version
php --version
composer --version
mysql --version
```

The PHP, Composer, and MySQL commands are only required for Part 2. If PowerShell cannot find a command after installation, close it, open a new window, and try again.

### Composer is not recognized

If `composer --version` reports that Composer is not recognized, install Composer before continuing with Part 2:

1. First confirm that PHP is available with `php --version`. It must show PHP 8.4.1 or a later 8.4 patch release. If it is not available or shows another version, configure the correct PHP installation and reopen PowerShell.
2. Download and run the official Windows installer, [Composer-Setup.exe](https://getcomposer.org/Composer-Setup.exe).
3. When the installer asks for PHP, select the `php.exe` that succeeded in step 1. Allow the installer to add Composer to `PATH`.
4. Close **all** PowerShell windows, open a new one, and run:

   ```powershell
   composer --version
   ```

5. If it is still not recognized, restart Windows and repeat the command. If needed, check that `C:\ProgramData\ComposerSetup\bin` is in your user or system `PATH`.

Do not run `composer install` until `composer --version` succeeds.

## 2. Clone the repository

In PowerShell, choose a working folder, then clone the repository:

```powershell
cd $HOME\Documents
git clone https://github.com/ayseerain/educatrak.git
cd educatrak
```

If the repository is already cloned, do not clone it again. Update it from the repository root instead:

```powershell
git pull origin main
```

If your group is testing a different branch, use the branch name provided by the person coordinating the test:

```powershell
git fetch origin
git switch <branch-name>
git pull
```

## Part 1 — Quick UI test with MockDB

MockDB runs entirely in the browser with fictional data. It is the fastest way to review screens and role-based navigation; Laravel, PHP, and MySQL are not required.

### 3. Install the frontend packages

```powershell
cd frontend
npm ci
```

### 4. Select MockDB mode

Create `frontend\.env` with this exact content:

```dotenv
VITE_DATA_SOURCE=mock
```

`frontend\.env` is local-only and is ignored by Git. Do not commit it.

### 5. Start the frontend

```powershell
npm run dev
```

Leave that PowerShell window open, then open [http://localhost:5173](http://localhost:5173). Press `Ctrl+C` in the same window to stop the frontend.

Use any of these fictional MockDB accounts:

| Role | Username | Password |
| --- | --- | --- |
| Super Administrator | `sample.superadmin` | `demo-superadmin` |
| Cashier | `sample.cashier` | `demo-cashier` |
| Accounting | `sample.accounting` | `demo-accounting` |
| Administrator | `sample.admin` | `demo-admin` |
| Auditor | `sample.auditor` | `demo-auditor` |
| Registrar | `sample.registrar` | `demo-registrar` |

MockDB changes persist in the browser's Local Storage under `educatrak.mock-db.v1`. To return to the original fictional data, open the application once with `?mockReset=1` appended to the URL, for example `http://localhost:5173/?mockReset=1`.

## Part 2 — Full local test with Laravel and MySQL

Use a separate terminal for the backend and keep the frontend terminal from Part 1. The steps below create the local `educatrak` database and then erase/recreate its fictional seeded records when reset is requested.

### 6. Create the local MySQL database and account

Sign in to MySQL as a local administrator:

```powershell
mysql -u root -p
```

At the MySQL prompt, replace `<choose-a-local-password>` with a password that is used only on this computer. Run:

```sql
CREATE DATABASE educatrak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'educatrak'@'localhost' IDENTIFIED BY '<choose-a-local-password>';
GRANT ALL PRIVILEGES ON educatrak.* TO 'educatrak'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Use this account only for local development/testing. Never use the MySQL root account in `backend\.env`, and never share or commit the password.

### 6a. Database account vs. EducatraK sign-in accounts

These are different accounts:

| Account type | Purpose | Where it is created / used |
| --- | --- | --- |
| MySQL administrator (for example, `root`) | Creates the local database and database account in step 6. | MySQL only; never place this account in `backend\.env`. |
| MySQL application account (`educatrak`) | Lets Laravel read and write the local `educatrak` database. | Created in step 6; configured as `DB_USERNAME` and `DB_PASSWORD` in `backend\.env`. It cannot sign in to the website. |
| EducatraK system account | Lets a person sign in at `http://localhost:5173`. | Stored in EducatraK's `users` table after step 8. It does not grant direct MySQL access. |

Step 8 creates five fictional system accounts for role testing. To create **your own personal test sign-in**, complete steps 7 and 8, then run this once from `backend`:

```powershell
php artisan educatrak:bootstrap-super-admin
```

Enter a fictional full name, your preferred test username, optional test email, and a password with at least 12 characters. Do not use a real password or personal data for shared test environments.

`educatrak:bootstrap-super-admin` creates **only** the protected Super Administrator and refuses to run again after one exists. There is no Artisan command for regular staff accounts. To create them:

1. Start the backend and frontend, then sign in to `http://localhost:5173` as the Super Administrator.
2. Open **User & access management** from the sidebar.
3. Select **Create user**, enter fictional test details, and select the needed role.
4. Copy the temporary password shown once, then sign in as that user and set a new password when prompted.

The Super Administrator can create Administrator, Cashier, Auditor, and Registrar accounts. An Administrator can create Cashier, Auditor, and Registrar accounts. Accounting creation is not currently available through the app; use the fictional seeded `sample.accounting` account for that role during testing.

### 7. Install backend packages and create its environment file

From the repository root:

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Open `backend\.env` and set these values. Keep the remaining values from `.env.example` unchanged unless a coordinator tells you otherwise.

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
APP_TIMEZONE=Asia/Manila

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=educatrak
DB_USERNAME=educatrak
DB_PASSWORD=<choose-a-local-password>

SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
```

`backend\.env` contains local secrets and is ignored by Git. Never commit, send, or paste it into chat.

### 8. Create the schema and fictional seeded data

The following command drops every table in `educatrak`, runs every migration, and inserts only the repository's fictional records. Confirm that `DB_DATABASE=educatrak` before running it.

```powershell
php artisan migrate:fresh --seed
php artisan migrate:status
```

All migrations should show `Ran` in the status output.

### 9. Start the Laravel API

Still in `backend`, run:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Leave this window open. Confirm that [http://127.0.0.1:8000/up](http://127.0.0.1:8000/up) responds successfully. Press `Ctrl+C` in this window to stop the API.

### 10. Run the frontend against the live API

Open another PowerShell window:

```powershell
cd $HOME\Documents\educatrak\frontend
npm ci
```

Replace the MockDB setting in `frontend\.env` with:

```dotenv
VITE_DATA_SOURCE=live
VITE_BACKEND_URL=http://127.0.0.1:8000
```

Then start the frontend:

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` and `/sanctum` requests to the Laravel server, so both servers must remain running.

Use any of these fictional live seeded accounts. Each password is `SamplePass123!`:

| Role | Username |
| --- | --- |
| Cashier | `sample.cashier` |
| Accounting | `sample.accounting` |
| Administrator | `sample.admin` |
| Auditor | `sample.auditor` |
| Registrar | `sample.registrar` |

The live seeder does not create a Super Administrator. If you did not create your own one in step 6a, run this one-time command from `backend`, enter fictional details, and choose a password of at least 12 characters:

```powershell
php artisan educatrak:bootstrap-super-admin
```

## 11. Reset the local database

This permanently deletes the records in the database configured by `backend\.env`. It is safe only when it still points to the dedicated local `educatrak` database containing fictional records.

```powershell
cd backend
php artisan migrate:fresh --seed
```

If you created a local Super Administrator, the reset removes it too; run `php artisan educatrak:bootstrap-super-admin` again if you need it.

## 12. Run checks before reporting a problem

Run these from separate terminals after installing dependencies:

```powershell
# Frontend
cd frontend
npm run build
npm run test
```

```powershell
# Backend
cd backend
php artisan test --compact
```

As of this guide's update, the complete frontend suite has one documented pre-existing failure in `src/test/liveBillingAccounts.test.tsx` that expects page 2 but receives page 1. Record the exact output if it still occurs; do not change the test or application just to hide it. The backend test suite uses its own in-memory SQLite configuration and does not alter `educatrak`.

## Common fixes

| Problem | Check or fix |
| --- | --- |
| `npm` / `php` / `composer` / `mysql` is not recognized | Reopen PowerShell after installing the program and check that its installation folder is on `PATH`. |
| The app still shows MockDB behavior | Check that `frontend\.env` contains `VITE_DATA_SOURCE=live`, then stop and restart `npm run dev`. |
| Login or API requests fail in live mode | Confirm `php artisan serve --host=127.0.0.1 --port=8000` is running and `VITE_BACKEND_URL` is `http://127.0.0.1:8000`. |
| `Access denied` or `Unknown database` | Recheck the database name, username, and password in `backend\.env`; then confirm the MySQL account/database from step 6 exist. |
| `could not find driver` | Enable PHP's `pdo_mysql` extension and restart the terminal/server. |
| Changes do not look fresh in MockDB mode | Open `http://localhost:5173/?mockReset=1` once, then reload normally. |
| A frontend port is already in use | Stop the existing Vite process, or use the URL/port Vite prints and update `SANCTUM_STATEFUL_DOMAINS` if you choose a different frontend port. |

## Everyday restart

After the first setup, update the repository before testing the latest shared work:

```powershell
cd $HOME\Documents\educatrak
git pull
```

For MockDB testing, start only `frontend` with `npm run dev`. For live testing, start the backend in one terminal and the frontend in another:

```powershell
# Terminal 1
cd $HOME\Documents\educatrak\backend
php artisan serve --host=127.0.0.1 --port=8000
```

```powershell
# Terminal 2
cd $HOME\Documents\educatrak\frontend
npm run dev
```
