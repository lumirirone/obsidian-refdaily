Security fixes for notes written from synced data.

- Frontmatter values are written as quoted JSON strings, so a quote or line break in an author, tag or venue (which can come from another user through a shared paper) can no longer end the value and add keys of its own
- Fenced code (``` and ~~~) and inline `$=` in abstracts and summaries are escaped, so synced text cannot run as Dataview JavaScript in a vault that has it enabled
- The access token is only sent to an https server URL (or localhost)
