# SEB profiil

Allikad: `xsd/pain.001.001.09_SEBv2.xsd`, kolm faili `examples/` ning GPT struktuurinäide `golden/`. Algfailid on muutmata. Läbivaatus 06.10.2026.

MVP: EUR, TRF, `SvcLvl/Cd=SEPA`, IBAN, `BICFI`, arv/summa mõlemal tasemel, kuupäeva järgi eraldi PmtInf, SCOR ja AddtlRmtInf või Ustrd. Aadressi olemasolul nõutakse linna ja riiki; midagi ei oletata. Maksja aadressi MVP XML-is ei väljastata, kuna kasutatud SEPA profiilis see pole nõutud.

Iga rakenduse genereeritud fail valideeritakse muutmata SEB XSD vastu libxml2-wasm abil. Algne golden ja ametlikud näited läbisid ka lxml kontrolli. Golden ärireeglite vead on kirjas `../../BANK_AUDIT.md`.

Päris SEB internetipanga import: kasutaja kinnitas `pain.001.001.09` XML-maksefaili eduka impordi. Dokumentatsioonimärge lisatud 22.10.2026; see ei tähenda ametlikku pangapoolset sertifitseerimist ega kõigi maksejuhtumite katsetamist. [Praegune staatus ja kinnituse ulatus](../README.md#praegune-impordistaatus) · [impordikatse juhend](../README.md#seb).
