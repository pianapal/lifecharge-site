# Life Charge Chiropractic Website

## Current production editing workflow

Use ChatGPT Work with the GitHub plugin and repository `pianapal/lifecharge-site`.
Read [the ChatGPT editing guide](.github/CHATGPT.md) before making changes.
Publishing to `main` automatically runs GitHub Actions and deploys to https://lifechargechiropractic.com/.
No local computer or server credentials are needed in ChatGPT.
The GitHub connection must have repository read/write access.


Static HTML site for `lifechargechiropractic.com`, with WordPress reserved for `/blog/`.

## Structure

- Root files and route folders deploy to `/home/drpaidtv/lifechargechiropractic.com/`
- `/blog/` is intentionally not included in this repo package because WordPress owns that path
- `wordpress-theme/lifecharge-blog/` contains the custom WordPress blog theme source

## Deployment

The active publishing path is `.github/workflows/deploy.yml`: a push to `main` deploys through GitHub Actions while preserving `/blog/`.

Do not commit old WordPress core files, database exports, random PHP files, or full media backups into this repo.
