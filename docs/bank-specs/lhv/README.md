# LHV profiil

Allikad: `xsd/pain.001.001.09.xml` (XSD, vaatamata laiendile), GPT golden ja kohalikult üle vaadatud PAYMENT_PAIN näited. Kasutaja algsed maksefailid ei kuulu repositooriumi. Kaasapandud skeemid on muutmata. Läbivaatus 06.10.2026.

MVP: EUR, TRF, `BtchBookg=false`, grupi `SvcLvl/Prtry=SEPA`, `ChrgBr=SHAR`, IBAN/BICFI, kuupäeva järgi PmtInf-grupid, SCOR+AddtlRmtInf või Ustrd. Grupitaseme PmtTpInf on algses skeemis lubatud; bulk-näide kasutab seda tehingu tasemel. Unikaalsed tehnilised ID-d ei kopeeri näidiste korduvaid väärtusi.

07.10.2026 lisati LHV ametlik `supl.001.001.01.xsd`, mida põhiskeem impordib. Allikas ja räsi: `xsd/supl-source.md`. Rakendus valideerib kogu XML-i mõlema muutmata skeemi abil kohalikus libxml2-wasm validaatoris. Skeemiviga või puuduv fail blokeerib ekspordi. Generaator ei lisa SplmtryData plokki; validaatori testid kontrollivad ka lisaskeemi lubatud ja vigast sisu.

Puuduliku skeemi hoiatus ja eraldi nõusolek eemaldati. Väliseid XML-olemeid ega DTD-sid ei lubata; imporditakse ainult kaasasolev ametlik lisaskeem.

Päris LHV internetipanga import: tegemata. Impordikatse juhend: `../README.md`.
