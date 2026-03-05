# Claro Asesor - Project Context & Guidelines

## Project Overview
**Claro Asesor** is a specialized PWA (Progressive Web App) designed for telecommunications sales advisors. It provides tools for service quoting, customer onboarding (links to external/internal forms), and sales opportunity mapping.

### Main Technologies
- **Frontend:** Vanilla HTML5, CSS3 (Modern features like CSS variables, Flexbox, Grid).
- **Logic:** Modular JavaScript (ES6 Modules).
- **Mapping:** [Leaflet.js](https://leafletjs.com/) for interactive opportunity maps.
- **Charts:** [Chart.js](https://www.chartjs.org/) for cost distribution visualization.
- **Exporting:** [jsPDF](https://github.com/parallax/jsPDF) (implied for PDF export) and Web Share API.
- **Data:** JSON-based configuration for prices (`prices.json`) and external links (`links.json`).

## Key Features & Architecture

### 1. Quoting Engine (`js/calculator.js`)
Decoupled logic for calculating costs of:
- **Internet & TV (BAF):** Residential, Dynamic IP, and Fixed IP plans.
- **Mobile Portability:** Consumer and Corporate plans with multi-operator pricing.
- **Benefits:** Automatic application of "Abono Claro" discounts, "Claro Pay" cashback, and "Pack Fútbol".

### 2. Opportunity Map (`js/dashboard.js`)
An interactive map that allows advisors to:
- Load JSON scans of network splitters.
- Visualize available ports (Green: New/Empty, Red: 1 port left, Black: Saturated).
- Use Geolocation to find sales opportunities within 400 meters.
- Filter by OLT or port availability.

### 3. Price Management (`js/config.js`)
An in-app JSON editor (accessible via the ⚙️ icon) that allows temporary session-level overrides of the `prices.json` file. 

### 4. Dynamic Navigation (`links.json`)
The tabs (Carga, Herramientas, CRM) are populated dynamically based on `links.json`, allowing easy updates to external form URLs and internal tool triggers.

## Development Conventions

### Coding Style
- **Modules:** Use ES6 `import`/`export` for all new logic.
- **DOM Access:** Centralize selectors in `js/constants.js` under `DOM_SELECTORS`.
- **State:** Global state is minimal and managed in `script.js`.
- **UI:** Use `js/ui.js` for DOM manipulations and `js/toast.js` for user notifications.
- **Naming:** Follow `camelCase` for functions/variables and `UPPER_SNAKE_CASE` for constants.

### Folder Structure
- `/js/`: Modularized logic (calculator, ui, storage, etc.).
- `/lib/`: Local vendor dependencies (e.g., Leaflet) to ensure PWA/offline functionality.
- `/icons/`: PWA manifest icons.
- `prices.json`: The "Source of Truth" for pricing.
- `links.json`: Configuration for links and dynamic buttons.

## Important Workflows

### Updating Prices
To permanently update prices, modify `prices.json`. To test changes during development, use the "Configuration" modal (gear icon) in the app.

### Adding New Tools/Links
Add a new entry to the corresponding array in `links.json`.
- `action: "url"`: Opens an external link.
- `action: "internal-form"`: Shows a hidden form within the app (requires `targetId`).
- `action: "open-dashboard"`: Triggers the opportunity map.

### Build & Run
- This is a **no-build** project. It can be served using any static web server (e.g., `npx serve`, `python -m http.server`, or Live Server in VS Code).
- **PWA Testing:** Requires HTTPS or `localhost` for Service Worker registration.

## Testing Strategy
- **Manual Verification:** Since there is no automated test suite, verify price calculations by comparing the "Breakdown" and "Total" against known Claro price lists.
- **Mobile First:** Always verify layout and interactions on mobile screen sizes, as this is the primary device for advisors in the field.
