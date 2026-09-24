import { requestUrl, RequestUrlParam } from "obsidian";

// ── Response types matching the Next.js API route ──

export interface SyncPaper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  venueTier: string | null;
  doi: string | null;
  abstract: string | null;
  summary: string | null;
  summaryBasis: string | null;
  qualityScore: number | null;
  citationCount: number;
  readStatus: string;
  tags: string[];
  source: string | null;
  createdAt: string;
}

export interface SyncDigest {
  id: string;
  date: string;
  recommendedPapers: SyncPaper[];
  dailyExpression: {
    expression: string;
    context: string;
    category: string;
  } | null;
  insights: string | null;
}

export interface SyncReport {
  id: string;
  type: string;
  title: string;
  content: string;
  period: string | null;
  topicKeyword: string | null;
  createdAt: string;
}

export interface SyncStatus {
  lastSync: string | null;
  paperCount: number;
  digestCount: number;
  reportCount: number;
}

/**
 * The token is sent to this address, so it must be https - or a local
 * development server. Anything else falls back to refdaily.com.
 */
export function safeBaseUrl(raw: string | undefined): string {
  const url = (raw || "https://refdaily.com").trim().replace(/\/+$/, "");
  try {
    const u = new URL(url);
    if (u.protocol === "https:") return url;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return url;
  } catch {
    /* fall through */
  }
  return "https://refdaily.com";
}

export class RefDailyApi {
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl: string) {
    this.token = token;
    this.baseUrl = safeBaseUrl(baseUrl);
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.set(key, value);
      }
    }

    const reqParams: RequestUrlParam = {
      url: url.toString(),
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    };

    const response = await requestUrl(reqParams);

    if (response.status !== 200) {
      throw new Error(
        `RefDaily API error ${response.status}: ${response.text}`
      );
    }

    return response.json as T;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const reqParams: RequestUrlParam = {
      url,
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    };

    const response = await requestUrl(reqParams);

    if (response.status !== 200) {
      throw new Error(
        `RefDaily API error ${response.status}: ${response.text}`
      );
    }

    return response.json as T;
  }

  /** Fetch papers for sync (optionally incremental) */
  async getPapers(since?: string): Promise<SyncPaper[]> {
    const params: Record<string, string> = { type: "papers" };
    if (since) params.since = since;
    const data = await this.request<{ papers: SyncPaper[] }>(
      "/api/obsidian/sync",
      params
    );
    return data.papers;
  }

  /** Push paper updates (readStatus, tags) back to server */
  async pushUpdates(
    updates: Array<{ id: string; readStatus?: string; tags?: string[] }>
  ): Promise<{ success: boolean; updated: number; errors?: string[] }> {
    return this.post("/api/obsidian/sync", { updates });
  }

  /** Fetch digests since a given ISO date */
  async getDigests(since?: string): Promise<SyncDigest[]> {
    const params: Record<string, string> = { type: "digests" };
    if (since) params.since = since;
    const data = await this.request<{ digests: SyncDigest[] }>(
      "/api/obsidian/sync",
      params
    );
    return data.digests;
  }

  /** Fetch reports since a given ISO date */
  async getReports(since?: string): Promise<SyncReport[]> {
    const params: Record<string, string> = { type: "reports" };
    if (since) params.since = since;
    const data = await this.request<{ reports: SyncReport[] }>(
      "/api/obsidian/sync",
      params
    );
    return data.reports;
  }

  /** Get current sync status */
  async getLastSync(): Promise<SyncStatus> {
    return this.request<SyncStatus>("/api/obsidian/sync", { type: "status" });
  }
}
