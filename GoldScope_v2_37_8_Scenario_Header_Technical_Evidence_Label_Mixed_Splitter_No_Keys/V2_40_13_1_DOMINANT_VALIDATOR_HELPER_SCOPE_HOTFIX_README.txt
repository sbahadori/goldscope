GoldScope v2.40.13.1 - Dominant Validator Helper Scope Hotfix

Builds on v2.40.13.

Purpose:
Fix runtime ReferenceError:
extractDominantScenarioFromReport is not defined

Cause:
v2.40.13 added new validator helper functions, but at runtime the validateAiGoldReport function could not access extractDominantScenarioFromReport.

Fix:
- Places local helper functions directly inside validateAiGoldReport:
  - extractDominantScenarioFromReportLocal
  - snapshotRequiresWaitNeutralScenarioLocal
  - reportAdmitsDirectionalConfirmationMissingLocal
  - collectTechnicalSnapshotNumbersLocal
  - numberApproximatelyMatchesSnapshotLocal
  - collectMentionedTechnicalNumericClaimsLocal
  - reportUsesDataQualityWarningAsMarketSignalLocal
- Repoints the new v2.40.13 validator rules to these local helpers.

No logic changes:
- No change to macro logic.
- No change to NFP/CPI/yield validators.
- No change to Safe Report logic.
- No change to strategy modules or technical indicators.
- No change to sanitizer behavior.
- No credential/FRED key files are included or overwritten.
