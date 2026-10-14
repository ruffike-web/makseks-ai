# Coop Pank

Retrieved 2026-10-08 from the bank's [Gateway technical documentation](https://www.cooppank.ee/en/business/gateway-technical-documentation), Payment Initiation / new pain.001.001.09 section. The bank explicitly supports .09 and announces that .03 ends on 15 November 2026.

- [Original custom XSD](https://res30f.cooppank.ee/raw/upload/dokumendid/gateway_tehniline/pain.001.001.09.xsd), stored unchanged in `xsd/pain.001.001.09.xsd`. SHA-256: `B3209CA70C368B689653B2ACD58EB043BC5DE252419FCD67DEFDCA1B801DBB68`. No imported schemas.
- Bank-published [domestic example](https://res30f.cooppank.ee/raw/upload/v1716991574/dokumendid/est/gateway_tehniline/tehniline_dok/request_EestiMakse.xml) and [SEPA example](https://res30f.cooppank.ee/raw/upload/v1716991573/dokumendid/est/gateway_tehniline/tehniline_dok/request_SepaMakse.xml) are retained unchanged in `golden/`. These are legacy **.03** examples, not .09 fixtures; they are not used to claim .09 validation. The generated .09 regression is validated against the bank's actual .09 XSD in `tests/new-banks.test.ts`.

Profile: BIC EKRDEE22, Estonian account bank code 42, SEPA service code, individual booking (`false`), SLEV charges, nested execution date and BICFI. Domestic payments preserve both description in Ustrd and reference in Strd. Cross-border payments with a reference use Strd only, as the bank requires one or the other; the description stays in the app but is not included in that export. Existing Estonian 7-3-1 reference validation remains in force. A supplied address requires town and country.

Verification covers generated .09 domestic/cross-border XML, multiple dates, totals, invalid/missing XML elements, wrong namespace, unsafe entities, payer bank mismatch, addresses and missing schema. Internet-bank import has **not** been performed; the profile explicitly says so. Gateway documentation establishes the format, but live internet-bank acceptance remains to be tested.
