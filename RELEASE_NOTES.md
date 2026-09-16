Addresses everything the directory's automated review raised.

- Settings headings now come from the Setting API instead of raw heading elements, so the tab matches every other plugin's
- Settings are also declared through the 1.13 declarative API, which is what makes them findable in Obsidian's settings search; the imperative tab stays for older versions
- Command ids no longer repeat the plugin id, which Obsidian adds itself
- Folder fields use the folder picker rather than free text
- Timers use `window.setTimeout` so they behave in pop-out windows
- Background syncs are explicitly fire-and-forget rather than promises nobody waits on, and sync errors are narrowed instead of caught as `any`
- Folder paths are normalised before they reach the vault
- Releases are now built, attested and published by CI, so the shipped `main.js` can be traced to this repository and commit
