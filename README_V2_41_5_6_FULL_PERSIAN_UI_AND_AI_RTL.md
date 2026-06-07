# GoldScope v2.41.5.6 - Full Persian UI + AI RTL Output

Builds on v2.41.5.5.

## Goal
- Make the main navigation fully Persian.
- Make AI Analysis UI more Persian-first.
- Force AI output to be generated in Persian.
- Display AI output in RTL format.
- Preserve logic, data paths, technical indicators, tradeScenarioPlan object, and report validators.

## Changes
- Tabs converted to Persian: خانه، نمودار، تکنیکال، سناریوها، رویدادها، سناریو، تحلیل AI، سلامت منابع، خروجی، تنظیمات.
- Added `faUiText()` helper for broad UI title/subtitle/badge localization.
- Added `localizeGoldScopeReportFa()` for display-side Persian rendering of the AI report.
- `Title` component now localizes titles/subtitles automatically.
- `Badge` auto-localizes plain string children.
- Header subtitle and critical warning localized.
- AI Analysis panel substantially localized.
- Prompt builder now instructs the local AI to output the final report fully in Persian, while preserving technical abbreviations in English when needed.
- AI Output panel now renders RTL and right-aligned.

## Preserved
- Snapshot path and `tradeScenarioPlan` object unchanged.
- Section 11 logic unchanged.
- Evidence table / final note / BLS parser logic unchanged.
- Technical dashboard logic unchanged.
- No new external dependencies.
