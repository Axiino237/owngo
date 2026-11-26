# OwnGo Mobility — Platform Monorepo

Welcome to the unified OwnGo Mobility monorepo containing all platform applications, services, and underwriting pipelines.

---

## 🏗 Platform Architecture

This repository contains three core systems:

```text
owngo/
├── auto management system/   # OwnGo Enterprise CRM (Fleet & Partner Management)
│   ├── backend/              # Node.js + Express + Sequelize + PostgreSQL
│   └── frontend/             # React (Vite) + Tailwind / Custom Dark Theme
│
├── Loan/                     # Bajaj Finserv EV Underwriting Desk & Customer Portal
│   ├── backend/              # NestJS + TypeORM + PostgreSQL + Socket.IO (Port 3001)
│   └── frontend/             # React (Vite) + Tailwind (Port 5173)
│
└── owngo website/            # Customer Landing Page & EV Pilot Intake (Port 8088)
    ├── assets/               # Interactive 3D auto, visual assets & styles
    ├── index.html            # High-conversion partner & driver landing page
    └── server.py             # Python FastAPI public intake & visitor tracking
```

---

## ⚡ Quick Start

### 1. OwnGo CRM (Auto Management System)
* **Frontend:** `http://localhost:8085`
* **Backend API:** `http://localhost:5050`
* **Database:** PostgreSQL on port `5436`

### 2. Bajaj Loan Application & Underwriting Desk
* **Frontend:** `http://localhost:5173`
* **Backend API:** `http://localhost:3001`
* **Database:** PostgreSQL on port `5435`

### 3. Public Website
* **URL:** `http://localhost:8088`
* **Server:** `python server.py`
