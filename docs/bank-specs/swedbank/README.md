# Swedbank (formerly Hansapank)

Retrieved 2026-10-08 from [Swedbank Estonia's format links](https://www.swedbank.ee/business/d2d/ebanking/gateway?language=ENG).

- [Implementation guide v2.2](https://www.swedbank.ee/static/business/payments/import/ISO20022_MIG_V2.2.pdf), pain.001.001.09.
- [Official Estonia XSD ZIP](https://www.swedbank.ee/static/business/payments/import/pain_001.001.09-Swed_xsd_EE.zip). Its unmodified `pain.001.001.09-Swed.xsd` is in `xsd/`. SHA-256: `6E88172503A03D6AD5D05AF2DA6CF10F4D889F06CC50B9DACB5B05CDB905F726`. No imported schemas.
- [Official examples ZIP](https://www.swedbank.ee/static/business/payments/import/ISO_payment_examples_EE.zip), extracted unchanged in `golden/`. Tests validate the original domestic and European examples. International and mass examples are source evidence only; those payment workflows are outside this app's scope.

Profile: BIC HABAEE2X, Estonian account bank code 22, SEPA service code, individual booking, SLEV charges, nested date and BICFI. MIG pages 19 and 23 require creditor names up to 70 characters for ordinary domestic/European transfers, and at most 130 combined characters when sending domestic description plus reference. Both rules are enforced without truncation. A supplied address requires town and country, also meeting the guide's later address rule.

Domestic payments send Ustrd plus Strd, matching the bank's domestic example. Cross-border payments with a reference send only Strd, per MIG page 23: the description remains in the app but is not included in that export. Existing app scope supports Estonian 7-3-1 numeric references only; RF/ISO11649 references remain rejected rather than falsely claiming support.

Tests cover official examples, generated domestic/cross-border files, date grouping, sums, profile limits, incorrect accounts/addresses, schema-invalid XML, unsafe entities and missing XSD. Internet-bank import has **not** been performed; the profile explicitly says so.
