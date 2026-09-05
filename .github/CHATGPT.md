# Edit Life Charge Chiropractic from ChatGPT Work

Repository: https://github.com/pianapal/lifecharge-site
Live site: https://lifechargechiropractic.com/
Production branch: `main`

## Start in ChatGPT

Open ChatGPT on the web or mobile, select Work, and use the GitHub plugin.
Give the exact repository URL above and ask ChatGPT to read this file and any
`AGENTS.md` before editing. The GitHub connection must have access to this repository
and permission to write repository contents. A successful public file read alone
does not prove write access. An empty repository list or a 403/404 requires checking
the GitHub connection and its repository permissions.

## Editing and publishing

1. Read the current files from GitHub. Do not rely on a desktop checkout or old chat attachments.
2. Make the requested changes on a branch when a review is requested. Read existing files
   before replacing them, preserving unrelated content. Use the current blob SHA for updates.
3. For several related files, use one commit so production receives a consistent set.
4. Check the changed pages, links, and data. Follow the repository-specific notes below.
5. When publishing is authorized, merge or commit the reviewed changes to `main`.
   Every push to `main` starts `.github/workflows/deploy.yml` (Deploy to cPanel).
6. Check the push-triggered Actions run for the published commit, then fetch the changed
   live URL and confirm the actual content. A commit alone is not proof of deployment.

GitHub Actions and the hosting server perform deployment. The user's Mac does not
need to be running. Do not request or copy SSH keys, server passwords, or GitHub
secrets into chat. Keep existing deployment exclusions and hosting unchanged.
If the chat cannot run required generation or validation, report that limitation
and leave the change unmerged instead of claiming it is ready.

## Site-specific notes

Read the complete root `AGENTS.md` for brand, layout, and validation rules.
Edit `slug/index.html` for directory routes, not only the legacy `slug.html`.
Edit `shared.src.css` and rebuild `shared.css` using the command in `AGENTS.md`.
Commit both CSS files together. WordPress `/blog/` is separate and excluded from deploys.

## Example request

> Use GitHub to edit this repository. Read `.github/CHATGPT.md` and any `AGENTS.md`.
> Make this change: [describe the change]. Check it, publish it to main, then verify
> the deployment and the changed live page. Use cloud tools without my computer.

## Connection setup

The ChatGPT Codex Connector must be both authorized for the GitHub user and
installed on the repository owner's account. Reconnecting OAuth alone does not
install the app. Manage installation access in GitHub Settings > Applications >
Installed GitHub Apps. All-repository access includes future repositories under
that owner, but each future website still needs its own cloud publishing setup.
