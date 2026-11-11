# Koodi- ja turvaülevaatus / Code and security review

## 0.8.3 koodiülevaatuse parandused / Code review fixes — 11.11.2026

[GitHubi issue #2](https://github.com/ruffike-web/makseks-ai/issues/2) välise koodiülevaatuse põhjal parandati andmete ja maksete turvalisust mõjutavad vead ning lisati puuduvad testid. EXE allkirjastamine (punkt 16) ja ülevaatuse madalama prioriteediga punktid (12, 13, 15, 26–29, 31, 32) jäid sellest väljalaskest välja.

- **Ekspordivalik (20):** värskendamine ei märgi enam kasutaja eemaldatud arvet uuesti maksefaili. Uued valmis arved valitakse endiselt automaatselt. Kaetud ühik- ja brauseritestiga; brauseritest kukub vana koodiga läbi.
- **Andmete terviklus (3, 4):** kustutamine nõuab arve kehtivat versiooni. Eksporditud arve „kustutamine” arhiveerib selle ja säilitab staatuse EKSPORDITUD. Tarnija meeldejätmine ei kustuta salvestatud registrikoodi.
- **AI seadistus (5, 6, 7):** teenusepakkuja vahetusel salvestatakse seadistus enne nõusoleku tühistamist. Keskkonnamuutujatest loetud API-võtmeid ei kirjutata faili. Rikutud seadistusfail tõstetakse varukoopiaks kõrvale (`ai-config.json.corrupt-*`) ja seadeid saab uuesti salvestada.
- **API (19, 23, 24):** nõusolekukontroll on eraldi testitud funktsioon ja marsruuditestid katavad üleslaadimise ning seadete kaitse. Vigane JSON annab kindla eestikeelse teate. Liigsete teeosadega päringud tagastavad 404. Klient kontrollib vastuse olekut enne JSON-i lugemist.
- **Töölauarakendus (9, 10, 11):** server peatub ka signaaliga lõpetatud protsessi korral ning sulgemine ei jää ootama. Korraga saab käia üks import ja sulgemine ootab selle lõpuni. Ebaõnnestunud käivitus pärast importi näitab akent ja veateadet.
- **Testid ja CI (1, 8, 14, 17, 18, 30):** GitHubi kontroll käivitab brauseritestid värske andmebaasiga (`scripts/e2e-server.mjs`). Impordi nõutud veerud tuletatakse migratsioonidest. Lisati testid võtmekaitse vanemprotsessile ja paketi faililoendile. Nõrgad `toThrow()` kontrollid said konkreetse teate; LHV negatiivsed testid kasutavad LHV maksjat (varem kukkusid need läbi maksja kontrolli tõttu). Lisati ajavahetuse ja piirväärtuste juhud ning migratsioonitest olemasolevate andmetega.
- **Audit (16, osaliselt):** privaatsusauditid ütlevad nüüd, kui kohalike võtmete otsing jäi `.env` puudumise tõttu vahele.
- **Sõltuvus:** `fast-xml-parser` 5.11.2 → 5.12.0 ([GHSA-474x-hrwr-fgx4](https://github.com/advisories/GHSA-474x-hrwr-fgx4), madal).

Akna pealkirjas kuvatakse programmi versioon. Kontrollid: 223 ühiktesti, 9 brauseritesti, TypeScript, ESLint, ehitus, `npm audit --omit=dev` (0), sõltuvuspoliitika, paketi privaatsusaudit ja kuus pakendatud rakenduse kontrolli. Andmebaasi importi menüüst ei testitud pakendatud rakenduses automaatselt; impordi loogika on kaetud ühiktestidega.

English: fixes from external code review issue #2 — export selection persistence, versioned delete, registration-code retention, atomic AI provider switch, no env keys on disk, corrupt AI config recovery, stricter API routes and client error handling, desktop import/quit/stop hardening, consent/key-protection/packaging/import tests, e2e tests in CI and stronger assertions. EXE signing and lower-priority items remain open. `fast-xml-parser` updated to 5.12.0.

## minimatch'i turvateade / minimatch advisory — 03.11.2026

Pärast 0.8.1 avaldamist ebaõnnestus GitHub Actionsi samm `npm run audit:dependencies`: 30.10.2026 avaldatud [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) (mõõdukas) puudutab `minimatch`-i versioone alla 11.0.1. Viga asub funktsioonis `firstPhasePreProcess()`. See käivitub ainult siis, kui kutsuja kasutab sätet `optimizationLevel >= 2` ja ründaja saab ise määrata glob-mustri. Kõik mõjutatud koopiad on arendus- ja ehitustööriistades (ESLint, electron-builder); tootmissõltuvuste audit oli ja jääb 0. Windowsi paketti `minimatch` ei kuulu.

Parandus:

1. Haavatavat koodi sisaldavad koopiad — `minimatch` 9.0.9 (`@electron/universal`) ja 10.2.6 (`app-builder-lib`, `@typescript-eslint/typescript-estree`) — suunatakse versioonipõhiste `overrides` reeglitega (`minimatch@^9.0.0`, `minimatch@^10.0.0`) parandatud versioonile **11.0.4**. Nende kasutajate nimeliste eksportide API on ühilduv.
2. `minimatch` 3.1.5 (ESLint 9 ja selle pluginad, `glob` 7, `@electron/asar`, `dir-compare`) ja 5.1.9 (`filelist`) ei sisalda `optimizationLevel`/`firstPhasePreProcess` koodi; see lisandus versioonis 7. Neid ei saa üle viia versioonile 11, sest nende kasutajad kutsuvad mooduli vaikeeksporti funktsioonina ja v11 seda ei paku. Ülemvoolu ühilduvat parandust pole. `npm run audit:dependencies` aktsepteerib nüüd ainult täpselt seda teadet (URL ja raskusaste) ning ainult siis, kui iga märgitud `minimatch`-i koopia on arendussõltuvus ja versioon on alla 7. Versioon 9.x/10.x, tootmiskasutus või uus teade peatavad kontrolli endiselt.
3. Auditi skript käsitles varem tsüklilisi sõltuvusi (nt `eslint` ↔ `@eslint-community/eslint-utils`, `app-builder-lib` ↔ `dmg-builder`) tundmatu ahelana. Tsükli korduvkülastus ei too uusi teateid, sest iga pakett hinnatakse eraldi. Uued testid kontrollivad nii aktsepteerimist kui ka blokeerimist.

Kontrollid Windowsis, Node.js 24.16.0: `npm ci`, `npm test` (193 testi), `npm run typecheck`, `npm run lint`, `npm run build`, `npm audit --omit=dev` (0), `npm run audit:dependencies`, `node scripts/audit-source.mjs` — PASS. Uue `minimatch`-iga koostati ka Windowsi pakett (`desktop:pack`, sh paketi privaatsusaudit). `desktop:smoke` ja `desktop:local-smoke` läbisid. Avaldatud 0.8.1 paketid on muutumatud: muudatus puudutab ainult arendustööriistu ja programmi käitumine ei muutu.

English: GHSA-g3hv-75wg-m249 (moderate) affects minimatch < 11.0.1 and is development-only here. Copies containing the vulnerable code (9.0.9, 10.2.6) are overridden to patched 11.0.4. The remaining 3.1.5/5.1.9 copies predate the vulnerable code path and cannot move to v11's API. The audit policy accepts only this advisory for development-only minimatch < 7, and handles dependency cycles correctly. The production audit remains zero; all CI checks, packaging and packaged smoke tests passed. Published 0.8.1 binaries are unaffected.

## 0.8.0 sõltuvuste uuendus / Dependency update — 28.10.2026

Väljalaske kontroll leidis uusi turvateateid. Uuendused jäid olemasolevate põhiversioonide sisse: `electron` 44.6.0 → 44.10.0, `zod` 4.6.5 → 4.6.7, `fast-uri` 3.1.8 → 3.1.9 ning `undici` 6.29.0 → 6.29.1 ja 7.30.0 → 7.30.1. Electron on arendussõltuvuste loendis, kuid selle käituskeskkond kuulub Windowsi paketti. Next.js ja ESLinti konfiguratsioon jäävad versioonile 16.4.2.

Lukufaili uuendas npm sihitud käskudega `npm install --save-dev --save-exact electron@44.10.0 --package-lock-only --ignore-scripts --no-audit` ja `npm update zod fast-uri undici --package-lock-only --ignore-scripts --no-audit`. `npm audit fix --force` ei kasutatud ning turvapoliitika erandeid ei lisatud. Kontrollitulemused on kirjas [Windowsi kontrolliraportis](WINDOWS_VALIDATION.md).

English: targeted updates address newly reported advisories while retaining the existing major versions and architecture. Electron is a development dependency that ships as the desktop runtime. The lockfile was regenerated by npm; no forced audit fix or additional audit exception was used. See [Electron certificate mitigation](https://github.com/advisories/GHSA-jr5w-w6x2-84p9), [Zod constrained collection exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [fast-uri scheme spoofing](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), and [Undici TLS options](https://github.com/advisories/GHSA-2m5v-pch6-74hx). Earlier reports below remain historical records.

## Next.js-i turvauuendus / Next.js security update — 23.10.2026

[GitHub Actionsi käivitus 39844573902](https://github.com/ruffike-web/makseks-ai/actions/runs/39844573902) ebaõnnestus sammus `npm audit --omit=dev`: lukustatud Next.js 16.3.8 kohta teatati kriitilisest leiust. Sama viga kordus kohalikus auditis. Kolm teadet puudutasid SVG piltide optimeerimist ([GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw)), Server Actionsi teenusetõkestust ([GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r)) ja tüübitud massiive tagastavaid `use cache` funktsioone ([GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr)). Auditi mõjutatud vahemik oli 16.0.0–16.4.0.

`next` ja `eslint-config-next` uuendati **16.3.8 → 16.4.2**. Kontrollimise ajal oli 16.4.2 npm-i `latest` stabiilne väljalase; see sisaldab [16.4.1 turvaparandusi](https://github.com/vercel/next.js/releases/tag/v16.4.1) ja [16.4.2 järelparandusi](https://github.com/vercel/next.js/releases/tag/v16.4.2). Versioon nõuab Node.js-i vähemalt 20.9.0 ja toetab projekti React/React DOM 19.3.0; projekti Node.js-i alampiir jääb 22.12.0 ning CI kasutab Node 24.

Lukustusfail uuendati npm 11.13.0 käsuga `npm install --save-exact next@16.4.2 eslint-config-next@16.4.2 --package-lock-only --ignore-scripts`, millele järgnes täielik `npm ci` koos tavapärase `postinstall` sammuga. `npm audit fix --force` ei kasutatud. Lukustusfailis muutusid ainult Next.js-i paketid: lisaks kahele otsesele sõltuvusele `@next/env`, `@next/eslint-plugin-next` ja kaheksa platvormi `@next/swc-*`. Reacti, Prisma, pangaprofiilide ega muude sõltuvuste versioone ei muudetud.

Kohalikud kontrollid Windowsis, Node.js 24.16.0 ja npm 11.13.0:

| Kontroll / Check | Tulemus / Result |
| --- | --- |
| `npm ci` | PASS — puhas paigaldus lukustusfailist / clean lockfile install |
| `npm test` | PASS — 152 testi, 27 faili / 152 tests, 27 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — Next.js 16.4.2, Turbopack, standalone |
| `npm audit --omit=dev` | PASS — 0 teadaolevat nõrkust / 0 known vulnerabilities |
| `npm run audit:dependencies` | PASS — olemasolev poliitika muutmata / existing policy unchanged |
| `node scripts/audit-source.mjs` | PASS — kontrollitud Git-indeks / checked Git index |

Esimene kohalik `npm test` katse katkes piiratud käivituskeskkonnas ajutiste failide ümbernimetamise `EPERM` veaga enne testide käivitumist. Sama muutmata käsk läbis kõik testid tavapäraste Windowsi õigustega. Teste, ajapiiranguid ega turvapoliitikat ei muudetud. Täisauditis jääb varasem dokumenteeritud ainult arendussõltuvuste `braces` ahela erand (5 kõrget hoiatust); tootmissõltuvuste audit on 0. Töövoo turvakontrolle ei leevendatud.

English: the failing CI audit was reproduced and fixed by updating only Next.js and its matching ESLint configuration from 16.3.8 to stable 16.4.2, with npm regenerating the lockfile. React 19.3.0 and the existing Node 24 CI remain compatible. All eight local checks above passed. The first sandboxed test attempt failed on temporary-file rename permissions before tests ran; the unchanged command passed with normal Windows permissions. The existing five development-only `braces` warnings remain covered by the unchanged audit policy; the production audit reports zero vulnerabilities.

Muudatus hõlmab lähtekoodi sõltuvusi ja nende kontrolli; varem avaldatud Windowsi EXE/ZIP-pakette selles töös uuesti ei koostatud. / This change covers source dependencies and their verification; previously published Windows EXE/ZIP packages were not rebuilt. Varasemad kontrollitulemused allpool on säilitatud ajalooliste märkmetena. / Earlier results below are preserved as historical records.

## 0.7.4 järelkontroll / Follow-up — 22.10.2026

Uus sõltuvuste audit leidis Vitesti testitööriista kaks teadet. Vitest ja selle `@vitest/mocker` alamteek uuendati parandatud versioonile 4.1.12; muudatus puudutab ainult arendussõltuvusi. Tootmissõltuvuste audit on endiselt 0. Täisauditis jääb varasem dokumenteeritud `braces` ahela erand (5 kõrget hoiatust); auditi reeglit ei leevendatud.

The release audit detected two new Vitest advisories. Vitest and `@vitest/mocker` were updated to patched 4.1.12, affecting development dependencies only. The production audit remains at zero. The existing documented `braces` exception remains (5 high warnings); the audit policy was not relaxed. See the upstream advisories for [manual mock code injection](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8) and [Windows redirect path traversal](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp).

## Varasem ülevaatus / Previous review

15.10.2026 · Makseks AI 0.7.3

## Eesti

Ülevaatus hõlmas kohalikku API-t, Electroni protsessipiire, AI-teenuste kasutamist, PDF-lugemist, tarnijate sobitamist, arvete kinnitamist, pangafailide loomist, andmebaasi importi ja väljalaske failivalikut. See on koodiülevaatus koos regressioonitestidega, mitte sõltumatu turvasertifikaat ega täielik penetratsioonitest.

Parandused:

1. Sulgudes või vigase kirjavahemärgiga summat ei muudeta enam positiivseks maksesummaks. Loetamatu „tasuda” välja korral ei asendata seda üldsummaga.
2. Andmebaasi import kontrollib pärast migratsioone vajalike tabeliveergude olemasolu enne praeguse andmebaasi asendamist. Vigane import jätab praegused andmed alles; vanema kehtiva andmebaasi uuendamine töötab.
3. Kui nimi ja konto tuvastavad kaks erinevat salvestatud tarnijat, ei kirjutata nime automaatselt üle. Kinnitamine ja eksport on vastuolu parandamiseni blokeeritud. Tundmatu OCR-nime parandamine üheselt sobiva konto järgi jääb toetatuks.
4. Groqi PDF-renderdus kontrollib lehekülgede mõõtmeid enne pildipinna eraldamist. Üle kolme lehekülje ja üle kaheksa miljoni piksli nõudvad lehed lükatakse tagasi.
5. Prisma alamteegid `deepmerge-ts` ja `mysql2` on lukustatud parandatud versioonidele 8.0.0 ja 3.24.6. Tootmissõltuvuste `npm audit --omit=dev` tulemus: **0 teadaolevat nõrkust**.
6. Gitist välistatakse tööandmed, võtmed, algsed privaatsed maksenäited ja testide ajutised failid. `scripts/audit-source.mjs` kontrollib täpselt Git-indeksis olevat sisu enne avaldamist. Windowsi pakettidel on eraldi privaatsusaudit.

Versioonis 0.7.3 lisandus Windowsi API-võtmete krüpteerimine Electroni `safeStorage` / Windows DPAPI abil. Krüpteerib Electroni põhiprotsess; eraldi Node server kasutab privaatset protsessidevahelist kanalit. Brauserile võtmete lugemise liidest ei lisatud. Varasemad võtmed teisendatakse automaatselt ning fail asendatakse alles pärast krüpteerimise ja dekrüpteerimise kontrolli. Krüpteerimise rike ei lülita salvestamist lihttekstile. Võõra kasutajakonto all avamatu võti jääb alles kuni selle selgesõnalise asendamise või eemaldamiseni.

137 automaattesti läbis kontrolli; samuti TypeScript, ESLint ja tootmisversiooni ehitus. Testid kasutavad sünteetilisi andmeid, mitte kasutaja andmebaasi. Paketitud programmi kontrollid ja nende piirid on kirjas [väljalasete kontrollis](WINDOWS_VALIDATION.md).

Alles jäävad piirangud:

- Windowsi võtmekaitse ei peata sama kasutaja õigustes töötavat pahavara. Teises arvutis või kasutajakontol võib vaja minna võtmete uuesti sisestamist. Vanemad varukoopiad võivad sisaldada lihttekstivõtmeid. Eraldi arendus-/veebiserver (`npm run dev/start`) ei kasuta Electroni kaitset ning selle võtmefail on endiselt krüpteerimata.
- Programm on mõeldud ühele kohalikule kasutajale; ettevõtteprofiilid ei asenda kasutajate autentimist. Avalikule serverile paigaldamine pole toetatud.
- Arendussõltuvuste audit sisaldab 5 kõrget hoiatust ühe `braces` teegi vea ja selle lintimise sõltuvusahela kohta. Kontrollitud uusim `braces` on endiselt 3.0.3, parandatud väljalaset pole. `sprintf-js` eemaldati `@electron/get` alamteegi `global-agent` ühilduva 4.1.3 versiooni abil; 8 hoiatust kadus. Põhiraamistikke ei alandatud. `npm run audit:dependencies` ja GitHub CI lubavad ainult täpset dokumenteeritud `braces` hoiatust ning ainult siis, kui kogu mõjutatud ahel on arendussõltuvus. Uued hoiatused, tootmissõltuvustesse jõudev viga või auditi võrguviga peatavad kontrolli. See on ajutine riskierand, mitte väide, et `braces` viga on parandatud. Lintimine kasutab projekti hallatavaid mustreid; arvete sisu sellesse tööriista ei suunata.
- EXE on allkirjastamata. Kõik makseandmed vajavad inimese kontrolli; pangaskeemi kontroll ei tähenda panga sertifikaati. Tasulisi AI-päringuid ega uusi päris pangaimpordi katseid ülevaatuse käigus ei tehtud.

## English

The review covered the local API, Electron process boundaries, AI providers, PDF extraction, supplier matching, invoice approval, bank XML generation, database import and release contents. It combines code inspection and regression tests; it is not a security certification or a comprehensive penetration test.

Fixed: unsafe amount punctuation removal; fallback from an unreadable amount-due field to a total; accepting imported databases with missing required columns; silently replacing a supplier identity when a saved name and account disagree; excessive PDF canvas allocation; vulnerable Prisma transitive packages. The production dependency audit reports **zero known vulnerabilities**.

Version 0.7.3 encrypts Windows desktop API keys with Electron `safeStorage` / Windows DPAPI through private parent/child IPC. Existing plaintext keys are migrated atomically only after an encryption/decryption check. No renderer key-read API or plaintext migration backup is created, and encryption failures never fall back to plaintext. An inaccessible key is retained until explicitly replaced or removed; other providers, models, invoices and suppliers remain available. All 137 automated tests, TypeScript, ESLint and the production build passed.

Known limitations remain: Windows protection does not stop malware running as the same user; a different computer/account may require re-entering keys; old backups may still contain plaintext keys. The packaged recovery test simulates an inaccessible key with invalid ciphertext; it does not switch to a second Windows account. The standalone development/web server (`npm run dev/start`) does not use Electron key protection. Company profiles are not separate user accounts, executables are unsigned and human payment review is mandatory. No paid AI calls or real bank imports were performed for this review.

The development audit now reports 5 high warnings through the single `braces` advisory and its linting dependency chain. Latest `braces` is still 3.0.3, with no patched release available at review time. Updating `@electron/get`'s `global-agent` to compatible 4.1.3 removes `sprintf-js` and 8 warnings. `npm run audit:dependencies` and GitHub CI allow only this exact documented `braces` advisory while every affected dependency is development-only. New advisories, production exposure and registry failures fail the check. This is a temporary risk exception, not a fix for the underlying braces bug. Linting uses project-controlled patterns, never uploaded invoice content. Frameworks were not downgraded to silence the audit.

Source control and releases exclude real working data, API keys, private original payment samples and local diagnostics. Run `node scripts/audit-source.mjs` after staging changes. Run the release privacy audit after packaging.

## Advisory references

- [DeepmergeTS recursive graph exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
- [MySQL2 compressed protocol resource exhaustion](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3)
- [braces nested pattern exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [sprintf-js unbounded precision](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
