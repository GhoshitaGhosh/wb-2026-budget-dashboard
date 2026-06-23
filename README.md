# West Bengal 2026 Budget Dashboard

An interactive, responsive, and data-rich web dashboard designed to visualize the West Bengal State Budget for the 2026-2027 fiscal year. 

## Overview
This dashboard parses and presents the massive West Bengal state budget into digestible, highly visual components. It breaks down budget allocations across all state departments, extracts hundreds of individual departmental schemes and initiatives, and allows users to explore the data dynamically through interactive charts and robust search capabilities.

## Features
- **Macro-level Budget Visualizations:** Interactive pie and bar charts depicting the distribution of the state's outlays, tracking exactly where the "Rupee Comes From" and where the "Rupee Goes To."
- **Departmental Drill-down:** A comprehensive breakdown of over 50 state departments, sorting schemes dynamically by allocation size and department footprint.
- **Enriched Scheme Data:** Over 400 state-run schemes, projects, and welfare programs deeply enriched with detailed context and precise budgetary outlays.
- **Smart Filtering & Search:** A fast, real-time search engine with smart, multi-select tag filtering (e.g., `#Agriculture`, `#Infrastructure`, `#Education`, `#WomenEmpowerment`) to quickly isolate specific policy areas.
- **Glassmorphism Design:** A premium, modern user interface built from scratch utilizing clean CSS glassmorphism, fluid micro-animations, and a responsive grid system.

## Technical Stack
- **Frontend Framework:** Built with [Vite](https://vitejs.dev/) for lightning-fast HMR and optimized production builds.
- **Data Architecture:** A purely static, serverless architecture driven entirely by compiled `data.json` and `charts_data.json` artifacts, resulting in zero-latency data querying.
- **Styling:** Vanilla CSS3 emphasizing modularity, CSS variables (tokens), and modern layout techniques without the overhead of heavy utility frameworks.
- **Hosting:** Fully configured for CI/CD deployment via GitHub Actions and hosted statically on GitHub Pages.

## Local Development

To run this dashboard locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/wb-2026-budget-dashboard.git
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
