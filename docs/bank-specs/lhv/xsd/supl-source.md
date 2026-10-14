# LHV lisaskeemi allikas

- Fail: `supl.001.001.01.xsd`, alla laaditud muutmata kujul 07.10.2026.
- Ametlik allikas: https://partners.lhv.ee/assets/files/XSD/supl.001.001.01.xsd
- Viitav LHV dokumentatsioon: https://partners.lhv.ee/connect/ (Supplementary data).
- SHA-256: `212586297693c58c698a2e48ca54e403581e62ab146228ff5bd932a5bf336647`.
- Kontroll: olemasolev `pain.001.001.09.xml` kompileerub koos lisaskeemiga `lxml.etree.XMLSchema` abil; `LHV_golden_reference_pain001_001_09.xml` läbis XSD valideerimise.

See kontroll kinnitab skeemide kokkusobivust ja näidisfaili struktuuri. Järgneva muudatusega 07.10.2026 ühendati täielik skeemikomplekt ka rakenduse ekspordivalidaatoriga; internetipanga import on eraldi kontroll.
