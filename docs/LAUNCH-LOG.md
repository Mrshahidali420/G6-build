# Adding a launch log entry (/gta-6-launch)

1. Open `src/data/launch-log.json`. Add a new object at the top of the list.
2. Fill `date` as `2026-11-19`, and `time_utc` as `05:00` if you know the hour (optional).
3. Write `text` in one or two short plain sentences. No em dashes.
4. Add `source` with a `label` and a full `https://` `url`. No source, no entry: the build stops with the entry number if one is missing.
5. Run `npm run build` in the foreground, check `/gta-6-launch`, then deploy as usual.
