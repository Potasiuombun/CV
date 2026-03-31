# Tudor Portfolio RPG

Interactive portfolio project built with React + Vite, presented as a small RPG-style room exploration experience.

## What this repo contains

- React single-page app rendered into a full-screen canvas-like experience.
- RPG movement and interactions driven by keyboard input.
- Room background/foreground collision logic based on image pixel data.
- Sprite-sheet based player animation (idle, run, attack, interact).

## Main files

- `package.json`
  - Defines scripts: `dev`, `build`, `preview`.
  - Uses `react`, `react-dom`, and `vite`.
- `index.html`
  - App HTML shell with `#root` mount point.
- `src/main.jsx`
  - React entry point.
- `src/App.jsx`
  - Re-exports the main game component.
- `src/PortfolioGame.jsx`
  - Core game logic and UI overlay.
  - Handles input, world movement, collisions, sprite animation, actions, and intro screen.
- `src/index.css`
  - Minimal global styles and utility classes.
- `portofolio.js`
  - Re-export helper pointing to `src/PortfolioGame`.

## Assets

Top-level image assets are used by the game scene and character sprite sheet:

- `Tudor_CV.png`
- `Generic_Home_1_Layer_1.png`
- `Generic_Home_1_Layer_2_.png`

## Controls in the app

- Move: `W/A/S/D` or arrow keys
- Sprint: `Shift`
- Attack: `Space`
- Interact/start: `E`, `Enter`, or `Space`
- Toggle debug overlay: `F1`
- Close overlay/menu state: `Escape`

## Run on Ubuntu (recommended)

1. Open terminal in repo root.
2. Make scripts executable once:

   ```bash
   chmod +x install-deps.sh run-dev.sh
   ```

3. Install dependencies:

   ```bash
   ./install-deps.sh
   ```

4. Start the dev server:

   ```bash
   ./run-dev.sh
   ```

5. Open in browser:

   ```
   http://localhost:5173
   ```

## If Node.js is not installed in Ubuntu

Use `nvm` (recommended):

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts
```

Then run:

```bash
./install-deps.sh
./run-dev.sh
```

## Windows-specific scripts

PowerShell scripts are included for Windows-local Node handling:

- `install-deps.ps1`
- `run-dev.ps1`
- `Activate-NodeEnv.ps1`
- `Deactivate-NodeEnv.ps1`

For Ubuntu/WSL, use the `.sh` scripts.
