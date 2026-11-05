# Which Court? ⚖️

A guidance and learning tool for Singapore law students and junior lawyers.

- **Forum Finder**: enter the claim amount and its nature, and see the likely forum, the alternatives, the reasoning with a source for each step, an abandon-the-excess calculator and a limitation check.
- **Deadline Navigator** (Phase 2): enter a key date and see the next ROC 2021 steps, with each deadline worked out.

> **Guidance only. Verify against current legislation. Not legal advice.**

## How the rules work

Every limit, period, fee and forum rule lives in a JSON file in [`/rules`](rules/README.md).
Each rule records its legal source, a link, a last-verified date and a status
(`UNVERIFIED`, `SOURCE_CHECKED` or `VERIFIED`). The app reads only from these
files, and the **Sources** page lists every rule. To change a rule, edit its
JSON file and open a pull request. See [rules/README.md](rules/README.md).

## Run it on your Windows computer

You only need to do steps 1 and 2 once.

### 1. Install the tools

1. **Git**: download from <https://git-scm.com/download/win> and run the installer. The default options are fine.
2. **Node.js**: download the **LTS** version (22 or newer) from <https://nodejs.org> and run the installer. The default options are fine.
3. Optional: **Visual Studio Code** from <https://code.visualstudio.com>, to read and edit the files.

To check that the tools installed, open **PowerShell** (press Start, type `PowerShell`, press Enter) and run:

```powershell
git --version
node -v
npm -v
```

Each command should print a version number. If one says "not recognized", close PowerShell, open it again and retry.

### 2. Download the project

In PowerShell:

```powershell
cd $HOME\Documents
git clone https://github.com/GabrielleNila/which-court.git
cd which-court
npm install
```

`npm install` downloads the libraries the app needs. It takes a minute or two.

### 3. Start the app

```powershell
cd $HOME\Documents\which-court
npm run dev
```

Open <http://localhost:3000> in your browser. Leave PowerShell open while you use the app. Press `Ctrl + C` in PowerShell to stop it.

### 4. Run the tests

```powershell
npm test
```

You should see every test pass.

### 5. Try a branch before it is merged

Each phase arrives as a pull request on its own branch. To run a branch locally:

```powershell
git fetch
git checkout phase-1-forum-finder
npm install
npm run dev
```

To go back to the live version: `git checkout main` then `git pull`.

## Deployment

Vercel deploys `main` to production automatically, and builds a preview link for every pull request.
GitHub Actions runs lint, the tests and a build on every pull request.

## Project layout

```
rules/              legal data only (JSON) + how-to-edit guide
src/app/            pages: home, forum-finder, deadlines, sources
src/components/     UI pieces (status badges, citations, Learn more panels)
src/lib/rules/      loads and validates the JSON with a schema
src/lib/forum/      Forum Finder logic (no legal values inside)
src/lib/dates/      calendar date helpers
tests/              unit tests (Vitest)
```

Saving data goes through a storage adapter (added in Phase 3), so a Supabase
backend can be added later without changing the pages.
