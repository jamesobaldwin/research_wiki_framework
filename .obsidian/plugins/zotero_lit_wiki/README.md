# Zotero Literature Importer

Local Obsidian plugin for importing a Zotero item into the current vault.

It creates:

- `Literature Notes/<citekey>.md`
- `Assets/<citekey>.pdf`

It then opens the literature note and PDF side by side for PDF++.

## Requirements

- Desktop Obsidian
- Zotero running locally
- Zotero local API enabled: Zotero Settings → Advanced → Allow other applications on this computer to communicate with Zotero
- The Zotero item must already have a PDF attachment

## Installation

1. Copy the folder `zotero-literature-importer` into your vault at:

   `.obsidian/plugins/zotero-literature-importer/`

2. Restart Obsidian.
3. Go to Settings → Community plugins.
4. Enable `Zotero Literature Importer`.
5. Run `Import Zotero paper into current vault` from the command palette.

## Settings

Settings → Zotero Literature Importer lets you configure:

- Zotero local API URL
- Literature notes folder
- Assets folder
- Whether to open note/PDF side by side
- The built-in literature-note template

## Notes

This is a local, desktop-only plugin because it uses Node APIs to read local Zotero files.
