"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => RefDailyPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  apiToken: "",
  apiUrl: "https://refdaily.com",
  syncInterval: 30,
  papersFolder: "20_References/21_Papers",
  dailyFolder: "10_RefDaily/11_Daily",
  weeklyFolder: "10_RefDaily/12_Weekly",
  monthlyFolder: "10_RefDaily/13_Monthly",
  reportsFolder: "30_Reports",
  enableAutoSync: true,
  lastSyncTime: null
};
var RefDailySettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "RefDaily Settings" });
    containerEl.createEl("h3", { text: "Connection" });
    new import_obsidian.Setting(containerEl).setName("API Token").setDesc(
      "Your RefDaily API token. Generate one at Settings > Integrations on refdaily.com."
    ).addText(
      (text) => text.setPlaceholder("Paste your token here").setValue(this.plugin.settings.apiToken).onChange(async (value) => {
        this.plugin.settings.apiToken = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("API URL").setDesc("RefDaily server URL. Change only if you self-host.").addText(
      (text) => text.setPlaceholder("https://refdaily.com").setValue(this.plugin.settings.apiUrl).onChange(async (value) => {
        this.plugin.settings.apiUrl = value.trim().replace(/\/+$/, "");
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Sync" });
    new import_obsidian.Setting(containerEl).setName("Auto-sync").setDesc("Automatically sync papers and digests on a schedule.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableAutoSync).onChange(async (value) => {
        this.plugin.settings.enableAutoSync = value;
        await this.plugin.saveSettings();
        this.plugin.resetSyncInterval();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Sync interval (minutes)").setDesc("How often to sync with RefDaily. Minimum 5 minutes.").addText(
      (text) => text.setPlaceholder("30").setValue(String(this.plugin.settings.syncInterval)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 5) {
          this.plugin.settings.syncInterval = num;
          await this.plugin.saveSettings();
          this.plugin.resetSyncInterval();
        }
      })
    );
    containerEl.createEl("h3", { text: "Vault Folders" });
    new import_obsidian.Setting(containerEl).setName("Papers folder").setDesc("Where synced paper notes are saved.").addText(
      (text) => text.setPlaceholder("20_References/21_Papers").setValue(this.plugin.settings.papersFolder).onChange(async (value) => {
        this.plugin.settings.papersFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Daily digest folder").setDesc("Where daily digest notes are saved.").addText(
      (text) => text.setPlaceholder("10_RefDaily/11_Daily").setValue(this.plugin.settings.dailyFolder).onChange(async (value) => {
        this.plugin.settings.dailyFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Weekly digest folder").setDesc("Where weekly digest notes are saved.").addText(
      (text) => text.setPlaceholder("10_RefDaily/12_Weekly").setValue(this.plugin.settings.weeklyFolder).onChange(async (value) => {
        this.plugin.settings.weeklyFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Monthly digest folder").setDesc("Where monthly digest notes are saved.").addText(
      (text) => text.setPlaceholder("10_RefDaily/13_Monthly").setValue(this.plugin.settings.monthlyFolder).onChange(async (value) => {
        this.plugin.settings.monthlyFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Reports folder").setDesc("Where report notes are saved.").addText(
      (text) => text.setPlaceholder("30_Reports").setValue(this.plugin.settings.reportsFolder).onChange(async (value) => {
        this.plugin.settings.reportsFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Status" });
    const lastSync = this.plugin.settings.lastSyncTime ? new Date(this.plugin.settings.lastSyncTime).toLocaleString() : "Never";
    new import_obsidian.Setting(containerEl).setName("Last sync").setDesc(lastSync).addButton(
      (btn) => btn.setButtonText("Sync now").onClick(async () => {
        btn.setButtonText("Syncing...");
        btn.setDisabled(true);
        try {
          await this.plugin.runSync();
          btn.setButtonText("Done!");
          setTimeout(() => this.display(), 1500);
        } catch {
          btn.setButtonText("Failed");
        } finally {
          setTimeout(() => btn.setDisabled(false), 2e3);
        }
      })
    );
  }
};

// src/sync.ts
var import_obsidian4 = require("obsidian");

// src/api.ts
var import_obsidian2 = require("obsidian");
var RefDailyApi = class {
  constructor(token, baseUrl) {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }
  async request(path, params) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.set(key, value);
      }
    }
    const reqParams = {
      url: url.toString(),
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      }
    };
    const response = await (0, import_obsidian2.requestUrl)(reqParams);
    if (response.status !== 200) {
      throw new Error(
        `RefDaily API error ${response.status}: ${response.text}`
      );
    }
    return response.json;
  }
  async post(path, body) {
    const url = `${this.baseUrl}${path}`;
    const reqParams = {
      url,
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    };
    const response = await (0, import_obsidian2.requestUrl)(reqParams);
    if (response.status !== 200) {
      throw new Error(
        `RefDaily API error ${response.status}: ${response.text}`
      );
    }
    return response.json;
  }
  /** Fetch papers for sync (optionally incremental) */
  async getPapers(since) {
    const params = { type: "papers" };
    if (since) params.since = since;
    const data = await this.request(
      "/api/obsidian/sync",
      params
    );
    return data.papers;
  }
  /** Push paper updates (readStatus, tags) back to server */
  async pushUpdates(updates) {
    return this.post("/api/obsidian/sync", { updates });
  }
  /** Fetch digests since a given ISO date */
  async getDigests(since) {
    const params = { type: "digests" };
    if (since) params.since = since;
    const data = await this.request(
      "/api/obsidian/sync",
      params
    );
    return data.digests;
  }
  /** Fetch reports since a given ISO date */
  async getReports(since) {
    const params = { type: "reports" };
    if (since) params.since = since;
    const data = await this.request(
      "/api/obsidian/sync",
      params
    );
    return data.reports;
  }
  /** Get current sync status */
  async getLastSync() {
    return this.request("/api/obsidian/sync", { type: "status" });
  }
};

// src/templates.ts
function buildCitekey(authors, year) {
  let lastName = "unknown";
  if (authors.length > 0) {
    const first = authors[0];
    if (first.includes(",")) {
      lastName = first.split(",")[0].trim();
    } else {
      const parts = first.trim().split(/\s+/);
      lastName = parts[parts.length - 1];
    }
  }
  const yearStr = year ? String(year) : "nd";
  return `${lastName.toLowerCase().replace(/[^a-z]/g, "")}${yearStr}`;
}
function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
}
function paperTemplate(paper) {
  const citekey = buildCitekey(paper.authors, paper.year);
  const authorsYaml = paper.authors.map((a) => `  - "${a}"`).join("\n");
  const tagsYaml = paper.tags.map((t) => `  - "${t}"`).join("\n");
  const frontmatter = [
    "---",
    `type: paper`,
    `title: "${paper.title.replace(/"/g, '\\"')}"`,
    `citekey: "${citekey}"`,
    `authors:`,
    authorsYaml || "  []",
    `year: ${paper.year ?? "null"}`,
    `venue: "${paper.venue ?? ""}"`,
    `doi: "${paper.doi ?? ""}"`,
    `status: "${paper.readStatus}"`,
    `quality_score: ${paper.qualityScore ?? "null"}`,
    `venue_tier: "${paper.venueTier ?? ""}"`,
    `citation_count: ${paper.citationCount}`,
    `tags:`,
    tagsYaml || "  []",
    `refdaily_id: "${paper.id}"`,
    `source: "${paper.source ?? ""}"`,
    `summary_basis: "${paper.summaryBasis ?? ""}"`,
    `date_added: "${paper.createdAt}"`,
    "---"
  ].join("\n");
  const authorLine = paper.authors.length > 0 ? paper.authors.join(", ") : "Unknown";
  const venueYear = [paper.venue, paper.year].filter(Boolean).join(", ");
  const body = [
    "",
    `# ${paper.title}`,
    "",
    `**Authors:** ${authorLine}`,
    venueYear ? `**Venue:** ${venueYear}` : "",
    paper.doi ? `**DOI:** [${paper.doi}](https://doi.org/${paper.doi})` : "",
    paper.qualityScore !== null ? `**Quality Score:** ${paper.qualityScore}/10` : "",
    paper.citationCount > 0 ? `**Citations:** ${paper.citationCount}` : "",
    "",
    "## Abstract",
    "",
    paper.abstract ?? "_No abstract available._",
    "",
    // Structured summary: insert raw markdown (already contains ## headers)
    paper.summary ? paper.summary : [
      "## \uC5F0\uAD6C \uBAA9\uC801 Research Objective",
      "- \uD575\uC2EC \uC9C8\uBB38: ",
      "- \uBC30\uACBD: ",
      "",
      "## \uBC29\uBC95\uB860 Methodology",
      "- \uB370\uC774\uD130: ",
      "- \uBD84\uC11D: ",
      "",
      "## \uD575\uC2EC \uACB0\uACFC Key Findings",
      "- ",
      "",
      "## \uD65C\uC6A9 \uAC00\uB2A5\uC131 Practical Implications",
      "- ",
      "",
      "## \uCC28\uBCC4\uC810\uACFC \uD55C\uACC4 Contribution & Limitations",
      "- \uAE30\uC5EC: ",
      "- \uD55C\uACC4: ",
      "",
      "## \uD0A4\uC6CC\uB4DC",
      ""
    ].join("\n"),
    "",
    "## Connections",
    "",
    "- ",
    ""
  ].filter((line) => line !== "").join("\n");
  const content = frontmatter + "\n" + body;
  const filename = sanitizeFilename(`${citekey} - ${paper.title}`);
  return { filename, content };
}
function dailyTemplate(digest) {
  const date = digest.date.split("T")[0];
  const frontmatter = [
    "---",
    `type: daily_digest`,
    `date: "${date}"`,
    `refdaily_id: "${digest.id}"`,
    `paper_count: ${digest.recommendedPapers.length}`,
    "---"
  ].join("\n");
  const paperList = digest.recommendedPapers.map((p) => {
    const citekey = buildCitekey(p.authors, p.year);
    const score = p.qualityScore !== null ? ` (Score: ${p.qualityScore}/10)` : "";
    return `- **[[${citekey} - ${sanitizeFilename(p.title)}|${p.title}]]**${score}
  ${p.authors.slice(0, 3).join(", ")}${p.authors.length > 3 ? " et al." : ""} (${p.year ?? "n.d."})`;
  }).join("\n");
  let expressionSection = "";
  if (digest.dailyExpression) {
    expressionSection = [
      "",
      "## Expression of the Day",
      "",
      `> **${digest.dailyExpression.expression}**`,
      `> _${digest.dailyExpression.context}_`,
      `> Category: ${digest.dailyExpression.category}`,
      ""
    ].join("\n");
  }
  const body = [
    "",
    `# Daily Digest - ${date}`,
    "",
    "## Recommended Papers",
    "",
    paperList || "_No papers recommended today._",
    expressionSection,
    "## Insights",
    "",
    digest.insights ?? "_No insights generated._",
    ""
  ].join("\n");
  const content = frontmatter + "\n" + body;
  const filename = `Daily Digest ${date}`;
  return { filename, content };
}
function reportTemplate(report) {
  const date = report.createdAt.split("T")[0];
  const typeLabel = report.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const frontmatter = [
    "---",
    `type: report`,
    `report_type: "${report.type}"`,
    `title: "${report.title.replace(/"/g, '\\"')}"`,
    `topic: "${report.topicKeyword ?? ""}"`,
    `period: "${report.period ?? ""}"`,
    `refdaily_id: "${report.id}"`,
    `date_created: "${report.createdAt}"`,
    "---"
  ].join("\n");
  const body = [
    "",
    `# ${report.title}`,
    "",
    `**Type:** ${typeLabel}`,
    report.topicKeyword ? `**Topic:** ${report.topicKeyword}` : "",
    report.period ? `**Period:** ${report.period}` : "",
    `**Generated:** ${date}`,
    "",
    "---",
    "",
    report.content,
    ""
  ].filter((line) => line !== "").join("\n");
  const content = frontmatter + "\n" + body;
  const filename = sanitizeFilename(`${typeLabel} - ${report.title} (${date})`);
  return { filename, content };
}

// src/dedup.ts
var import_obsidian3 = require("obsidian");
async function findExistingNote(app, doi, refdailyId, folder) {
  const abstractFolder = app.vault.getAbstractFileByPath(folder);
  if (!abstractFolder || !(abstractFolder instanceof import_obsidian3.TFolder)) {
    return null;
  }
  const files = abstractFolder.children.filter(
    (f) => f instanceof import_obsidian3.TFile && f.extension === "md"
  );
  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) continue;
    const fm = cache.frontmatter;
    if (fm.refdaily_id && fm.refdaily_id === refdailyId) {
      return file;
    }
    if (doi && fm.doi && fm.doi === doi) {
      return file;
    }
  }
  return null;
}
async function findExistingDigest(app, refdailyId, date, folder) {
  const abstractFolder = app.vault.getAbstractFileByPath(folder);
  if (!abstractFolder || !(abstractFolder instanceof import_obsidian3.TFolder)) {
    return null;
  }
  const files = abstractFolder.children.filter(
    (f) => f instanceof import_obsidian3.TFile && f.extension === "md"
  );
  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) continue;
    const fm = cache.frontmatter;
    if (fm.refdaily_id && fm.refdaily_id === refdailyId) {
      return file;
    }
    if (fm.date && fm.date === date) {
      return file;
    }
  }
  return null;
}
async function findExistingReport(app, refdailyId, folder) {
  const abstractFolder = app.vault.getAbstractFileByPath(folder);
  if (!abstractFolder || !(abstractFolder instanceof import_obsidian3.TFolder)) {
    return null;
  }
  const files = abstractFolder.children.filter(
    (f) => f instanceof import_obsidian3.TFile && f.extension === "md"
  );
  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) continue;
    if (cache.frontmatter.refdaily_id === refdailyId) {
      return file;
    }
  }
  return null;
}

// src/sync.ts
async function ensureFolder(app, path) {
  const parts = (0, import_obsidian4.normalizePath)(path).split("/");
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const existing = app.vault.getAbstractFileByPath(current);
    if (!existing) {
      await app.vault.createFolder(current);
    } else if (!(existing instanceof import_obsidian4.TFolder)) {
      throw new Error(`Path "${current}" exists but is not a folder`);
    }
  }
}
async function syncAll(app, settings) {
  if (!settings.apiToken) {
    throw new Error("No API token configured. Go to Settings > RefDaily to add your token.");
  }
  const api = new RefDailyApi(settings.apiToken, settings.apiUrl);
  const result = {
    papersCreated: 0,
    papersUpdated: 0,
    digestsCreated: 0,
    digestsUpdated: 0,
    reportsCreated: 0,
    reportsUpdated: 0,
    errors: []
  };
  try {
    new import_obsidian4.Notice("RefDaily: Syncing papers...");
    const papers = await api.getPapers();
    const paperResult = await syncPapers(app, settings, papers);
    result.papersCreated = paperResult.created;
    result.papersUpdated = paperResult.updated;
    result.errors.push(...paperResult.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Papers sync failed: ${msg}`);
  }
  try {
    new import_obsidian4.Notice("RefDaily: Syncing digests...");
    const digests = await api.getDigests(settings.lastSyncTime ?? void 0);
    const digestResult = await syncDigests(app, settings, digests);
    result.digestsCreated = digestResult.created;
    result.digestsUpdated = digestResult.updated;
    result.errors.push(...digestResult.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Digests sync failed: ${msg}`);
  }
  try {
    new import_obsidian4.Notice("RefDaily: Syncing reports...");
    const reports = await api.getReports(settings.lastSyncTime ?? void 0);
    const reportResult = await syncReports(app, settings, reports);
    result.reportsCreated = reportResult.created;
    result.reportsUpdated = reportResult.updated;
    result.errors.push(...reportResult.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Reports sync failed: ${msg}`);
  }
  const parts = [];
  if (result.papersCreated > 0) parts.push(`${result.papersCreated} new papers`);
  if (result.papersUpdated > 0) parts.push(`${result.papersUpdated} updated papers`);
  if (result.digestsCreated > 0) parts.push(`${result.digestsCreated} new digests`);
  if (result.digestsUpdated > 0) parts.push(`${result.digestsUpdated} updated digests`);
  if (result.reportsCreated > 0) parts.push(`${result.reportsCreated} new reports`);
  if (result.reportsUpdated > 0) parts.push(`${result.reportsUpdated} updated reports`);
  if (parts.length > 0) {
    new import_obsidian4.Notice(`RefDaily sync complete: ${parts.join(", ")}`);
  } else if (result.errors.length === 0) {
    new import_obsidian4.Notice("RefDaily: Everything is up to date.");
  }
  if (result.errors.length > 0) {
    new import_obsidian4.Notice(`RefDaily: ${result.errors.length} error(s) during sync. Check console for details.`);
    for (const err of result.errors) {
      console.error("[RefDaily]", err);
    }
  }
  return result;
}
async function syncPapers(app, settings, papers) {
  let created = 0;
  let updated = 0;
  const errors = [];
  await ensureFolder(app, settings.papersFolder);
  for (const paper of papers) {
    try {
      const { filename, content } = paperTemplate(paper);
      const filePath = (0, import_obsidian4.normalizePath)(`${settings.papersFolder}/${filename}.md`);
      const existing = await findExistingNote(
        app,
        paper.doi,
        paper.id,
        settings.papersFolder
      );
      if (existing) {
        await app.vault.modify(existing, content);
        updated++;
      } else {
        const existingFile = app.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
          const altPath = (0, import_obsidian4.normalizePath)(`${settings.papersFolder}/${filename} (${paper.id.slice(0, 8)}).md`);
          await app.vault.create(altPath, content);
        } else {
          await app.vault.create(filePath, content);
        }
        created++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Paper "${paper.title.slice(0, 60)}": ${msg}`);
    }
  }
  return { created, updated, errors };
}
async function syncDigests(app, settings, digests) {
  let created = 0;
  let updated = 0;
  const errors = [];
  await ensureFolder(app, settings.dailyFolder);
  for (const digest of digests) {
    try {
      const { filename, content } = dailyTemplate(digest);
      const date = digest.date.split("T")[0];
      const filePath = (0, import_obsidian4.normalizePath)(`${settings.dailyFolder}/${filename}.md`);
      const existing = await findExistingDigest(
        app,
        digest.id,
        date,
        settings.dailyFolder
      );
      if (existing) {
        await app.vault.modify(existing, content);
        updated++;
      } else {
        const existingFile = app.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
          await app.vault.modify(existingFile, content);
          updated++;
        } else {
          await app.vault.create(filePath, content);
          created++;
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Digest "${digest.date}": ${msg}`);
    }
  }
  return { created, updated, errors };
}
async function syncReports(app, settings, reports) {
  let created = 0;
  let updated = 0;
  const errors = [];
  for (const report of reports) {
    try {
      let folder = settings.reportsFolder;
      if (report.type === "weekly") {
        folder = settings.weeklyFolder;
      } else if (report.type === "monthly") {
        folder = settings.monthlyFolder;
      }
      await ensureFolder(app, folder);
      const { filename, content } = reportTemplate(report);
      const filePath = (0, import_obsidian4.normalizePath)(`${folder}/${filename}.md`);
      const existing = await findExistingReport(app, report.id, folder);
      if (existing) {
        await app.vault.modify(existing, content);
        updated++;
      } else {
        const existingFile = app.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
          await app.vault.modify(existingFile, content);
          updated++;
        } else {
          await app.vault.create(filePath, content);
          created++;
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Report "${report.title.slice(0, 60)}": ${msg}`);
    }
  }
  return { created, updated, errors };
}

// src/main.ts
var RefDailyPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.syncIntervalId = null;
    this.statusBarEl = null;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new RefDailySettingTab(this.app, this));
    this.addRibbonIcon("refresh-cw", "RefDaily: Sync now", async () => {
      await this.runSync();
    });
    this.addCommand({
      id: "refdaily-sync-now",
      name: "Sync now",
      callback: async () => {
        await this.runSync();
      }
    });
    this.addCommand({
      id: "refdaily-open-dashboard",
      name: "Open dashboard",
      callback: () => {
        const url = this.settings.apiUrl || "https://refdaily.com";
        window.open(url, "_blank");
      }
    });
    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar();
    this.resetSyncInterval();
    if (this.settings.enableAutoSync && this.settings.apiToken) {
      this.app.workspace.onLayoutReady(() => {
        window.setTimeout(() => {
          if (this.settings.enableAutoSync && this.settings.apiToken) {
            this.runSync();
          }
        }, 1e4);
      });
    }
  }
  onunload() {
    this.clearSyncInterval();
  }
  // ── Settings persistence ──
  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // ── Sync ──
  async runSync() {
    if (!this.settings.apiToken) {
      new import_obsidian5.Notice(
        "RefDaily: No API token set. Go to Settings > RefDaily to configure."
      );
      return;
    }
    try {
      await syncAll(this.app, this.settings);
      this.settings.lastSyncTime = (/* @__PURE__ */ new Date()).toISOString();
      await this.saveSettings();
      this.updateStatusBar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new import_obsidian5.Notice(`RefDaily sync error: ${msg}`);
      console.error("[RefDaily] Sync error:", e);
    }
  }
  // ── Auto-sync interval management ──
  resetSyncInterval() {
    this.clearSyncInterval();
    if (!this.settings.enableAutoSync) return;
    const intervalMs = Math.max(this.settings.syncInterval, 5) * 60 * 1e3;
    this.syncIntervalId = window.setInterval(async () => {
      if (this.settings.apiToken) {
        await this.runSync();
      }
    }, intervalMs);
    this.registerInterval(this.syncIntervalId);
  }
  clearSyncInterval() {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }
  // ── Status bar ──
  updateStatusBar() {
    if (!this.statusBarEl) return;
    if (this.settings.lastSyncTime) {
      const time = new Date(this.settings.lastSyncTime);
      const now = /* @__PURE__ */ new Date();
      const diffMin = Math.round(
        (now.getTime() - time.getTime()) / (1e3 * 60)
      );
      let label;
      if (diffMin < 1) {
        label = "just now";
      } else if (diffMin < 60) {
        label = `${diffMin}m ago`;
      } else if (diffMin < 1440) {
        label = `${Math.round(diffMin / 60)}h ago`;
      } else {
        label = `${Math.round(diffMin / 1440)}d ago`;
      }
      this.statusBarEl.setText(`RefDaily: synced ${label}`);
    } else {
      this.statusBarEl.setText("RefDaily: not synced");
    }
  }
};
