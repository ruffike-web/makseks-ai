# Koodi- ja turvaülevaatus / Code and security review

14.10.2026 · Makseks AI 0.7.2

## Eesti

Ülevaatus hõlmas kohalikku API-t, Electroni protsessipiire, AI-teenuste kasutamist, PDF-lugemist, tarnijate sobitamist, arvete kinnitamist, pangafailide loomist, andmebaasi importi ja väljalaske failivalikut. See on koodiülevaatus koos regressioonitestidega, mitte sõltumatu turvasertifikaat ega täielik penetratsioonitest.

Parandused:

1. Sulgudes või vigase kirjavahemärgiga summat ei muudeta enam positiivseks maksesummaks. Loetamatu „tasuda” välja korral ei asendata seda üldsummaga.
2. Andmebaasi import kontrollib pärast migratsioone vajalike tabeliveergude olemasolu enne praeguse andmebaasi asendamist. Vigane import jätab praegused andmed alles; vanema kehtiva andmebaasi uuendamine töötab.
3. Kui nimi ja konto tuvastavad kaks erinevat salvestatud tarnijat, ei kirjutata nime automaatselt üle. Kinnitamine ja eksport on vastuolu parandamiseni blokeeritud. Tundmatu OCR-nime parandamine üheselt sobiva konto järgi jääb toetatuks.
4. Groqi PDF-renderdus kontrollib lehekülgede mõõtmeid enne pildipinna eraldamist. Üle kolme lehekülje ja üle kaheksa miljoni piksli nõudvad lehed lükatakse tagasi.
5. Prisma alamteegid `deepmerge-ts` ja `mysql2` on lukustatud parandatud versioonidele 8.0.0 ja 3.24.6. Tootmissõltuvuste `npm audit --omit=dev` tulemus: **0 teadaolevat nõrkust**.
6. Gitist välistatakse tööandmed, võtmed, algsed privaatsed maksenäited ja testide ajutised failid. `scripts/audit-source.mjs` kontrollib täpselt Git-indeksis olevat sisu enne avaldamist. Windowsi pakettidel on eraldi privaatsusaudit.

128 automaattesti läbis kontrolli; samuti TypeScript, ESLint ja tootmisversiooni ehitus. Testid kasutavad sünteetilisi andmeid, mitte kasutaja andmebaasi. Paketitud programmi kontrollid ja nende piirid on kirjas [väljalasete kontrollis](WINDOWS_VALIDATION.md).

Alles jäävad piirangud:

- API-võtmed on kasutaja kohalikus konfiguratsioonifailis krüpteerimata. Andmekausta ligipääsu ja varukoopiaid tuleb kaitsta Windowsi kasutajakonto tasemel.
- Programm on mõeldud ühele kohalikule kasutajale; ettevõtteprofiilid ei asenda kasutajate autentimist. Avalikule serverile paigaldamine pole toetatud.
- Kogu arendussõltuvuste audit sisaldab 13 hoiatust (5 kõrget, 8 mõõdukat), mis koonduvad `braces` ja `sprintf-js` ning nende sõltuvusahelatesse. Registris ei olnud kontrolli ajal nendele sobivat parandatud versiooni. Neid teeke ei leitud pakendatud serverist; need kuuluvad lintimise/pakendamise tööriistadesse. Põhiraamistike automaatset alandamist ei tehtud. Enne järgmist väljalaset tuleb audit uuesti käivitada.
- EXE on allkirjastamata. Kõik makseandmed vajavad inimese kontrolli; pangaskeemi kontroll ei tähenda panga sertifikaati. Tasulisi AI-päringuid ega uusi päris pangaimpordi katseid ülevaatuse käigus ei tehtud.

## English

The review covered the local API, Electron process boundaries, AI providers, PDF extraction, supplier matching, invoice approval, bank XML generation, database import and release contents. It combines code inspection and regression tests; it is not a security certification or a comprehensive penetration test.

Fixed: unsafe amount punctuation removal; fallback from an unreadable amount-due field to a total; accepting imported databases with missing required columns; silently replacing a supplier identity when a saved name and account disagree; excessive PDF canvas allocation; vulnerable Prisma transitive packages. The production dependency audit reports **zero known vulnerabilities**. All 128 automated tests, TypeScript, ESLint and the production build passed.

Known limitations remain: API keys are unencrypted in the user's local data folder, company profiles are not separate user accounts, executables are unsigned and human payment review is mandatory. No paid AI calls or real bank imports were performed for this review.

The complete development dependency audit still reports 13 warnings through `braces` and `sprintf-js` dependency chains. No compatible patched versions were available in the registry at review time. Neither package was found in the staged server runtime. These toolchain risks must be rechecked before the next release; framework downgrades were not forced merely to silence the audit.

Source control and releases exclude real working data, API keys, private original payment samples and local diagnostics. Run `node scripts/audit-source.mjs` after staging changes. Run the release privacy audit after packaging.

## Advisory references

- [DeepmergeTS recursive graph exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
- [MySQL2 compressed protocol resource exhaustion](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3)
- [braces nested pattern exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [sprintf-js unbounded precision](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
