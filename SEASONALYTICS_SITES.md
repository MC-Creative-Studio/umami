# Private website registry

Configure `SEASONALYTICS_WEBSITES` as a private production environment variable in Netlify. Its value is a JSON array of objects containing `id`, `name` and `domain`.

The build initializer validates unique website IDs and creates only missing website entries under the existing administrator. Existing names, settings, analytics history and changed administrator passwords remain unchanged. Newly created websites have recording disabled.

Keep the actual inventory out of this public repository. Only the site's tracking identifier belongs in its frontend integration. Repository-specific `ANALYTICS.md` files describe allowed production hosts and privacy safeguards. Adding a registry entry alone does not deploy a tracker to a website.

Validation: four initializer scenarios use real bcrypt and a mocked database boundary to verify password safety, the configured registry entries, disabled recordings and unchanged existing website settings. Live collection and deployment are checked separately for each site.

## Reversible exclusions

Configure `SEASONALYTICS_ARCHIVED_WEBSITE_IDS` as a private production environment variable containing a JSON array of excluded website IDs. It must not overlap the active registry. The initializer marks only the current administrator's matching, non-archived website entries as archived using `deletedAt`; it never deletes their events or settings. Archived sites disappear from normal website lists and new collection requests are rejected by Umami's existing deleted-site check.

To restore an excluded website, remove its ID from the exclusion variable and clear its `deletedAt` value through authorized database administration before re-enabling its tracker. Registry upserts do not automatically restore previously archived entries.

Validation covers seven active registry entries, the three scoped archive targets, preservation of a changed admin password, disabled recordings, invalid archive IDs, and rejection of active/archive overlap. The actual configured inventory remains private.
