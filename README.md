# West Bengal 2026 Budget Dashboard

An interactive, responsive, and data-rich web dashboard designed to visualize the West Bengal State Budget for the 2026-2027 fiscal year. 

## Overview
This dashboard parses and presents the massive West Bengal state budget into digestible, highly visual components. It breaks down budget allocations across all state departments, extracts hundreds of individual departmental schemes and initiatives, and allows users to explore the data dynamically through interactive charts and robust search capabilities.

## Features
- **Macro-level Budget Visualizations:** Interactive pie and bar charts depicting the distribution of the state's outlays, tracking exactly where the "Rupee Comes From" and where the "Rupee Goes To."
- **Initiatives Word Map:** A dynamic word cloud visualization automatically analyzing textual frequency across all budget allocations to highlight key thematic focus areas, complete with customizable filters.
- **Departmental Drill-down:** A comprehensive breakdown of over 50 state departments, sorting schemes dynamically by allocation size and department footprint.
- **Enriched Scheme Data:** Over 550 state-run schemes, projects, and welfare programs deeply enriched with detailed context and precise budgetary outlays.
- **Geographic Footprint Map:** An interactive, zero-cost `Leaflet.js` map utilizing CARTO Voyager tiles to pinpoint the geographical locations of major state infrastructure projects, dynamically synced with the active search and filter state.
- **Smart Filtering & Search:** A fast, real-time search engine with smart, multi-select tag filtering (e.g., `#Agriculture`, `#Infrastructure`, `#Education`, `#WomenEmpowerment`) to quickly isolate specific policy areas.
- **Modern Adaptive UI:** A premium user interface built from scratch utilizing clean CSS glassmorphism, fluid micro-animations, and seamless Dark/Light Mode toggling.

## Technical Stack
- **Frontend Framework:** Built with [Vite](https://vitejs.dev/) for lightning-fast HMR and optimized production builds.
- **Data Architecture:** A purely static, serverless architecture driven entirely by compiled `data.json` and `charts_data.json` artifacts, resulting in zero-latency data querying.
- **Visualization:** Integrated with `chart.js`, `chartjs-chart-wordcloud`, and `Leaflet.js` for responsive, accessible data graphics and mapping.
- **Styling:** Vanilla CSS3 emphasizing modularity, CSS variables (tokens), and modern layout techniques without the overhead of heavy utility frameworks.
- **Hosting:** Fully configured for CI/CD deployment via GitHub Actions and hosted statically on GitHub Pages.

## Local Development

To run this dashboard locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/GhoshitaGhosh/wb-2026-budget-dashboard.git
   cd wb-2026-budget-dashboard/budget-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the Vite development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## Deployment
This repository is configured with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys the Vite application to GitHub Pages whenever changes are pushed to the `main` branch. 

*Designed and engineered iteratively with an emphasis on data integrity, accessibility, and visual excellence.*
