# Makseks AI for Windows

[English overview](../README.en.md) · [Eestikeelne juhend](WINDOWS.md)

## Start and update

Download a package from the private repository's Releases page:

- **Fast portable (recommended):** extract all of `Makseks-AI-0.7.4-portable-kiire.zip`, then run `Makseks AI.exe`. Keep the entire folder together, including the `Makseks-AI.portable` marker. Do not launch the executable inside the ZIP viewer.
- **Installer:** run `Makseks-AI-0.7.4-setup.exe`, choose an installation directory and launch the application from the Start menu.
- **Single-file portable:** `Makseks-AI-0.7.4-portable.exe` extracts the application to a temporary directory on each launch and therefore starts more slowly.

Windows x64 is required. The runtime and bank schemas are included. The executable is unsigned, so Windows SmartScreen may show an unknown-publisher notice.

Close the old version before updating. Portable data lives in `Makseks-AI-andmed` beside the executable. Copy that folder beside the new executable, backing up any existing destination data first. Installer updates preserve `%APPDATA%\Makseks AI`. Do not run two copies against the same data folder.

## Language and companies

The first launch uses Estonian. Open **Seaded → Keel / Language** and select **English**. The interface and Windows menus change immediately. The preference applies to all companies and persists after restart. Names and invoice data are not translated.

Use the company selector to create or switch company profiles. Each company has separate payer details, bank settings, invoices, suppliers and export history. Verify the active company before importing or exporting. The provider, models and stored API keys are shared; permission to send invoices to AI is company-specific. Company profiles are not separate user accounts.

In **Settings**, enter the payer's legal name, select the bank and enter the payer IBAN. Set payment date and description preferences as needed. Supplier addresses belong on the invoice or supplier record, not in the payer's address fields.

## Import invoices

Choose **Invoice import → Data reading**:

| Mode | Behaviour |
| --- | --- |
| Local reading — without an AI service | Default. Reads selectable text and its layout in PDF files locally. No API key or internet required. |
| AI reading | Sends the document to the configured provider. Requires an API key and the active company's consent. |
| Manual entry | Keeps the document for comparison; you enter payment details yourself. |

Local reading looks for supplier identity, accounts, invoice and customer numbers, references, dates, amount due and currency. It processes up to 20 PDF pages and 100,000 text characters. Photos, scans and unusual layouts can require AI or manual entry. No local OCR is included. Unclear values remain empty; the application does not calculate balances from totals or guess an ambiguous amount. Credit-note amounts are not converted into positive outgoing payments.

PDF, JPG and PNG imports are supported, subject to the upload-size limit. Groq's PDF path supports at most three pages and rejects extreme page dimensions before image rendering. Other provider limitations and quotas depend on the selected account and model.

## Review and suppliers

Open **Review** and compare the extracted fields with the original document. Correct the recipient name, IBAN, amount, currency, invoice number, reference and due date. Address details, including town and two-letter country code, are in the additional fields. For SEB, entering an address requires both town and country.

A unique saved supplier match by registration code, account or exact normalized name can supply saved identity and address fields. A missing IBAN is filled when there is one saved account. If several accounts are available, choose under **Supplier bank accounts** and save the changes. A different account already read from an invoice remains visible for separate review. A name and account identifying different saved suppliers must be corrected before approval.

Edit saved records in **Suppliers**. On an existing invoice, **Use saved supplier details** applies the saved details without reimporting the PDF. Saving supplier changes invalidates affected approvals where necessary. Invoice numbers, amounts and dates always belong to the invoice, not the supplier record.

Field annotations identify values supplied by the document, supplier record or user. Original extracted values remain available for comparison. Selecting an account or saving edits does not approve an invoice. Review possible duplicates and changed accounts deliberately, then confirm the invoice. Approval is invalidated when relevant invoice or payment settings change.

## Due dates of ready invoices

An approved, unexported **Ready** invoice gets a pale red row when its invoice due date is today or earlier. Its status and due date turn red, with a **Due today** or **Overdue** note. This uses the invoice due date, not the payment execution date, and the current date in Estonia (`Europe/Tallinn`). The highlight refreshes every 30 seconds while the application is open and when you return to its window.

If any ready invoice is due, **Ready payments** and **Ready payments total** also turn red. These figures still include all ready invoices. Highlighting does not change approval, payment dates or the export selection. Future-due, unreviewed and exported invoices do not receive the highlight. **Exported** means a payment file was created; it does not confirm payment at the bank.

The upload area and invoice summary take less space. Drag and drop, the file picker and summary figures work as before.

## Create bank payment files

Select approved invoices under ready invoices and export for the active bank. The application validates payer details, recipient accounts, dates, references, amounts and the generated XML against the included XSD schemas. Payments are grouped by execution date. Past due dates use the current Estonian date when that date mode is selected.

Import the XML into the correct company's internet banking. Recheck recipient accounts, amounts, payment dates and references there. The application does not log into the bank or sign payments.

Supported profiles are SEB, LHV, Coop Pank and Swedbank (formerly Hansapank). All four have local schema validation. SEB import has been confirmed by the user; actual LHV, Coop Pank and Swedbank bank acceptance is still unverified. Only supported EUR supplier payments are generated. Re-exporting an invoice requires explicit duplicate acknowledgement.

## Configure AI

Open **Settings → AI connection**. Select a provider, choose or type a model ID and enter that provider's API key. **Check key and load models** refreshes the available catalog without sending an invoice. Save AI settings, then enable AI reading for the active company. Changing provider disables existing AI consent until enabled again for that provider.

Providers: Google Gemini, OpenAI, Anthropic Claude, Groq and Mistral Document AI. Use an OCR model for Mistral Document AI. A listed model is not a guarantee that your account supports the required document features or has sufficient quota. Prices and free allowances can change; check your provider account.

Keys are stored separately for each provider. The saved key field stays blank; this does not mean the key is missing. Saving an empty key field preserves the existing key. Use **Remove key** to delete it. Provider changes take effect without restarting.

## Data, backup and database import

Use **File → Open data folder** to locate the active folder:

- Installed application: `%APPDATA%\Makseks AI`.
- Portable application: `Makseks-AI-andmed` beside the executable.

`app.db` contains working data. `ai-config.json` contains model settings and **API keys encrypted for the Windows user account**. Existing plaintext keys migrate automatically without creating a plaintext backup. If encryption fails, the app will not save a new key in plaintext. When a key cannot be unlocked, Settings lets you replace or remove it while invoices and suppliers remain accessible. Re-enter keys after moving to another computer or Windows account. Existing older backups may still contain plaintext keys; upgrading does not modify those copies. `ui-preferences.json` stores the language preference. Do not share the data folder. Close the application before backing it up or copying it. Avoid network drives and synchronization of an active SQLite database. Removing an installed application does not remove the data folder.

To import data from an earlier web or desktop version:

1. Close the old application and finish pending edits.
2. Choose **File → Import existing database…** in the new application.
3. Select the old `app.db` and confirm the replacement.
4. The current database is backed up, the source is copied and migrated, and required schema columns are checked before replacement. The original source file is not modified.

Companies, invoices, suppliers and export history are imported. API keys are outside the database and must be configured separately. Temporary previews of original documents are not part of a database import. Backups are stored under `backups/` in the data folder. A rejected import leaves the current database intact.

## Troubleshooting

- **No fields found:** select local reading for a text PDF; for a scan use AI or manual entry. Existing imports are not re-read automatically.
- **Missing saved IBAN:** check the active company and supplier match, then use **Use saved supplier details**. If the supplier has several accounts, select the intended account.
- **Address validation:** fill in the recipient's town and country in the invoice's additional fields.
- **Slow portable launch:** use the extracted fast ZIP or installed version.
- **AI error:** verify provider, model, key, company consent and account quota. Manual/local modes remain available.
- **Database import rejected:** keep the source and current backups; do not replace `app.db` manually while the program is running.

## Developer checks and packaging

Use Node.js 24 on Windows. See the overview for dependency installation and database setup. Run tests, typecheck, lint, production build, `npm audit --omit=dev` and `npm run audit:dependencies` before packaging. The full audit policy permits only the documented development-only braces advisory; new advisories fail the check.

`npm.cmd run desktop:pack` creates installer, single-file portable and fast ZIP packages and audits their contents. `desktop:key-smoke` verifies actual Windows key encryption, migration and recovery; `desktop:smoke` checks the packaged workflow; `desktop:language-smoke` checks language persistence; `desktop:local-smoke` checks local extraction and saved-supplier inheritance; `desktop:portable-smoke -- --fast` checks the ZIP outside the project and all four bank XML profiles. Tests use separate data folders.

For a fresh output folder when an old running executable locks the default one:

```powershell
$env:ARVE_RELEASE_DIR='release/build-0.7.4'
npm.cmd run build
npm.cmd run desktop:stage
npx.cmd electron-builder --config desktop/builder.cjs --config.directories.output=release/build-0.7.4 --win --x64 --publish never
node desktop/audit.mjs
node desktop/fast-portable.mjs
```

Stop if any command fails. Set `ARVE_TEST_EXE` to the new unpacked executable when running desktop tests. The application runs a bundled local Node server on a random loopback port and requires a launch-specific desktop token. Electron's Node integration is disabled; sandbox and context isolation are enabled. This is not a hosted multi-user service.
