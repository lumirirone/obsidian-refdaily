import type { SyncPaper, SyncDigest, SyncReport } from "./api";

/**
 * Build a citekey from first author's last name + year, e.g. "smith2024".
 * Falls back to "unknown" parts when data is missing.
 */
function buildCitekey(authors: string[], year: number | null): string {
  let lastName = "unknown";
  if (authors.length > 0) {
    const first = authors[0];
    // Handle "Last, First" or "First Last" formats
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

/**
 * Sanitize a string for use as a filename.
 * Removes characters that are illegal in file names across platforms.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

// ── Paper Template ──

export function paperTemplate(paper: SyncPaper): { filename: string; content: string } {
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
    "---",
  ].join("\n");

  const authorLine =
    paper.authors.length > 0 ? paper.authors.join(", ") : "Unknown";
  const venueYear = [paper.venue, paper.year].filter(Boolean).join(", ");

  const body = [
    "",
    `# ${paper.title}`,
    "",
    `**Authors:** ${authorLine}`,
    venueYear ? `**Venue:** ${venueYear}` : "",
    paper.doi ? `**DOI:** [${paper.doi}](https://doi.org/${paper.doi})` : "",
    paper.qualityScore !== null
      ? `**Quality Score:** ${paper.qualityScore}/10`
      : "",
    paper.citationCount > 0
      ? `**Citations:** ${paper.citationCount}`
      : "",
    "",
    "## Abstract",
    "",
    paper.abstract ?? "_No abstract available._",
    "",
    // Structured summary: insert raw markdown (already contains ## headers)
    paper.summary
      ? paper.summary
      : [
          "## 연구 목적 Research Objective",
          "- 핵심 질문: ",
          "- 배경: ",
          "",
          "## 방법론 Methodology",
          "- 데이터: ",
          "- 분석: ",
          "",
          "## 핵심 결과 Key Findings",
          "- ",
          "",
          "## 활용 가능성 Practical Implications",
          "- ",
          "",
          "## 차별점과 한계 Contribution & Limitations",
          "- 기여: ",
          "- 한계: ",
          "",
          "## 키워드",
          "",
        ].join("\n"),
    "",
    "## Connections",
    "",
    "- ",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  // Join with an extra newline between empty-string-filtered lines
  const content = frontmatter + "\n" + body;
  const filename = sanitizeFilename(`${citekey} - ${paper.title}`);

  return { filename, content };
}

// ── Daily Digest Template ──

export function dailyTemplate(digest: SyncDigest): { filename: string; content: string } {
  const date = digest.date.split("T")[0]; // YYYY-MM-DD

  const frontmatter = [
    "---",
    `type: daily_digest`,
    `date: "${date}"`,
    `refdaily_id: "${digest.id}"`,
    `paper_count: ${digest.recommendedPapers.length}`,
    "---",
  ].join("\n");

  // Build paper list
  const paperList = digest.recommendedPapers
    .map((p) => {
      const citekey = buildCitekey(p.authors, p.year);
      const score =
        p.qualityScore !== null ? ` (Score: ${p.qualityScore}/10)` : "";
      return `- **[[${citekey} - ${sanitizeFilename(p.title)}|${p.title}]]**${score}\n  ${p.authors.slice(0, 3).join(", ")}${p.authors.length > 3 ? " et al." : ""} (${p.year ?? "n.d."})`;
    })
    .join("\n");

  // Build expression section
  let expressionSection = "";
  if (digest.dailyExpression) {
    expressionSection = [
      "",
      "## Expression of the Day",
      "",
      `> **${digest.dailyExpression.expression}**`,
      `> _${digest.dailyExpression.context}_`,
      `> Category: ${digest.dailyExpression.category}`,
      "",
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
    "",
  ].join("\n");

  const content = frontmatter + "\n" + body;
  const filename = `Daily Digest ${date}`;

  return { filename, content };
}

// ── Report Template ──

export function reportTemplate(report: SyncReport): { filename: string; content: string } {
  const date = report.createdAt.split("T")[0];

  const typeLabel = report.type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const frontmatter = [
    "---",
    `type: report`,
    `report_type: "${report.type}"`,
    `title: "${report.title.replace(/"/g, '\\"')}"`,
    `topic: "${report.topicKeyword ?? ""}"`,
    `period: "${report.period ?? ""}"`,
    `refdaily_id: "${report.id}"`,
    `date_created: "${report.createdAt}"`,
    "---",
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
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const content = frontmatter + "\n" + body;
  const filename = sanitizeFilename(`${typeLabel} - ${report.title} (${date})`);

  return { filename, content };
}
