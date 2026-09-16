# RefDaily

Sync papers, daily digests and research reports from [RefDaily](https://refdaily.com) into your vault as Markdown notes.

RefDaily watches the literature for your research topics, summarizes what is new each day, and keeps a library of the papers you have collected. This plugin brings all of that into Obsidian, so the notes live next to your own writing and stay yours if you ever stop using the service.

## What it creates

| Note | Contents |
|---|---|
| One note per paper | Title, authors, venue, year, DOI, abstract, the AI summary, and links back to the source |
| One note per daily digest | The day's new papers with the day's insights |
| One note per report | Weekly and monthly reviews, literature reviews, and the other analyses |

Notes are written as plain Markdown with YAML frontmatter, so Dataview, graph view and your own templates all work on them. Nothing in a note depends on the plugin being installed.

Re-running a sync updates notes that already exist rather than duplicating them. A paper is matched by its DOI first, then by its RefDaily id, so renaming a note by hand does not break the link.

## Setup

1. Install and enable the plugin.
2. Open **Settings → RefDaily**.
3. Paste an API token. You generate one at [refdaily.com](https://refdaily.com) under **Settings → Integrations**.
4. Choose the folders each kind of note should go into, or keep the defaults.
5. Run **RefDaily: Sync now** from the command palette.

Optionally turn on auto-sync to have it run on a schedule while Obsidian is open.

## Settings

- **API token** — identifies your RefDaily account. It is stored in the plugin's own data file inside your vault.
- **Folders** — where papers, daily digests, weekly and monthly reviews, and reports are written. Missing folders are created.
- **Auto-sync** — off by default. When on, syncs at the interval you choose.

## Requirements

A RefDaily account. The free plan works; there is nothing in this plugin that needs a paid one.

## Privacy

The plugin talks to `refdaily.com` and nowhere else, and only to fetch your own papers and reports. It sends no telemetry, and it reads nothing in your vault beyond the folders it writes to, which it reads in order to avoid creating a note twice.

## Support

Issues and questions: [github.com/lumirirone/obsidian-refdaily/issues](https://github.com/lumirirone/obsidian-refdaily/issues)
Service and account questions: support@refdaily.com

## License

MIT. See [LICENSE](LICENSE).
