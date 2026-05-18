const {
  Plugin,
  Notice,
  Modal,
  Setting,
  FuzzySuggestModal,
  PluginSettingTab,
} = require("obsidian");

const http = require("http");
const https = require("https");
const fs = require("fs/promises");
const { fileURLToPath } = require("url");

const DEFAULT_TEMPLATE = `---
title: {{yaml_title}}
citekey: {{yaml_citekey}}
zotero_item_key: {{yaml_zotero_item_key}}
zotero_attachment_key: {{yaml_zotero_attachment_key}}
authors: {{yaml_authors}}
year: {{yaml_year}}
date: {{yaml_date}}
publication: {{yaml_publication}}
doi: {{yaml_doi}}
url: {{yaml_url}}
pdf: "[[{{pdf_path}}]]"
status: queued 
tags:
  - paper
---

# {{title}}

## Abstract

{{abstract}}

## My summary


## Key claims


## Methods / technical details


## Results


## Caveats / limitations


## Connections to my work


## PDF++ highlights and notes

`;

const DEFAULT_REFERENCE_TEMPLATE = `---
title: {{yaml_title}}
citekey: {{yaml_citekey}}
zotero_item_key: {{yaml_zotero_item_key}}
zotero_attachment_key: {{yaml_zotero_attachment_key}}
authors: {{yaml_authors}}
year: {{yaml_year}}
doi: {{yaml_doi}}
arxiv_id: {{yaml_arxiv_id}}
url: {{yaml_url}}
venue: {{yaml_venue}}
pdf: "[[{{pdf_path}}]]"
topics: []
source_type: reference
status: queued
---

# {{title}}

## Abstract

{{abstract}}

## Datasets / simulations

*To be populated by ingest.*

## Methods or techniques introduced

*To be populated by ingest.*

## Cited by my work

*(none yet)*

## PDF++ highlights and notes

*(user-only section)*
`;

const DEFAULT_SETTINGS = {
  zoteroApiUrl: "http://127.0.0.1:23119/api/users/0",
  literatureNotesFolder: "Literature Notes",
  referenceNotesFolder: "ReferenceNotes",
  assetsFolder: "Assets",
  openSideBySide: true,
  resultLimit: 50,
  noteTemplate: DEFAULT_TEMPLATE,
  referenceNoteTemplate: DEFAULT_REFERENCE_TEMPLATE,
};

function normalizeFolderPath(path) {
  return String(path || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function joinVaultPath(...parts) {
  return parts
    .map((p) => String(p || "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function safeFilename(s) {
  return String(s || "untitled")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/\\:*?"<>|#^\[\]]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function yamlString(s) {
  return JSON.stringify(String(s || ""));
}

function yearFromDate(date) {
  const match = String(date || "").match(/\d{4}/);
  return match ? match[0] : "";
}

function creatorsToString(creators) {
  if (!Array.isArray(creators)) return "";

  return creators
    .map((creator) => {
      if (creator.name) return creator.name;
      return [creator.firstName, creator.lastName].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

function firstAuthorLastName(creators) {
  if (!Array.isArray(creators) || creators.length === 0) return "unknown";

  const first = creators[0];
  if (first.lastName) return first.lastName;
  if (first.name) return first.name.split(/\s+/).slice(-1)[0];

  return "unknown";
}

function shortTitle(title) {
  return String(title || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 3)
    .join("");
}

function generatedCitekey(data) {
  const author = safeFilename(firstAuthorLastName(data.creators)).toLowerCase();
  const year = yearFromDate(data.date) || "nd";
  const stitle = shortTitle(data.title);
  return safeFilename(`${author}${year}${stitle}`);
}

function requestBuffer(url, options = {}, redirectsLeft = 5) {
  return new Promise(async (resolve, reject) => {
    try {
      if (url.startsWith("file:")) {
        const filePath = fileURLToPath(url);
        const buffer = await fs.readFile(filePath);
        resolve(buffer);
        return;
      }

      if (!url.startsWith("http:") && !url.startsWith("https:")) {
        reject(new Error(`Unsupported URL protocol: ${url}`));
        return;
      }

      const lib = url.startsWith("https:") ? https : http;

      const req = lib.request(
        url,
        {
          method: "GET",
          headers: {
            "Zotero-API-Version": "3",
            Accept: options.accept || "*/*",
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            redirectsLeft > 0
          ) {
            res.resume();
            const redirectedUrl = new URL(res.headers.location, url).toString();
            resolve(requestBuffer(redirectedUrl, options, redirectsLeft - 1));
            return;
          }

          const chunks = [];

          res.on("data", (chunk) => chunks.push(chunk));

          res.on("end", () => {
            const buffer = Buffer.concat(chunks);

            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(
                new Error(
                  `HTTP ${res.statusCode} from Zotero: ${buffer.toString("utf8")}`
                )
              );
              return;
            }

            resolve(buffer);
          });
        }
      );

      req.on("error", reject);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function getJson(url) {
  console.log("Zotero JSON request:", url);
  const buffer = await requestBuffer(url, { accept: "application/json" });
  return JSON.parse(buffer.toString("utf8"));
}

async function getBinary(url) {
  console.log("Zotero PDF request:", url);
  return await requestBuffer(url, { accept: "application/pdf" });
}

async function ensureFolderRecursive(app, folderPath) {
  const normalized = normalizeFolderPath(folderPath);
  if (!normalized) return;

  const parts = normalized.split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}

function renderTemplate(template, vars) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "";
  });
}

class TextPromptModal extends Modal {
  constructor(app, title, placeholder, initialValue) {
    super(app);
    this.title = title;
    this.placeholder = placeholder;
    this.initialValue = initialValue || "";
    this.result = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.title });

    const input = contentEl.createEl("input", {
      type: "text",
      placeholder: this.placeholder,
      value: this.initialValue,
    });

    input.style.width = "100%";
    input.style.marginBottom = "1rem";

    const buttonRow = contentEl.createDiv();
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "0.5rem";
    buttonRow.style.justifyContent = "flex-end";

    const cancelButton = buttonRow.createEl("button", { text: "Cancel" });
    const submitButton = buttonRow.createEl("button", { text: "Search" });
    submitButton.addClass("mod-cta");

    const submit = () => {
      this.result = input.value.trim();
      this.close();
    };

    submitButton.addEventListener("click", submit);
    cancelButton.addEventListener("click", () => {
      this.result = null;
      this.close();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
      if (event.key === "Escape") {
        this.result = null;
        this.close();
      }
    });

    window.setTimeout(() => input.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }

  openAndGetValue() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class GenericSuggestModal extends FuzzySuggestModal {
  constructor(app, items, getText, placeholder) {
    super(app);
    this.items = items;
    this.getText = getText;
    this.result = null;
    this.resolved = false;
    this.setPlaceholder(placeholder || "Choose an item");
  }

  getItems() {
    return this.items;
  }

  getItemText(item) {
    return this.getText(item);
  }

  resolveOnce(value) {
    if (this.resolved) return;
    this.resolved = true;
    this.result = value;
    if (this.resolve) this.resolve(value);
  }

  onChooseItem(item) {
    this.resolveOnce(item);
  }

  onClose() {
    super.onClose();

    // In some Obsidian/Electron builds, FuzzySuggestModal can fire onClose
    // before onChooseItem. Defer cancellation by one tick so a real selection
    // has a chance to resolve first.
    window.setTimeout(() => {
      if (!this.resolved) this.resolveOnce(null);
    }, 0);
  }

  openAndGetValue() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class MultiSelectModal extends Modal {
  constructor(app, items, getText, placeholder) {
    super(app);
    this.items = items;
    this.getText = getText;
    this.placeholder = placeholder || "Choose items";
    this.selected = new Set();
    this.result = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.placeholder });

    const searchInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "Filter items...",
    });
    searchInput.style.width = "100%";
    searchInput.style.marginBottom = "0.75rem";

    const listContainer = contentEl.createDiv();
    listContainer.style.maxHeight = "400px";
    listContainer.style.overflowY = "auto";
    listContainer.style.border = "1px solid var(--background-modifier-border)";
    listContainer.style.borderRadius = "4px";
    listContainer.style.padding = "0.5rem";
    listContainer.style.marginBottom = "0.75rem";

    const buttonRow = contentEl.createDiv();
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "0.5rem";
    buttonRow.style.justifyContent = "space-between";
    buttonRow.style.alignItems = "center";

    const selectionInfo = buttonRow.createEl("span");
    selectionInfo.style.color = "var(--text-muted)";
    selectionInfo.style.fontSize = "0.85em";

    const buttonGroup = buttonRow.createDiv();
    buttonGroup.style.display = "flex";
    buttonGroup.style.gap = "0.5rem";

    const cancelButton = buttonGroup.createEl("button", { text: "Cancel" });
    const importButton = buttonGroup.createEl("button", { text: "Import" });
    importButton.addClass("mod-cta");

    const updateButtonLabel = () => {
      const n = this.selected.size;
      importButton.textContent = `Import ${n} selected`;
      importButton.disabled = n === 0;
      selectionInfo.textContent = `${n} of ${this.items.length} selected`;
    };

    const renderList = (filter) => {
      listContainer.empty();
      const lowerFilter = String(filter || "").toLowerCase();
      const matchingItems = this.items.filter((item) => {
        if (!lowerFilter) return true;
        return this.getText(item).toLowerCase().includes(lowerFilter);
      });

      if (!matchingItems.length) {
        const empty = listContainer.createEl("div", {
          text: "No items match the filter.",
        });
        empty.style.color = "var(--text-muted)";
        empty.style.padding = "0.5rem";
        return;
      }

      matchingItems.forEach((item) => {
        const row = listContainer.createDiv();
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "0.5rem";
        row.style.padding = "0.25rem";
        row.style.cursor = "pointer";
        row.style.borderRadius = "3px";

        const checkbox = row.createEl("input", { type: "checkbox" });
        checkbox.checked = this.selected.has(item);

        const label = row.createEl("span", { text: this.getText(item) });
        label.style.flex = "1";

        const toggle = () => {
          if (this.selected.has(item)) {
            this.selected.delete(item);
            checkbox.checked = false;
          } else {
            this.selected.add(item);
            checkbox.checked = true;
          }
          updateButtonLabel();
        };

        checkbox.addEventListener("click", (event) => {
          event.stopPropagation();
          toggle();
        });
        row.addEventListener("click", toggle);

        row.addEventListener("mouseenter", () => {
          row.style.backgroundColor = "var(--background-modifier-hover)";
        });
        row.addEventListener("mouseleave", () => {
          row.style.backgroundColor = "";
        });
      });
    };

    updateButtonLabel();

    cancelButton.addEventListener("click", () => {
      this.result = null;
      this.close();
    });

    importButton.addEventListener("click", () => {
      if (this.selected.size === 0) return;
      this.result = Array.from(this.selected);
      this.close();
    });

    searchInput.addEventListener("input", () => {
      renderList(searchInput.value);
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.result = null;
        this.close();
      }
    });

    renderList("");
    window.setTimeout(() => searchInput.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }

  openAndGetValue() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class BatchStagingModal extends Modal {
  constructor(app, staged, getText) {
    super(app);
    this.staged = staged;
    this.getText = getText;
    this.result = null;
    this.mode = "literature";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Batch import staging" });

    // Mode toggle: Literature | Reference
    const modeRow = contentEl.createDiv();
    modeRow.style.display = "flex";
    modeRow.style.gap = "0.5rem";
    modeRow.style.alignItems = "center";
    modeRow.style.marginBottom = "0.75rem";
    modeRow.createEl("span", { text: "Default for new additions:" }).style.color = "var(--text-muted)";

    const litBtn = modeRow.createEl("button", { text: "Literature note" });
    const refBtn = modeRow.createEl("button", { text: "Reference note" });

    const updateModeButtons = () => {
      if (this.mode === "literature") {
        litBtn.addClass("mod-cta");
        refBtn.removeClass("mod-cta");
      } else {
        refBtn.addClass("mod-cta");
        litBtn.removeClass("mod-cta");
      }
    };

    litBtn.addEventListener("click", () => { this.mode = "literature"; updateModeButtons(); });
    refBtn.addEventListener("click", () => { this.mode = "reference"; updateModeButtons(); });
    updateModeButtons();

    const counterEl = contentEl.createEl("p");
    counterEl.style.color = "var(--text-muted)";
    counterEl.style.marginTop = "0";

    const listContainer = contentEl.createDiv();
    listContainer.style.maxHeight = "400px";
    listContainer.style.overflowY = "auto";
    listContainer.style.border = "1px solid var(--background-modifier-border)";
    listContainer.style.borderRadius = "4px";
    listContainer.style.padding = "0.5rem";
    listContainer.style.marginBottom = "0.75rem";
    listContainer.style.minHeight = "100px";

    const buttonRow = contentEl.createDiv();
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "0.5rem";
    buttonRow.style.justifyContent = "flex-end";
    buttonRow.style.flexWrap = "wrap";

    const cancelButton = buttonRow.createEl("button", { text: "Cancel" });
    const addButton = buttonRow.createEl("button", { text: "Add from Zotero search…" });
    const importButton = buttonRow.createEl("button", { text: "Import" });
    importButton.addClass("mod-cta");

    const updateCounter = () => {
      const n = this.staged.length;
      if (n === 0) {
        counterEl.textContent = "No papers staged yet. Click \"Add from Zotero search…\" to begin.";
        return;
      }
      const litCount = this.staged.filter((i) => (i._importMode || "literature") === "literature").length;
      const refCount = n - litCount;
      let modeDesc;
      if (refCount === 0) modeDesc = "all literature";
      else if (litCount === 0) modeDesc = "all reference";
      else modeDesc = `${litCount} literature, ${refCount} reference`;
      counterEl.textContent = `${n} paper${n === 1 ? "" : "s"} staged (${modeDesc}).`;
    };

    const refresh = () => {
      const n = this.staged.length;
      updateCounter();
      importButton.textContent = `Import ${n}`;
      importButton.disabled = n === 0;

      listContainer.empty();
      if (!n) {
        const empty = listContainer.createEl("div", { text: "Empty." });
        empty.style.color = "var(--text-muted)";
        empty.style.padding = "0.5rem";
        return;
      }

      this.staged.forEach((item, index) => {
        const row = listContainer.createDiv();
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "0.5rem";
        row.style.padding = "0.25rem";
        row.style.borderRadius = "3px";

        const label = row.createEl("span", { text: this.getText(item) });
        label.style.flex = "1";

        const modeSelect = row.createEl("select");
        modeSelect.style.width = "9rem";
        modeSelect.createEl("option", { text: "Literature", value: "literature" });
        modeSelect.createEl("option", { text: "Reference", value: "reference" });
        modeSelect.value = item._importMode || "literature";
        modeSelect.addEventListener("change", () => {
          item._importMode = modeSelect.value;
          updateCounter();
        });

        const removeButton = row.createEl("button", { text: "Remove" });
        removeButton.addEventListener("click", () => {
          this.staged.splice(index, 1);
          refresh();
        });

        row.addEventListener("mouseenter", () => {
          row.style.backgroundColor = "var(--background-modifier-hover)";
        });
        row.addEventListener("mouseleave", () => {
          row.style.backgroundColor = "";
        });
      });
    };

    refresh();

    cancelButton.addEventListener("click", () => {
      this.result = { kind: "cancel" };
      this.close();
    });
    addButton.addEventListener("click", () => {
      this.result = { kind: "addMore", mode: this.mode };
      this.close();
    });
    importButton.addEventListener("click", () => {
      if (this.staged.length === 0) return;
      this.result = { kind: "import" };
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }

  openAndGetValue() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class ZoteroLiteratureImporterPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "import-zotero-paper",
      name: "Import Zotero paper into current vault",
      callback: async () => this.importZoteroPaper(),
    });

    this.addCommand({
      id: "batch-import-zotero-papers",
      name: "Batch import Zotero papers into current vault",
      callback: async () => this.batchImportZoteroPapers(),
    });

    this.addCommand({
      id: "import-zotero-reference",
      name: "Import Zotero paper as reference",
      callback: async () => this.importZoteroPaperAsReference(),
    });

    this.addRibbonIcon("book-open", "Import Zotero paper", async () => {
      await this.importZoteroPaper();
    });

    this.addRibbonIcon("database", "Import Zotero paper as reference", async () => {
      await this.importZoteroPaperAsReference();
    });

    this.addSettingTab(new ZoteroLiteratureImporterSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async importZoteroPaper() {
    try {
      const query = await new TextPromptModal(
        this.app,
        "Search Zotero",
        "Title, author, year, DOI, or keyword"
      ).openAndGetValue();

      if (!query) {
        new Notice("No Zotero query entered.");
        return;
      }

      new Notice(`Searching Zotero for: ${query}`);

      const item = await this.chooseZoteroItem(query);
      if (!item) {
        new Notice("Import cancelled.");
        return;
      }

      await this.importChosenItem(item);
    } catch (err) {
      console.error("Zotero Literature Importer error:", err);
      new Notice(`Zotero import failed: ${err.message || err}`);
    }
  }

  async batchImportZoteroPapers() {
    try {
      const staged = [];

      while (true) {
        const action = await new BatchStagingModal(
          this.app,
          staged,
          (item) => this.itemDisplayText(item)
        ).openAndGetValue();

        if (!action || action.kind === "cancel") {
          new Notice("Batch import cancelled.");
          return;
        }

        if (action.kind === "addMore") {
          const query = await new TextPromptModal(
            this.app,
            "Search Zotero",
            "Title, author, year, DOI, or keyword"
          ).openAndGetValue();

          if (!query) continue;

          new Notice(`Searching Zotero for: ${query}`);

          let selected;
          try {
            selected = await this.chooseMultipleZoteroItems(query);
          } catch (err) {
            console.error("Zotero search failed:", err);
            new Notice(`Search failed: ${err.message || err}`);
            continue;
          }

          if (selected && selected.length) {
            let added = 0;
            let duplicates = 0;
            const defaultMode = action.mode || "literature";
            for (const item of selected) {
              if (staged.find((s) => s.key === item.key)) {
                duplicates++;
              } else {
                item._importMode = defaultMode;
                staged.push(item);
                added++;
              }
            }
            if (duplicates > 0) {
              new Notice(`Added ${added}, skipped ${duplicates} already staged.`);
            }
          }
          continue;
        }

        if (action.kind === "import") {
          break;
        }
      }

      if (!staged.length) {
        new Notice("Nothing to import.");
        return;
      }

      const litCount = staged.filter((i) => (i._importMode || "literature") === "literature").length;
      const refCount = staged.length - litCount;
      const modeDesc = refCount === 0 ? "literature" : litCount === 0 ? "reference" : "mixed modes";
      new Notice(`Starting batch import of ${staged.length} paper${staged.length === 1 ? "" : "s"} (${modeDesc})...`);

      let succeeded = 0;
      const failed = [];

      for (let i = 0; i < staged.length; i++) {
        const item = staged[i];
        const data = item.data || {};
        const citekey = data.citationKey || generatedCitekey(data);
        const itemMode = item._importMode || "literature";
        new Notice(`Importing ${i + 1}/${staged.length}: ${citekey}`);

        try {
          if (itemMode === "reference") {
            await this.importChosenItemAsReference(item, { quiet: true });
          } else {
            await this.importChosenItem(item, { openAfterImport: false, quiet: true });
          }
          succeeded++;
        } catch (err) {
          console.error(`Batch import failed for ${citekey}:`, err);
          failed.push({ citekey, error: err.message || String(err) });
        }
      }

      if (failed.length === 0) {
        new Notice(`Batch import complete: ${succeeded} imported.`, 8000);
      } else {
        new Notice(
          `Batch import finished: ${succeeded} imported, ${failed.length} failed. See console for details.`,
          10000
        );
        console.error("Batch import failures:", failed);
      }
    } catch (err) {
      console.error("Zotero Literature Importer batch error:", err);
      new Notice(`Batch import failed: ${err.message || err}`);
    }
  }

  async fetchZoteroItems(query) {
    const api = this.settings.zoteroApiUrl.replace(/\/+$/g, "");
    const limit = Number(this.settings.resultLimit) || 50;

    const searchUrl =
      `${api}/items?format=json` +
      `&include=data` +
      `&q=${encodeURIComponent(query)}` +
      `&qmode=everything` +
      `&sort=dateModified` +
      `&direction=desc` +
      `&limit=${encodeURIComponent(limit)}`;

    let items = await getJson(searchUrl);
    items = (items || []).filter((item) => item.data?.itemType !== "attachment");

    if (!items.length) {
      new Notice("No search results. Showing recent Zotero items instead.");
      const recentUrl =
        `${api}/items?format=json&include=data` +
        `&sort=dateModified&direction=desc&limit=${encodeURIComponent(limit)}`;
      items = await getJson(recentUrl);
      items = (items || []).filter((item) => item.data?.itemType !== "attachment");
    }

    if (!items.length) throw new Error("No Zotero items found.");

    return items;
  }

  itemDisplayText(item) {
    const data = item.data || {};
    const year = yearFromDate(data.date);
    const authors = creatorsToString(data.creators);
    return `${data.title || "Untitled"}${year ? ` (${year})` : ""}${authors ? ` — ${authors}` : ""}`;
  }

  async chooseZoteroItem(query) {
    const items = await this.fetchZoteroItems(query);

    return await new GenericSuggestModal(
      this.app,
      items,
      (item) => this.itemDisplayText(item),
      "Choose Zotero item"
    ).openAndGetValue();
  }

  async chooseMultipleZoteroItems(query) {
    const items = await this.fetchZoteroItems(query);

    return await new MultiSelectModal(
      this.app,
      items,
      (item) => this.itemDisplayText(item),
      "Choose Zotero items to import"
    ).openAndGetValue();
  }

  async importChosenItem(item, options = {}) {
    const { openAfterImport = true, quiet = false } = options;

    const api = this.settings.zoteroApiUrl.replace(/\/+$/g, "");
    const data = item.data || {};
    const citekey = data.citationKey || generatedCitekey(data);

    const assetsFolder = normalizeFolderPath(this.settings.assetsFolder);
    const literatureNotesFolder = normalizeFolderPath(this.settings.literatureNotesFolder);

    const pdfPath = joinVaultPath(assetsFolder, `${citekey}.pdf`);
    const notePath = joinVaultPath(literatureNotesFolder, `${citekey}.md`);

    await ensureFolderRecursive(this.app, assetsFolder);
    await ensureFolderRecursive(this.app, literatureNotesFolder);

    const attachment = await this.choosePdfAttachment(item);
    if (!attachment) return;

    const pdfFileExists = Boolean(this.app.vault.getAbstractFileByPath(pdfPath));
    if (!pdfFileExists) {
      if (!quiet) new Notice("Copying PDF into vault assets folder...");
      const binary = await getBinary(`${api}/items/${attachment.key}/file`);
      await this.app.vault.adapter.writeBinary(pdfPath, binary);
    }

    let noteFile = this.app.vault.getAbstractFileByPath(notePath);
    if (!noteFile) {
      const note = this.createLiteratureNote(item, attachment, citekey, pdfPath);
      noteFile = await this.app.vault.create(notePath, note);
    } else if (!quiet) {
      new Notice(`Literature note already exists: ${notePath}`);
    }

    if (openAfterImport) {
      if (this.settings.openSideBySide) {
        await this.openNoteAndPdf(noteFile, pdfPath);
      } else {
        await this.app.workspace.getLeaf(false).openFile(noteFile);
      }
    }

    if (!quiet) new Notice(`Imported ${citekey}`);
  }

  async importZoteroPaperAsReference() {
    try {
      const query = await new TextPromptModal(
        this.app,
        "Search Zotero (import as reference)",
        "Title, author, year, DOI, or keyword"
      ).openAndGetValue();

      if (!query) {
        new Notice("No Zotero query entered.");
        return;
      }

      new Notice(`Searching Zotero for: ${query}`);

      const item = await this.chooseZoteroItem(query);
      if (!item) {
        new Notice("Import cancelled.");
        return;
      }

      await this.importChosenItemAsReference(item);
    } catch (err) {
      console.error("Zotero Literature Importer error:", err);
      new Notice(`Zotero reference import failed: ${err.message || err}`);
    }
  }

  async importChosenItemAsReference(item, options = {}) {
    const { quiet = false } = options;

    const api = this.settings.zoteroApiUrl.replace(/\/+$/g, "");
    const data = item.data || {};
    const citekey = data.citationKey || generatedCitekey(data);

    const assetsFolder = normalizeFolderPath(this.settings.assetsFolder);
    const referenceNotesFolder = normalizeFolderPath(this.settings.referenceNotesFolder);

    const pdfPath = joinVaultPath(assetsFolder, `${citekey}.pdf`);
    const notePath = joinVaultPath(referenceNotesFolder, `${citekey}.md`);

    await ensureFolderRecursive(this.app, assetsFolder);
    await ensureFolderRecursive(this.app, referenceNotesFolder);

    const attachment = await this.choosePdfAttachment(item);
    if (!attachment) return;

    const pdfFileExists = Boolean(this.app.vault.getAbstractFileByPath(pdfPath));
    if (!pdfFileExists) {
      if (!quiet) new Notice("Copying PDF into vault assets folder...");
      const binary = await getBinary(`${api}/items/${attachment.key}/file`);
      await this.app.vault.adapter.writeBinary(pdfPath, binary);
    }

    let noteFile = this.app.vault.getAbstractFileByPath(notePath);
    if (!noteFile) {
      const note = this.createReferenceNote(item, attachment, citekey, pdfPath);
      noteFile = await this.app.vault.create(notePath, note);
    } else if (!quiet) {
      new Notice(`Reference note already exists: ${notePath}`);
    }

    // Do NOT auto-open reference notes — they are not meant to be read
    if (!quiet) new Notice(`Imported ${citekey} as reference`);
  }

  createReferenceNote(item, attachment, citekey, pdfPath) {
    const data = item.data || {};
    const authors = creatorsToString(data.creators);
    const year = yearFromDate(data.date);
    const venue = data.publicationTitle || data.proceedingsTitle || data.bookTitle || "";

    // arXiv ID: may be stored in archiveID as "arXiv:2301.xxxxx"
    let arxivId = "";
    if (data.archiveID) {
      arxivId = String(data.archiveID).replace(/^arXiv:\s*/i, "").trim();
    }

    const vars = {
      title: data.title || citekey,
      citekey,
      zotero_item_key: item.key,
      zotero_attachment_key: attachment.key,
      authors,
      year,
      doi: data.DOI || "",
      arxiv_id: arxivId,
      url: data.url || "",
      venue,
      pdf_path: pdfPath,
      abstract: data.abstractNote || "*To be extracted by ingest.*",

      yaml_title: yamlString(data.title || citekey),
      yaml_citekey: yamlString(citekey),
      yaml_zotero_item_key: yamlString(item.key),
      yaml_zotero_attachment_key: yamlString(attachment.key),
      yaml_authors: yamlString(authors),
      yaml_year: yamlString(year),
      yaml_doi: yamlString(data.DOI || ""),
      yaml_arxiv_id: yamlString(arxivId),
      yaml_url: yamlString(data.url || ""),
      yaml_venue: yamlString(venue),
    };

    return renderTemplate(this.settings.referenceNoteTemplate, vars);
  }

  async choosePdfAttachment(item) {
    const api = this.settings.zoteroApiUrl.replace(/\/+$/g, "");
    const childrenUrl = `${api}/items/${item.key}/children?format=json&include=data&limit=100`;
    const children = await getJson(childrenUrl);

    const pdfAttachments = (children || []).filter((child) => {
      const data = child.data || {};
      return (
        data.itemType === "attachment" &&
        (
          data.contentType === "application/pdf" ||
          String(data.filename || "").toLowerCase().endsWith(".pdf") ||
          String(data.title || "").toLowerCase().endsWith(".pdf")
        )
      );
    });

    if (!pdfAttachments.length) {
      throw new Error(`No PDF attachment found for Zotero item: ${item.data?.title || item.key}`);
    }

    if (pdfAttachments.length === 1) return pdfAttachments[0];

    return await new GenericSuggestModal(
      this.app,
      pdfAttachments,
      (attachment) => {
        const data = attachment.data || {};
        return data.filename || data.title || attachment.key;
      },
      "Choose PDF attachment"
    ).openAndGetValue();
  }

  createLiteratureNote(item, attachment, citekey, pdfPath) {
    const data = item.data || {};
    const authors = creatorsToString(data.creators);
    const year = yearFromDate(data.date);
    const publication = data.publicationTitle || data.proceedingsTitle || data.bookTitle || "";

    const vars = {
      title: data.title || citekey,
      citekey,
      zotero_item_key: item.key,
      zotero_attachment_key: attachment.key,
      authors,
      year,
      date: data.date || "",
      publication,
      doi: data.DOI || "",
      url: data.url || "",
      pdf_path: pdfPath,
      abstract: data.abstractNote || "",

      yaml_title: yamlString(data.title || citekey),
      yaml_citekey: yamlString(citekey),
      yaml_zotero_item_key: yamlString(item.key),
      yaml_zotero_attachment_key: yamlString(attachment.key),
      yaml_authors: yamlString(authors),
      yaml_year: yamlString(year),
      yaml_date: yamlString(data.date || ""),
      yaml_publication: yamlString(publication),
      yaml_doi: yamlString(data.DOI || ""),
      yaml_url: yamlString(data.url || ""),
    };

    return renderTemplate(this.settings.noteTemplate, vars);
  }

  async openNoteAndPdf(noteFile, pdfPath) {
    const pdfFile = this.app.vault.getAbstractFileByPath(pdfPath);

    await this.app.workspace.getLeaf(false).openFile(noteFile);

    if (pdfFile) {
      await this.app.workspace.getLeaf("split", "vertical").openFile(pdfFile);
    }
  }
}

class ZoteroLiteratureImporterSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Zotero Literature Importer" });

    new Setting(containerEl)
      .setName("Zotero local API URL")
      .setDesc("Default: http://127.0.0.1:23119/api/users/0. Zotero must be open and local API access must be enabled.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.zoteroApiUrl)
          .setValue(this.plugin.settings.zoteroApiUrl)
          .onChange(async (value) => {
            this.plugin.settings.zoteroApiUrl = value.trim() || DEFAULT_SETTINGS.zoteroApiUrl;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Literature notes folder")
      .setDesc("Folder where generated literature notes are created.")
      .addText((text) =>
        text
          .setPlaceholder("Literature Notes")
          .setValue(this.plugin.settings.literatureNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.literatureNotesFolder = value.trim() || DEFAULT_SETTINGS.literatureNotesFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Reference notes folder")
      .setDesc("Folder where generated reference notes are created (papers cited for datasets or infrastructure only).")
      .addText((text) =>
        text
          .setPlaceholder("ReferenceNotes")
          .setValue(this.plugin.settings.referenceNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.referenceNotesFolder = value.trim() || DEFAULT_SETTINGS.referenceNotesFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Assets folder")
      .setDesc("Folder where copied PDFs are saved.")
      .addText((text) =>
        text
          .setPlaceholder("Assets")
          .setValue(this.plugin.settings.assetsFolder)
          .onChange(async (value) => {
            this.plugin.settings.assetsFolder = value.trim() || DEFAULT_SETTINGS.assetsFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Search result limit")
      .setDesc("Maximum number of Zotero items returned in the picker.")
      .addText((text) =>
        text
          .setPlaceholder("50")
          .setValue(String(this.plugin.settings.resultLimit))
          .onChange(async (value) => {
            const parsed = Number(value);
            this.plugin.settings.resultLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Open note and PDF side by side")
      .setDesc("After import, open the literature note and copied PDF in a vertical split.")
      .addToggle((toggle) =>
        toggle
          .setValue(Boolean(this.plugin.settings.openSideBySide))
          .onChange(async (value) => {
            this.plugin.settings.openSideBySide = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Literature note template" });
    containerEl.createEl("p", {
      text: "Available placeholders: {{title}}, {{citekey}}, {{authors}}, {{year}}, {{date}}, {{publication}}, {{doi}}, {{url}}, {{pdf_path}}, {{abstract}}, {{zotero_item_key}}, {{zotero_attachment_key}}, and YAML-safe versions prefixed with yaml_.",
    });

    const textArea = containerEl.createEl("textarea");
    textArea.value = this.plugin.settings.noteTemplate || DEFAULT_TEMPLATE;
    textArea.style.width = "100%";
    textArea.style.minHeight = "420px";
    textArea.style.fontFamily = "var(--font-monospace)";

    textArea.addEventListener("change", async () => {
      this.plugin.settings.noteTemplate = textArea.value;
      await this.plugin.saveSettings();
      new Notice("Zotero importer template saved.");
    });

    new Setting(containerEl)
      .setName("Reset template")
      .setDesc("Restore the built-in default literature-note template.")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.noteTemplate = DEFAULT_TEMPLATE;
          await this.plugin.saveSettings();
          this.display();
          new Notice("Template reset.");
        })
      );

    containerEl.createEl("h3", { text: "Reference note template" });
    containerEl.createEl("p", {
      text: "Available placeholders: {{title}}, {{citekey}}, {{authors}}, {{year}}, {{doi}}, {{arxiv_id}}, {{url}}, {{venue}}, {{pdf_path}}, {{abstract}}, {{zotero_item_key}}, {{zotero_attachment_key}}, and YAML-safe versions prefixed with yaml_ (yaml_title, yaml_citekey, yaml_authors, yaml_year, yaml_doi, yaml_arxiv_id, yaml_url, yaml_venue, yaml_zotero_item_key, yaml_zotero_attachment_key).",
    });

    const refTextArea = containerEl.createEl("textarea");
    refTextArea.value = this.plugin.settings.referenceNoteTemplate || DEFAULT_REFERENCE_TEMPLATE;
    refTextArea.style.width = "100%";
    refTextArea.style.minHeight = "420px";
    refTextArea.style.fontFamily = "var(--font-monospace)";

    refTextArea.addEventListener("change", async () => {
      this.plugin.settings.referenceNoteTemplate = refTextArea.value;
      await this.plugin.saveSettings();
      new Notice("Zotero importer reference template saved.");
    });

    new Setting(containerEl)
      .setName("Reset reference template")
      .setDesc("Restore the built-in default reference-note template.")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.referenceNoteTemplate = DEFAULT_REFERENCE_TEMPLATE;
          await this.plugin.saveSettings();
          this.display();
          new Notice("Reference template reset.");
        })
      );
  }
}

module.exports = ZoteroLiteratureImporterPlugin;
module.exports.default = ZoteroLiteratureImporterPlugin;
