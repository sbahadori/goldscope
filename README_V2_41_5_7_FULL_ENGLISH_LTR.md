# GoldScope v2.41.5.7 - Full English LTR UI

Builds on v2.41.5.6, reverting the Persian-first UI work.

Goal:
- Return the whole visible UI to English.
- Return the app layout to left-to-right.
- Return AI output display to LTR/monospace.
- Remove the prompt instruction that forced Persian output.

Changed:
- Navigation tabs are English again.
- Trade Plan dashboard is fully English.
- Trade Plan scenario labels, titles, sources, overlays, footer, and buttons are English.
- Header and warning text are English.
- AI Analysis display is English/LTR.
- Prompt builder no longer asks the model to answer in Persian.

Preserved:
- Dynamic `snapshot.tradeScenarioPlan` data path.
- Section 11 logic.
- tradeScenarioPlan object.
- BLS Sector Composition Parser.
- Evidence table strict replacement.
- Final note guard.
- Technical indicators and Technical Dashboard.
- No external dependencies.
- No keys or credentials.
