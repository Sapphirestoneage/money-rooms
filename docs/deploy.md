# Pushing and deploying

How Money Rooms gets from this computer to a public web page. Written 2026-10-03, when the code existed only on Eli's Windows computer and had never been pushed.

## What is already in place

- The code is a git repository with every change committed.
- `.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages on every push to `main`. Since 2026-10-04 (branch `foundations`, Proposed) it is three jobs: `test` (types, every test, the Maya tie-out), then `build`, then `deploy`, each needing the one before, so a red test or a broken tie-out stops the deploy before anything is built.
- `.github/workflows/ci.yml` runs the same checks plus the build on every other branch and every pull request, so a problem is seen before it reaches `main`.
- The site builds for the address `https://<your-username>.github.io/money-rooms/`.

## What has to happen once

Three steps. Two can be done from a phone. One needs the computer.

### 1. Create an empty repository (phone)

1. Open github.com in the phone's browser, or the GitHub app, and sign in.
2. Create a new repository named `money-rooms`. Make it public. Do not add a README, a license, or a .gitignore: the repository must start empty.
3. Note your GitHub username.

### 2. Push the code (computer, about two minutes)

This is the one step that cannot be done from a phone, because the code is on the computer and GitHub needs a sign-in from that machine before it will accept it.

In a Claude Code session on the computer, say: "Push money-rooms to GitHub. My username is ...". Claude runs:

```
git remote add origin https://github.com/<your-username>/money-rooms.git
git push -u origin main
```

The first push opens a GitHub sign-in window in the computer's browser. Sign in there and approve. That sign-in is saved on the computer by Git Credential Manager (already installed with Git), so later pushes need nothing from you. Claude never sees or handles your password.

No extra software is needed. The GitHub CLI is optional.

### 3. Turn on Pages (phone)

1. On github.com, open the `money-rooms` repository, then Settings, then Pages.
2. Under "Build and deployment", set Source to "GitHub Actions".
3. Open the Actions tab and rerun the "Deploy to GitHub Pages" run if the first one failed because Pages was not on yet.
4. A few minutes later the app is live at `https://<your-username>.github.io/money-rooms/`.

## After that

- **From the computer:** every push to `main` redeploys automatically.
- **From a phone:** once the code is on GitHub, Claude Code on the web (claude.ai/code, also reachable from the Claude mobile app) can work on the repository in the cloud and push its own commits, which redeploy the same way. The computer is no longer needed for day-to-day changes.

## If something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| The push asks for a sign-in again | The saved sign-in expired | Sign in again in the window that opens |
| The deploy run is red at "npm test" | A test failed | Nothing was published. Fix the test first |
| The deploy run is red at "deploy" | Pages source is not set to GitHub Actions | Do step 3 |
| The page loads but is blank | The repository has a different name than `money-rooms` | Tell Claude the real name; the build path in `vite.config.ts` must match it |
