import { App, TFile, TFolder, CachedMetadata } from "obsidian";

/**
 * Search a folder for an existing note whose YAML frontmatter
 * contains a matching `doi` or `refdaily_id`.
 *
 * Returns the TFile if found, otherwise null.
 */
export async function findExistingNote(
  app: App,
  doi: string | null,
  refdailyId: string,
  folder: string
): Promise<TFile | null> {
  const abstractFolder = app.vault.getAbstractFileByPath(folder);
  if (!abstractFolder || !(abstractFolder instanceof TFolder)) {
    return null;
  }

  const files = abstractFolder.children.filter(
    (f): f is TFile => f instanceof TFile && f.extension === "md"
  );

  for (const file of files) {
    const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) continue;

    const fm = cache.frontmatter;

    // Match by refdaily_id (primary key)
    if (fm.refdaily_id && fm.refdaily_id === refdailyId) {
      return file;
    }

    // Match by DOI (secondary key)
    if (doi && fm.doi && fm.doi === doi) {
      return file;
    }
  }

  return null;
}

/**
 * Search for an existing digest note by date string (YYYY-MM-DD)
 * in the specified folder.
 */
export async function findExistingDigest(
  app: App,
  refdailyId: string,
  date: string,
  folder: string
): Promise<TFile | null> {
  const abstractFolder = app.vault.getAbstractFileByPath(folder);
  if (!abstractFolder || !(abstractFolder instanceof TFolder)) {
    return null;
  }

  const files = abstractFolder.children.filter(
    (f): f is TFile => f instanceof TFile && f.extension === "md"
  );

  for (const file of files) {
    const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) continue;

    const fm = cache.frontmatter;

    if (fm.refdaily_id && fm.refdaily_id === refdailyId) {
      return file;
    }

    // Also match by date for daily digests
    if (fm.date && fm.date === date) {
      return file;
    }
  }

  return null;
}

/**
 * Search for an existing report note by refdaily_id.
 */
export async function findExistingReport(
  app: App,
  refdailyId: string,
  folder: string
): Promise<TFile | null> {
  const abstractFolder = app.vault.getAbstractFileByPath(folder);
  if (!abstractFolder || !(abstractFolder instanceof TFolder)) {
    return null;
  }

  const files = abstractFolder.children.filter(
    (f): f is TFile => f instanceof TFile && f.extension === "md"
  );

  for (const file of files) {
    const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) continue;

    if (cache.frontmatter.refdaily_id === refdailyId) {
      return file;
    }
  }

  return null;
}
