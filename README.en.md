# Makseks AI

[**Eesti**](README.md) · **English**

Makseks AI is a Windows application for reviewing purchase invoices and preparing bank payment files. Import an invoice, check its extracted details, approve it and export ISO 20022 `pain.001.001.09` XML for your bank. The application does not initiate or sign payments.

## Features

- Local reading of text PDFs without AI, an API key or internet access. The reader considers page layout; local OCR for scans and photos is not included.
- Optional AI reading with Google Gemini, OpenAI, Anthropic Claude, Groq and Mistral Document AI. Select the provider, model and API key in Settings.
- Manual entry, comparison with the original document, field provenance and human approval before export.
- Separate invoices, suppliers, banking settings and export history for multiple companies.
- Editable supplier records: saved names, registration codes, addresses and an unambiguous account populate later invoices.
- Validation of IBANs, references, amounts and dates, plus duplicate and changed-account checks.
- SEB, LHV, Coop Pank and Swedbank profiles with local XSD validation.
- Switchable Estonian and English interfaces.

## Windows downloads

Version **0.7.2** is available from this private repository's [Releases](https://github.com/ruffike-web/makseks-ai/releases) page. Repository access is required.

| Package | Use |
| --- | --- |
| `Makseks-AI-0.7.2-portable-kiire.zip` | Recommended portable version. Extract the whole ZIP once and run `Makseks AI.exe`. |
| `Makseks-AI-0.7.2-setup.exe` | Installer; launch the application from the Start menu. |
| `Makseks-AI-0.7.2-portable.exe` | Single file that extracts itself on every launch; starts more slowly. |

Packages target Windows x64 and include their own runtime. No separate Node.js installation or terminal is needed. Executables are unsigned, so Windows may ask for confirmation. Release checksums are provided in `SHA256SUMS.txt`.

**Updating:** close the old application. For portable installations, copy its `Makseks-AI-andmed` folder beside the new executable. Back up any existing destination data before replacing it. Installed versions use `%APPDATA%\Makseks AI`.

1. Open **Settings**, add the paying company and select its bank account.
2. Open **Invoice import → Data reading**, choose a reading mode and add invoices.
3. Select **Review**, compare with the original document and correct missing or unclear details.
4. Approve the invoice, select ready invoices and generate an XML file.
5. Import the XML into the correct company's online banking and review the payments there.

Full guide: [English](docs/WINDOWS.en.md) · [eesti keeles](docs/WINDOWS.md).

## Data and limitations

Local and manual reading do not send invoices to an AI service. AI reading sends the document to the selected provider only with the active company's consent. Loading model lists requires internet access but does not send invoices. Available models, prices and quotas depend on the provider account; refresh the model catalog in Settings.

The database and API settings are stored in the application data folder. **API keys are stored unencrypted in the local `ai-config.json` file.** Do not share this folder or use an active database on a network drive. This is a single-user local application; choosing a company is not a user authorization boundary. Releases and source control do not include real invoices, databases or keys.

All extracted fields require human review. Parenthesized, malformed or ambiguous amounts are left for manual entry; the application does not choose arbitrarily between multiple accounts. EUR supplier payments are supported. XSD validation does not guarantee bank acceptance: a user has confirmed SEB import; actual LHV, Coop Pank and Swedbank imports still require verification.

## Development

Requirements: Windows x64, Git and Node.js 24 LTS. Keep the active database outside synchronized folders where possible.

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run db:deploy
npm.cmd run dev
```

Open the local address shown in the terminal. `.env` and `data/` are excluded from Git. `npm ci` generates the Prisma client; `db:deploy` creates or migrates the configured database, so back up existing data first.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd run desktop:pack
npm.cmd run desktop:portable-smoke -- --fast
npm.cmd run desktop:local-smoke
```

Workflow tests use separate test data. `desktop:pack` builds all three Windows packages and audits them for private files. Use a separate output directory when an old executable locks a build folder; see the Windows guide. To add a bank profile, see [ADDING_A_BANK.md](docs/ADDING_A_BANK.md).

- [Code review and known limitations](docs/SECURITY_REVIEW.md)
- [Release validation history](docs/WINDOWS_VALIDATION.md)
- [Bank schemas and import verification](docs/bank-specs/README.md)

The repository is initially private. No public distribution or open-source license has been designated.
