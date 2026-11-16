# Private website registry

Configure `SEASONALYTICS_WEBSITES` as a private production environment variable in Netlify. Its value is a JSON array of objects containing `id`, `name` and `domain`.

The build initializer validates unique website IDs and creates only missing website entries under the existing administrator. Existing names, settings, analytics history and changed administrator passwords remain unchanged. Newly created websites have recording disabled.

Keep the actual inventory out of this public repository. Only the site's tracking identifier belongs in its frontend integration. Repository-specific `ANALYTICS.md` files describe allowed production hosts and privacy safeguards. Adding a registry entry alone does not deploy a tracker to a website.

Validation: four initializer scenarios use real bcrypt and a mocked database boundary to verify password safety, the configured registry entries, disabled recordings and unchanged existing website settings. Live collection and deployment are checked separately for each site.
