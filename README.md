# Nusa HRIS

A demo HRIS (Human Resource Information System) built for my portfolio. All data is fictional.

**Live Demo: [nusa-hris-portfolio.vercel.app] (https://nusa-hris-portfolio.vercel.app)**

## Features
- **Dashboard**: clickable summary tiles, stacked bar chart of attendance (7/14/30 working days) with tooltips, attendance rate line chart, today's status donut, headcount by department, pending approvals, recent activity, and who is on leave today.
- **Employees**: search, filter, sortable columns, full profile with leave balance, add new employees.
- **Attendance**: clock in/out (with a WFH option), today's table with status filters, monthly heatmap.
- **Leave & permits**: request form with balance validation, status tabs, approve/reject by HR, newly submitted rows briefly highlighted.
- **Performance**: quarterly scores, rating distribution, goals (KPIs) with progress, manager reviews. HR fills in reviews, employees see their own performance.
- **Live updates**: clock-in and leave-request activity is simulated in the browser (no backend), with notifications and a pause button.
- **HR Admin** and **Employee** roles (toggle at the top), blue theme, light/dark mode, responsive down to mobile.

## Tech stack
React 18, TypeScript, Vite. No UI or chart libraries; charts are hand-drawn SVG.

## Getting started
```bash
npm install
npm run dev      # development
npm run build    # output: dist/index.html (single file, ready to host)
```

## Project structure
- `src/data.ts` dummy data and leave balance rules
- `src/store.tsx` app state (clock in, leave, employees, performance, live simulation)
- `src/charts.tsx` SVG charts (stacked bar, line, donut)
- `src/pages/` the five main pages
- `src/styles.css` design tokens and components

## Ideas for next steps
Backend (Node/Express + PostgreSQL), authentication, payroll module, report export.
