# Rule files

Every legal value the app uses lives here. The app reads **only** from these
files. Nothing legal is hard-coded in the source code.

| File | What it holds |
|---|---|
| `forums.json` | Forums, monetary limits, claim types, exclusions, time bars, rights of audience |
| `limitation.json` | Limitation Act 1959 periods and which one applies to each claim type |
| `fees.json` | Filing fees, only where an official page states them |
| `time-computation.json` | How time is counted under O 1 r 3, O 3 r 3 and O 7 r 8 |
| `roc2021-steps.json` | Stages and procedural steps with their periods |
| `public-holidays-2026.json`, `public-holidays-2027.json` | Public holidays used to skip non-court days |

**Each new year:** copy the latest holiday file, rename it (for example
`public-holidays-2028.json`), fill in MOM's list including any Monday that is a
holiday under s 4(2) of the Holidays Act 1998, and add it to `holidayFiles` in
`src/lib/rules/index.ts`. Until then the app warns when a date falls in a year
with no holiday file.

The app currently hides status labels (`SHOW_RULE_STATUS` in `src/lib/config.ts`).
The `status` field is still kept here as the audit trail.

## The shape of a rule

```json
{
  "id": "sct.limit.default",
  "title": "SCT prescribed limit",
  "value": 20000,
  "unit": "SGD",
  "source": {
    "instrument": "Small Claims Tribunals Act 1984",
    "provision": "s 2(1) and s 5(3)(a)",
    "url": "https://sso.agc.gov.sg/Act/SCTA1984?WholeDoc=1#pr2-"
  },
  "lastVerified": "2026-11-05",
  "status": "SOURCE_CHECKED",
  "checkedBy": "Claude",
  "verifiedBy": null,
  "explanation": "Plain-English sentence shown next to the result.",
  "learnMore": "Optional longer explanation for law students.",
  "caveats": ["Optional warnings"]
}
```

### `status`

| Value | Meaning | Badge in the app |
|---|---|---|
| `UNVERIFIED` | Not confirmed against a primary source | Red ⚠ UNVERIFIED |
| `SOURCE_CHECKED` | Matched against the cited source, not yet reviewed by a human | Amber "Pending review" |
| `VERIFIED` | Reviewed and signed off. `verifiedBy` must be filled in | Green ✓ Verified |

Only a human reviewer sets `VERIFIED`. The tests fail if a `VERIFIED` rule has no `verifiedBy`.

## How to change a rule

1. On GitHub, open the file (for example `rules/forums.json`) and click the pencil icon.
2. Change the value, the `source`, and set `lastVerified` to today's date (`YYYY-MM-DD`).
3. If you have checked it yourself against the primary source, set `"status": "VERIFIED"` and `"verifiedBy": "Your name"`.
4. Choose **Create a new branch for this commit and start a pull request**. Explain the change and paste the source link.
5. GitHub runs the tests, and Vercel builds a preview link. Check the preview, then merge.

The pull request history then becomes the audit trail for every rule change.
