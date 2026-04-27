# Life Charge Chiropractic Website

Static HTML site for `lifechargechiropractic.com`, with WordPress reserved for `/blog/`.

## Structure

- Root files and route folders deploy to `/home/drpaidtv/lifechargechiropractic.com/`
- `/blog/` is intentionally not included in this repo package because WordPress owns that path
- `wordpress-theme/lifecharge-blog/` contains the custom WordPress blog theme source

## Deployment

The `.cpanel.yml` file is configured for cPanel Git deployment and uses `rsync` to deploy the static site while preserving `/blog/`.

Do not commit old WordPress core files, database exports, random PHP files, or full media backups into this repo.
