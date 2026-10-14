# AI providers

Makseks supports Google Gemini, OpenAI and Anthropic Claude. Choose provider, then model, then that provider's API key. Model identifiers can be entered manually. The key-check button only lists models; it does not perform an invoice inference.

Keys and selected models are stored separately per provider in the local ai-config.json. Legacy `{apiKey, model}` files migrate as Gemini settings when next saved. Environment fallbacks: GEMINI_API_KEY/GEMINI_MODEL, OPENAI_API_KEY/OPENAI_MODEL, ANTHROPIC_API_KEY/ANTHROPIC_MODEL. Explicit key removal stays removed even when that provider has an environment key. Status endpoints return booleans and model names, never keys. This file is local plaintext, not an OS credential vault.

Provider changes disable AI for every company. The user must explicitly enable sharing invoice PDF/image/text with the newly selected provider in each company's settings. Key and model changes within the same provider preserve consent.

OpenAI uses Responses with inline PDF or image input, strict JSON schema and store:false. Claude uses Messages with base64 document/image blocks and an invoice_fields tool. Tool choice is auto because current Claude families may reject forced tool choice; only one validated invoice_fields tool result is accepted. Gemini retains its SDK integration and structured response format. All implementations send the original visual document alongside any useful local PDF text, preserve unknown fields as null, and use 60-second inference timeouts. Failed, refused, truncated or malformed responses become manual-entry invoices. No cross-provider retry sends documents to a different company.

OpenAI model listing filters general vision-capable GPT families and excludes known audio, image-generation, search, Codex and similar specializations. Claude additionally excludes models whose returned capabilities explicitly deny PDF or image input. Lists do not guarantee account inference access, remaining credits or every model feature; manual identifiers remain supported. API inference needs the provider's API credentials and billing. No paid provider call was made during development; mocked HTTP tests verify payloads and failures, not live invoice quality or billing access.

Official documentation checked 2026-10-08:

- [OpenAI PDF inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Claude PDF inputs](https://platform.claude.com/docs/en/build-with-claude/pdf-support)
- [Claude image inputs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Claude tools and forced-tool limitations](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [Claude models and modality capabilities](https://platform.claude.com/docs/en/api/models/list)

Consent is persisted as aiConsentProvider. Legacy missing values mean Gemini only. Settings writes reject enabled consent for a different active provider, and uploads pin the chosen provider and require a matching persisted consent. This prevents stale tabs and provider-switch races from sending invoices to a newly selected service.

## Mudelikataloogi uuendus 09.10.2026 (0.3.1)

Ametlike kataloogide alusel lisatud nähtavasse mudelite rippmenüüsse:
- OpenAI: gpt-6.1-sol, gpt-6-luna, gpt-6-astra.
- Anthropic: claude-sonnet-5-5, claude-haiku-5-5, claude-opus-5-5, claude-fable-5-1.

Uue seadistuse vaikemudelid on gpt-6.1-sol ja claude-sonnet-5-5. Olemasoleva konfiguratsiooni mudelivalikut ei kirjutata üle. Mudeli ID käsitsi sisestamine säilib. API võtmega mudelite laadimine asendab kohaliku soovitusloendi kontole nähtava loendiga; kohalik soovitus ei tähenda kinnitatud ligipääsu. Vaikemudeli muutmine ei muuda konto kvooti ega arveldust.

Allikad:
- https://developers.openai.com/api/docs/models/all
- https://developers.openai.com/api/docs/models/gpt-6.1-sol
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/models/gpt-6-astra
- https://platform.claude.com/docs/en/models/overview

Kontroll: uute OpenAI/Claude mudelitega PDF/pildipäringute simuleeritud vastused, kõigi seitsme mudeli läbipääs olemasolevast API-loendi filtrist ning senise mudelivaliku säilimine. Tegelike võtmetega tasulist arvelugemist ei tehtud.

## Groq ja Mistral – 0.4.0 (09.10.2026)

Groq: qwen/qwen3.8-27b toetab pilte ja JSON-vastuseid. JPG/PNG saadetakse base64-pildina. PDF teisendatakse kohapeal kuni kolmeks PNG-leheküljeks (1600 px laiusega), kõik lehed saadetakse ühes päringus. Üle kolme lehekülje korral peatatakse lugemine selge teatega, ilma osalise dokumendi saatmiseta. GPT-OSS on tekstimudel ning seda ei pakuta selles visuaalse arvelugemise ühenduses. JSON-vastuse väljad kontrollitakse kohalikult. Katkenud vastust ei aktsepteerita.

Mistral: mistral-ocr-latest kasutab Document AI /v1/ocr otspunkti koos document_annotation_format JSON-skeemi ja document_annotation_prompt juhisega. PDF/pilt saadetakse otse base64-andmetena; eraldi avalikku faili või faililaadimise teenust ei kasutata. Rakendus ei saada dokumenti teisele teenusepakkujale. Mistral kasutab dokumentatsiooni järgi annotatsioonide jaoks ka oma visuaalset keelemudelit.

Tasuta kasutus: Groqi ametlikus tasuta paketi tabelis on Qwen 3.8 jaoks 30 päringut/min, 1000 päringut/päev, 8000 tokenit/min ja 200000 tokenit/päev; täpsed kontopiirid võivad erineda. Iga pilt arvestatakse 2048 sisendtokenina. Need piirid ei võrdu garanteeritud arvete arvuga. Mistrali Free mode võimaldab API kasutamist, kuid OCR/Document AI tasuta ligipääs ja maht tuleb kontrollida konkreetselt kontolt. Rakendus ei aktiveeri tasulist paketti ega osta krediiti; teenuse arveldus sõltub kasutaja kontost.

Mõlemal teenusel on eraldi võti ja mudel. Vanad kolme teenusega konfiguratsioonid täienevad automaatselt, senised võtmed/valikud säilivad. Mudeli ID võib sisaldada Groqi nimeruumi kaldkriipsu. Teenuse vahetamine nõuab samamoodi iga ettevõtte AI loa uuesti lubamist. Mudelite API-loendist pakutakse ainult selle dokumenditoruga sobivaid mudeleid.

Allikad:
- https://console.groq.com/docs/vision
- https://console.groq.com/docs/rate-limits
- https://docs.mistral.ai/api/endpoint/ocr
- https://docs.mistral.ai/studio/document-processing/annotations
- https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key

API päringud on testitud simuleeritud vastustega. Ilma kasutaja Groqi/Mistrali võtmeteta pole tehtud päris arvelugemist ega kinnitatud konto tasuta kvooti.
