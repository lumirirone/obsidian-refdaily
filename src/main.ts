import { Plugin, Notice } from "obsidian";
import { RefDailySettings, DEFAULT_SETTINGS, RefDailySettingTab } from "./settings";
import { syncAll } from "./sync";

export default class RefDailyPlugin extends Plugin {
  settings: RefDailySettings = DEFAULT_SETTINGS;
  private syncIntervalId: number | null = null;
  private statusBarEl: HTMLElement | null = null;

  async onload(): Promise<void> {

    // Load persisted settings
    await this.loadSettings();

    // Register settings tab
    this.addSettingTab(new RefDailySettingTab(this.app, this));

    // Add ribbon icon for manual sync
    this.addRibbonIcon("refresh-cw", "RefDaily: Sync now", () => {
      void this.runSync();
    });

    // Register commands
    this.addCommand({
      id: "sync-now",
      name: "Sync now",
      callback: () => {
        void this.runSync();
      },
    });

    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: () => {
        const url = this.settings.apiUrl || "https://refdaily.com";
        window.open(url, "_blank");
      },
    });

    // Status bar
    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar();

    // Start auto-sync interval
    this.resetSyncInterval();

    // Run initial sync after a short delay (let vault fully load)
    if (this.settings.enableAutoSync && this.settings.apiToken) {
      this.app.workspace.onLayoutReady(() => {
        // Wait 10 seconds after layout is ready before first sync
        window.setTimeout(() => {
          if (this.settings.enableAutoSync && this.settings.apiToken) {
            void this.runSync();
          }
        }, 10_000);
      });
    }
  }

  onunload(): void {
    this.clearSyncInterval();
  }

  // ── Settings persistence ──

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // ── Sync ──

  async runSync(): Promise<void> {
    if (!this.settings.apiToken) {
      new Notice(
        "RefDaily: No API token set. Go to Settings > RefDaily to configure."
      );
      return;
    }

    try {
      await syncAll(this.app, this.settings);

      // Update last sync time
      this.settings.lastSyncTime = new Date().toISOString();
      await this.saveSettings();
      this.updateStatusBar();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`RefDaily sync error: ${message}`);
    }
  }

  // ── Auto-sync interval management ──

  resetSyncInterval(): void {
    this.clearSyncInterval();

    if (!this.settings.enableAutoSync) return;

    const intervalMs = Math.max(this.settings.syncInterval, 5) * 60 * 1000;
    this.syncIntervalId = window.setInterval(() => {
      if (this.settings.apiToken) {
        void this.runSync();
      }
    }, intervalMs);

    // Register the interval so Obsidian cleans it up on unload
    this.registerInterval(this.syncIntervalId);
  }

  private clearSyncInterval(): void {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  // ── Status bar ──

  private updateStatusBar(): void {
    if (!this.statusBarEl) return;

    if (this.settings.lastSyncTime) {
      const time = new Date(this.settings.lastSyncTime);
      const now = new Date();
      const diffMin = Math.round(
        (now.getTime() - time.getTime()) / (1000 * 60)
      );

      let label: string;
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
}
