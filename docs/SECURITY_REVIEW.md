# Koodi- ja turvaülevaatus / Code and security review

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
