import { App, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
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

  /**
   * Settings, described rather than drawn.
   *
   * Obsidian 1.13 builds the tab from this and, more to the point, indexes it:
   * a tab that only implements display() is invisible to the settings search,
   * so someone looking for "sync interval" never finds ours. display() stays
   * below for older versions, which is the dual-support pattern the docs
   * describe — the two have to say the same thing.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    const lastSync = this.plugin.settings.lastSyncTime
      ? new Date(this.plugin.settings.lastSyncTime).toLocaleString()
      : "Never";

    return [
      {
        type: "group",
        heading: "Connection",
        items: [
          {
            name: "API token",
            desc: "Generate one at Settings > Integrations on refdaily.com.",
            control: { type: "text", key: "apiToken", placeholder: "Paste your token here" },
          },
          {
            name: "Server",
            desc: "Leave this alone unless you are running your own RefDaily.",
            control: { type: "text", key: "apiUrl", placeholder: "https://refdaily.com" },
          },
        ],
      },
      {
        type: "group",
        heading: "Sync",
        items: [
          {
            name: "Auto-sync",
            desc: "Sync on a schedule while Obsidian is open.",
            control: { type: "toggle", key: "enableAutoSync" },
          },
          {
            name: "Interval",
            desc: "Minutes between syncs.",
            control: { type: "number", key: "syncInterval", min: 5, max: 1440 },
          },
        ],
      },
      {
        type: "group",
        heading: "Vault folders",
        items: [
          { name: "Papers", control: { type: "folder", key: "papersFolder" } },
          { name: "Daily digests", control: { type: "folder", key: "dailyFolder" } },
          { name: "Weekly reviews", control: { type: "folder", key: "weeklyFolder" } },
          { name: "Monthly reviews", control: { type: "folder", key: "monthlyFolder" } },
          { name: "Reports", control: { type: "folder", key: "reportsFolder" } },
        ],
      },
      {
        type: "group",
        heading: "Status",
        items: [
          {
            name: "Sync now",
            desc: `Last sync: ${lastSync}`,
            action: () => {
              void this.plugin.runSync();
            },
          },
        ],
      },
    ];
  }

  /**
   * Values arrive from the declarative controls here.
   *
   * Two of them change how the plugin behaves rather than just what it stores,
   * so the running timer is rebuilt after they land; without this, turning
   * auto-sync on does nothing until the next restart.
   */
  async setControlValue(key: string, value: unknown): Promise<void> {
    const settings = this.plugin.settings as unknown as Record<string, unknown>;
    // Paths and URLs arrive with whatever whitespace was typed around them.
    settings[key] = typeof value === "string" ? value.trim() : value;
    if (key === "apiUrl" && typeof settings[key] === "string") {
      settings[key] = (settings[key] as string).replace(/\/+$/, "");
    }
    await this.plugin.saveSettings();
    if (key === "enableAutoSync" || key === "syncInterval") {
      this.plugin.resetSyncInterval();
    }
  }

  getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // --- Connection ---
    new Setting(containerEl).setName("Connection").setHeading();

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
    new Setting(containerEl).setName("Sync").setHeading();

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
    new Setting(containerEl).setName("Vault Folders").setHeading();

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
    new Setting(containerEl).setName("Status").setHeading();

    const lastSync = this.plugin.settings.lastSyncTime
      ? new Date(this.plugin.settings.lastSyncTime).toLocaleString()
      : "Never";

    new Setting(containerEl)
      .setName("Last sync")
      .setDesc(lastSync)
      .addButton((btn) =>
        // onClick wants a void return. The work is launched rather than
        // returned, and `void` says that is deliberate.
        btn.setButtonText("Sync now").onClick(() => {
          void (async () => {
            btn.setButtonText("Syncing...");
            btn.setDisabled(true);
            try {
              await this.plugin.runSync();
              btn.setButtonText("Done!");
              // Redraw so the last-sync time above is not left stale.
              window.setTimeout(() => this.display(), 1500);
            } catch {
              btn.setButtonText("Failed");
            } finally {
              window.setTimeout(() => btn.setDisabled(false), 2000);
            }
          })();
        })
      );
  }
}
