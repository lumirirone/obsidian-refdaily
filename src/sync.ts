import { App, Notice, TFolder, normalizePath } from "obsidian";
import type { RefDailySettings } from "./settings";
import { RefDailyApi, SyncPaper, SyncDigest, SyncReport } from "./api";
import { paperTemplate, dailyTemplate, reportTemplate } from "./templates";
import { findExistingNote, findExistingDigest, findExistingReport } from "./dedup";

export interface SyncResult {
  papersCreated: number;
  papersUpdated: number;
  digestsCreated: number;
  digestsUpdated: number;
  reportsCreated: number;
  reportsUpdated: number;
  errors: string[];
}

/**
 * Ensure a folder path exists, creating intermediate directories as needed.
 *
 * The path comes from a text box the user typed into, so it arrives with
 * whatever they left in it: a leading slash, a trailing one, doubled
 * separators. normalizePath is Obsidian's answer to all of those, and vault
 * calls expect to have been given its output rather than raw input.
 */
async function ensureFolder(app: App, path: string): Promise<void> {
  const parts = normalizePath(path).split("/");
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const existing = app.vault.getAbstractFileByPath(current);
    if (!existing) {
      await app.vault.createFolder(current);
    } else if (!(existing instanceof TFolder)) {
      throw new Error(`Path "${current}" exists but is not a folder`);
    }
  }
}

/**
 * Orchestrate a full sync: papers, digests, and reports.
 */
export async function syncAll(
  app: App,
  settings: RefDailySettings
): Promise<SyncResult> {
  if (!settings.apiToken) {
    throw new Error("No API token configured. Go to Settings > RefDaily to add your token.");
  }

  const api = new RefDailyApi(settings.apiToken, settings.apiUrl);
  const result: SyncResult = {
    papersCreated: 0,
    papersUpdated: 0,
    digestsCreated: 0,
    digestsUpdated: 0,
    reportsCreated: 0,
    reportsUpdated: 0,
    errors: [],
  };

  // Sync papers
  try {
    new Notice("RefDaily: Syncing papers...");
    const papers = await api.getPapers();
    const paperResult = await syncPapers(app, settings, papers);
    result.papersCreated = paperResult.created;
    result.papersUpdated = paperResult.updated;
    result.errors.push(...paperResult.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Papers sync failed: ${msg}`);
  }

  // Sync digests
  try {
    new Notice("RefDaily: Syncing digests...");
    const digests = await api.getDigests(settings.lastSyncTime ?? undefined);
    const digestResult = await syncDigests(app, settings, digests);
    result.digestsCreated = digestResult.created;
    result.digestsUpdated = digestResult.updated;
    result.errors.push(...digestResult.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Digests sync failed: ${msg}`);
  }

  // Sync reports
  try {
    new Notice("RefDaily: Syncing reports...");
    const reports = await api.getReports(settings.lastSyncTime ?? undefined);
    const reportResult = await syncReports(app, settings, reports);
    result.reportsCreated = reportResult.created;
    result.reportsUpdated = reportResult.updated;
    result.errors.push(...reportResult.errors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`Reports sync failed: ${msg}`);
  }

  // Build summary notice
  const parts: string[] = [];
  if (result.papersCreated > 0) parts.push(`${result.papersCreated} new papers`);
  if (result.papersUpdated > 0) parts.push(`${result.papersUpdated} updated papers`);
  if (result.digestsCreated > 0) parts.push(`${result.digestsCreated} new digests`);
  if (result.digestsUpdated > 0) parts.push(`${result.digestsUpdated} updated digests`);
  if (result.reportsCreated > 0) parts.push(`${result.reportsCreated} new reports`);
  if (result.reportsUpdated > 0) parts.push(`${result.reportsUpdated} updated reports`);

  if (parts.length > 0) {
    new Notice(`RefDaily sync complete: ${parts.join(", ")}`);
  } else if (result.errors.length === 0) {
    new Notice("RefDaily: Everything is up to date.");
  }

  if (result.errors.length > 0) {
    new Notice(`RefDaily: ${result.errors.length} error(s) during sync. Check console for details.`);
    for (const err of result.errors) {
      console.error("[RefDaily]", err);
    }
  }

  return result;
}

/**
 * Sync papers: create or update Markdown notes for each paper.
 */
export async function syncPapers(
  app: App,
  settings: RefDailySettings,
  papers: SyncPaper[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  await ensureFolder(app, settings.papersFolder);

  for (const paper of papers) {
    try {
      const { filename, content } = paperTemplate(paper);
      const filePath = normalizePath(`${settings.papersFolder}/${filename}.md`);

      // Check for existing note
      const existing = await findExistingNote(
        app,
        paper.doi,
        paper.id,
        settings.papersFolder
      );

      if (existing) {
        // Update the existing file
        await app.vault.modify(existing, content);
        updated++;
      } else {
        // Create new file (handle name collisions)
        const existingFile = app.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
          // File exists with same name but different ID/DOI -- append ID
          const altPath = normalizePath(`${settings.papersFolder}/${filename} (${paper.id.slice(0, 8)}).md`);
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

/**
 * Sync digests: create or update daily digest notes.
 */
export async function syncDigests(
  app: App,
  settings: RefDailySettings,
  digests: SyncDigest[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  await ensureFolder(app, settings.dailyFolder);

  for (const digest of digests) {
    try {
      const { filename, content } = dailyTemplate(digest);
      const date = digest.date.split("T")[0];
      const filePath = normalizePath(`${settings.dailyFolder}/${filename}.md`);

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
          await app.vault.modify(existingFile as import("obsidian").TFile, content);
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

/**
 * Sync reports: create or update report notes.
 * Routes weekly/monthly reports to their respective folders.
 */
export async function syncReports(
  app: App,
  settings: RefDailySettings,
  reports: SyncReport[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const report of reports) {
    try {
      // Determine target folder based on report type
      let folder = settings.reportsFolder;
      if (report.type === "weekly") {
        folder = settings.weeklyFolder;
      } else if (report.type === "monthly") {
        folder = settings.monthlyFolder;
      }

      await ensureFolder(app, folder);

      const { filename, content } = reportTemplate(report);
      const filePath = normalizePath(`${folder}/${filename}.md`);

      const existing = await findExistingReport(app, report.id, folder);

      if (existing) {
        await app.vault.modify(existing, content);
        updated++;
      } else {
        const existingFile = app.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
          await app.vault.modify(existingFile as import("obsidian").TFile, content);
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
