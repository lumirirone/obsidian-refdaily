import { App, PluginSettingTab, Setting } from "obsidian";
import type RefDailyPlugin from "./main";

export interface RefDailySettings {
  apiToken: string;
  apiUrl: string;
  syncInterval: number;
  papersFolder: string;
  dailyFolder: string;
  weeklyFolder: string;
  monthlyFolder: string;
  reportsFolder: string;
  enableAutoSync: boolean;
  lastSyncTime: string | null;
}

export const DEFAULT_SETTINGS: RefDailySettings = {
  apiToken: "",
  apiUrl: "https://refdaily.com",
  syncInterval: 30,
  papersFolder: "20_References/21_Papers",
  dailyFolder: "10_RefDaily/11_Daily",
  weeklyFolder: "10_RefDaily/12_Weekly",
  monthlyFolder: "10_RefDaily/13_Monthly",
  reportsFolder: "30_Reports",
  enableAutoSync: true,
  lastSyncTime: null,
};

export class RefDailySettingTab extends PluginSettingTab {
  plugin: RefDailyPlugin;

  constructor(app: App, plugin: RefDailyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "RefDaily Settings" });

    // --- Connection ---
    containerEl.createEl("h3", { text: "Connection" });

    new Setting(containerEl)
      .setName("API Token")
      .setDesc(
        "Your RefDaily API token. Generate one at Settings > Integrations on refdaily.com."
      )
      .addText((text) =>
        text
          .setPlaceholder("Paste your token here")
          .setValue(this.plugin.settings.apiToken)
          .onChange(async (value) => {
            this.plugin.settings.apiToken = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("API URL")
      .setDesc("RefDaily server URL. Change only if you self-host.")
      .addText((text) =>
        text
          .setPlaceholder("https://refdaily.com")
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value.trim().replace(/\/+$/, "");
            await this.plugin.saveSettings();
          })
      );

    // --- Sync ---
    containerEl.createEl("h3", { text: "Sync" });

    new Setting(containerEl)
      .setName("Auto-sync")
      .setDesc("Automatically sync papers and digests on a schedule.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableAutoSync)
          .onChange(async (value) => {
            this.plugin.settings.enableAutoSync = value;
            await this.plugin.saveSettings();
            this.plugin.resetSyncInterval();
          })
      );

    new Setting(containerEl)
      .setName("Sync interval (minutes)")
      .setDesc("How often to sync with RefDaily. Minimum 5 minutes.")
      .addText((text) =>
        text
          .setPlaceholder("30")
          .setValue(String(this.plugin.settings.syncInterval))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num >= 5) {
              this.plugin.settings.syncInterval = num;
              await this.plugin.saveSettings();
              this.plugin.resetSyncInterval();
            }
          })
      );

    // --- Folders ---
    containerEl.createEl("h3", { text: "Vault Folders" });

    new Setting(containerEl)
      .setName("Papers folder")
      .setDesc("Where synced paper notes are saved.")
      .addText((text) =>
        text
          .setPlaceholder("20_References/21_Papers")
          .setValue(this.plugin.settings.papersFolder)
          .onChange(async (value) => {
            this.plugin.settings.papersFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Daily digest folder")
      .setDesc("Where daily digest notes are saved.")
      .addText((text) =>
        text
          .setPlaceholder("10_RefDaily/11_Daily")
          .setValue(this.plugin.settings.dailyFolder)
          .onChange(async (value) => {
            this.plugin.settings.dailyFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Weekly digest folder")
      .setDesc("Where weekly digest notes are saved.")
      .addText((text) =>
        text
          .setPlaceholder("10_RefDaily/12_Weekly")
          .setValue(this.plugin.settings.weeklyFolder)
          .onChange(async (value) => {
            this.plugin.settings.weeklyFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Monthly digest folder")
      .setDesc("Where monthly digest notes are saved.")
      .addText((text) =>
        text
          .setPlaceholder("10_RefDaily/13_Monthly")
          .setValue(this.plugin.settings.monthlyFolder)
          .onChange(async (value) => {
            this.plugin.settings.monthlyFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Reports folder")
      .setDesc("Where report notes are saved.")
      .addText((text) =>
        text
          .setPlaceholder("30_Reports")
          .setValue(this.plugin.settings.reportsFolder)
          .onChange(async (value) => {
            this.plugin.settings.reportsFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // --- Status ---
    containerEl.createEl("h3", { text: "Status" });

    const lastSync = this.plugin.settings.lastSyncTime
      ? new Date(this.plugin.settings.lastSyncTime).toLocaleString()
      : "Never";

    new Setting(containerEl)
      .setName("Last sync")
      .setDesc(lastSync)
      .addButton((btn) =>
        btn.setButtonText("Sync now").onClick(async () => {
          btn.setButtonText("Syncing...");
          btn.setDisabled(true);
          try {
            await this.plugin.runSync();
            btn.setButtonText("Done!");
            // Refresh the display to show updated last-sync time
            setTimeout(() => this.display(), 1500);
          } catch {
            btn.setButtonText("Failed");
          } finally {
            setTimeout(() => btn.setDisabled(false), 2000);
          }
        })
      );
  }
}
