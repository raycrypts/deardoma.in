# Restricted ccTLDs Practical Registration Routes Research Notes

**Date:** 2026-10-18  
**Scope:** 142 ccTLDs analyzed for practical registration routes by non-resident individuals and small companies.  
**Output JSON:** `/app/conversations/6ad486a254482bbf594657de/research/cctld-intermediaries.json`

---

## Route Summary & Breakdown

| Route | Count | Description |
| :--- | :--- | :--- |
| `direct` | 81 | Open registration to anyone worldwide without local presence or trustee requirement |
| `intermediary` | 56 | Local presence required by registry rules, but registrars offer trustee / local proxy services |
| `personal_presence_only` | 3 | Strict personal presence / nexus required by registry; trustee services prohibited |
| `unavailable` | 2 | TLD is unassigned, un-delegated, or unavailable for public registration |
| `business_presence` | 0 | Requires a local legal business entity in country |
| `unknown` | 0 | Unconfirmed registration route |

---

## Acceptance Test Verdicts & Key Findings

1. **.de (Germany):**
   - **Route:** `intermediary`
   - **Official Registry:** DENIC (`https://www.denic.de/en/domains/de-domains/domain-guidelines`)
   - **Details:** DENIC Domain Guidelines require foreign registrants to name an Administrative Contact (Admin-C) residing in Germany. Accredited registrars (Hetzner, 101domain, EuroDNS, Gandi, INWX) automatically provide local Admin-C representation for foreign registrants at no additional charge.

2. **.eu (European Union):**
   - **Route:** `personal_presence_only`
   - **Official Registry:** EURid (`https://eurid.eu/en/knowledge-centre/rules-for-eu-domains/`)
   - **Details:** Under EURid Regulation (EU) 2019/517, registrants must be EU/EEA citizens (regardless of residence), natural persons residing in the EU/EEA, or undertakings/organizations established in the EU/EEA. EURid strictly prohibits proxy/trustee arrangements and actively revokes domains violating eligibility. Note: `businessPresenceAccepted: true` (EU-established companies qualify directly).

3. **.ca (Canada):**
   - **Route:** `personal_presence_only`
   - **Official Registry:** CIRA (`https://www.cira.ca/en/legal-policy-and-compliance/canadian-presence-requirements`)
   - **Details:** CIRA enforces Canadian Presence Requirements (CPR). Registrants must be Canadian citizens, permanent residents, aboriginal peoples, or Canadian corporations/partnerships. Trustee services are strictly prohibited by section 4.1g of the CIRA registration agreement.

4. **.us (United States):**
   - **Route:** `personal_presence_only`
   - **Official Registry:** Registry Services / .us (`https://www.about.us/policies`)
   - **Details:** Registrants must directly attest to US Nexus (US citizen, permanent resident, US entity, or foreign entity with bona fide presence/activities in the US). Trustee/proxy services are prohibited under .us registry policies.

5. **.fr (France):**
   - **Route:** `intermediary`
   - **Official Registry:** AFNIC (`https://www.afnic.fr/en/domain-names/register-a-domain-name/who-can-register-a-dot-fr-domain-name/`)
   - **Details:** AFNIC rules require the registrant or administrative contact to be located in the EU/EEA/EFTA. Major registrars (101domain, EuroDNS, Gandi, Netim) offer local trustee / proxy contact services for non-EU registrants (~$15–$30/year).

---

## Sources & Disagreements / Conflicted TLDs

### Registrar vs. Registry Disagreements
- **.de:** Some registrars market .de as "unrestricted / direct" because the local Admin-C service is seamlessly provided for free during checkout. However, DENIC official guidelines explicitly require a German administrative contact address, so the route is classified as `intermediary` with a $0 fee note.
- **.ie (Ireland):** Historic rules required proof of "need" and connection to Ireland. In 2018, IEDR removed the need test, allowing any entity with a commercial connection to Ireland (or EU residency) to register directly. Registrars (DNSimple, 101domain, EuroDNS) offer trustee service for foreign entities with no Irish links.
- **.tr (Turkey):** TRABIS implemented automated first-come, first-served registration without document requirements in September 2022 for .tr / .com.tr. Older documentation on some registrar sites still mentions business registration documents, but current registry operation is fully `direct`.
- **.sk (Slovakia):** SK-NIC liberalized .sk in 2020, allowing direct registration worldwide. Older registrar pages still reference local presence requirements.
- **.bq / .mhm:** Reserved/non-delegated codes in IANA database; classified as `unavailable`.
