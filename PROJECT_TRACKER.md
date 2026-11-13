# Project Tracker & Technical Execution Guide
## Agentic AI Hospital Appointment & Intelligent Waitlist Management Platform

> **Live Status:** Phase 1 Complete (Docker Infrastructure, Container Cluster & Scaffolding Operational)  
> **Next Milestone:** Phase 2 (Database Schema, SQLAlchemy Models, Auth, Prioritization Engine & Agent Tools)

---

## 1. Project Architecture & Component Responsibilities

The system is built on a clean separation of concerns:
- **Authoritative Deterministic Core (FastAPI + PostgreSQL):** Handles database persistence, ACID transactions, row-level locks (`SELECT FOR UPDATE`), appointment validation, and deterministic candidate scoring. The AI never bypasses this layer.
- **Cognitive Orchestration Layer (n8n + Google Gemini):** Receives cancellation webhooks, reasons about slot requirements, queries approved backend tools, creates time-limited offers, and escalates edge cases to clinic administrators.
- **Client Presentation Layer (React + TypeScript + Tailwind):** Patient portal for booking, cancellations, waitlist registration, and offer responses; Admin dashboard for scheduling, waitlist queues, agent monitoring, and audit logs.

```
React Frontend (Port 5173)
       │
       ▼ (REST / JWT)
FastAPI Backend (Port 8000) ───► PostgreSQL 16 (Port 5432)
       │
       ▼ (Webhook Event)
n8n Workflow Engine (Port 5678)
       │
       ▼ (Reasoning & Tool Calls)
Google Gemini AI Agent ───► /api/agent/* (FastAPI Internal Tools)
```

---

## 2. Phase-by-Phase Implementation Status

| Phase | Description | Status | What Was Accomplished / Next Action |
| :--- | :--- | :---: | :--- |
| **Phase 0** | System Architecture & Technical Blueprint | ✅ **Done** | Complete 20-section architectural blueprint approved. |
| **Phase 1** | Dev Environment & Multi-Container Docker Cluster | ✅ **Done** | Multi-service Docker Compose running healthy (DB, Backend, Frontend, n8n). |
| **Phase 2** | Database Layer, Migrations, Backend Logic & Agent Tools | ✅ **Done** | 9 ORM models, Alembic migrations, JWT Auth, Deterministic Engine, 9 Agent Tools, Seed Data. |
| **Phase 3** | Frontend Portal & Admin Dashboard Development | ✅ **Done** | Patient portal, live countdown offer banner, doctor booking, admin command center, agent monitor. |
| **Phase 4** | Agentic AI & n8n Workflows Construction | ✅ **Done** | Workflows A, B, C, D built with Gemini AI Agent & Tool calling schemas. |
| **Phase 5** | End-to-End System Integration & Webhooks | ⏳ **Next** | Full cancellation-to-offer integration testing & live loop verification. |
| **Phase 5** | End-to-End System Integration & Webhooks | ⚪ Pending | Real-time webhook wiring and cancellation $\rightarrow$ offer $\rightarrow$ confirmation loop. |
| **Phase 6** | Automated Testing & Concurrency Hardening | ⚪ Pending | Unit tests, concurrency race-condition tests, timeout tests. |
| **Phase 7** | Production Readiness & Developer Documentation | ⚪ Pending | Production environment guides, backup scripts, full README. |
| **Phase 8** | Final Senior-Level Demonstration Scenario | ⚪ Pending | Scripted live demonstration walkthrough for technical interview/review. |

---

## 3. What Has Been Implemented (Phase 1 Details)

| File / Component | Path | Purpose & Implementation Details |
| :--- | :--- | :--- |
| **Docker Compose** | [`docker-compose.yml`](./docker-compose.yml) | Orchestrates 4 microservices on an isolated bridge network (`hospital_net`) with persistent volumes for database data and n8n workflows. |
| **Database Init** | [`database/init-db.sh`](./database/init-db.sh) | Shell script that automatically provisions two isolated logical databases (`hospital_core` and `hospital_n8n`) within a single PostgreSQL 16 instance. |
| **Backend API** | [`backend/app/main.py`](./backend/app/main.py) | FastAPI service entrypoint configured with CORS middleware, root metadata route (`/`), and health-check route (`/api/health`). |
| **Backend Container** | [`backend/Dockerfile`](./backend/Dockerfile) | Python 3.11-slim container with hot-reload Uvicorn server and pre-installed dependencies (`FastAPI`, `SQLAlchemy`, `Pydantic v2`, `Alembic`, `Pytest`). |
| **Frontend Portal** | [`frontend/src/App.tsx`](./frontend/src/App.tsx) | React 18 + Tailwind UI dashboard displaying real-time microservice status by polling the FastAPI `/api/health` endpoint every 5 seconds. |
| **Frontend Container**| [`frontend/Dockerfile`](./frontend/Dockerfile) | Node 20-alpine container running Vite dev server on port 5173 with polling file watchers for Windows compatibility. |
| **Orchestrator** | `hospital_n8n` in compose | Dedicated n8n engine configured with Postgres persistence and Community Packages enabled. |
| **Secrets & Config** | [`.env`](./.env) & [`.env.example`](./.env.example) | Secure environment variables for database connections, JWT secrets, and internal agent credentials. Excluded by [`.gitignore`](./.gitignore). |

---

## 4. How to Run the Platform

All commands should be executed from the project root directory (`C:\project works\waiting paitient poc`):

### Start the Platform
```powershell
docker compose up -d
```

### Stop the Platform (Preserving All Data)
```powershell
docker compose down
```

### Rebuild Containers (After modifying Dockerfiles or requirements)
```powershell
docker compose up -d --build
```

### View Live Container Logs
```powershell
# View all logs
docker compose logs -f

# View backend logs only
docker compose logs -f hospital_backend

# View database logs only
docker compose logs -f hospital_db

# View n8n logs only
docker compose logs -f hospital_n8n
```

### Restart a Single Service
```powershell
docker compose restart hospital_backend
```

---

## 5. How to Verify That Everything Is Working

### 1. In Your Web Browser
Open these 4 URLs in your browser:

1. **Frontend Health Dashboard:**  
   👉 [http://localhost:5173](http://localhost:5173)  
   *Expected:* You will see the **CareFlow AI Health System** dashboard showing green checkmarks for React Portal, FastAPI Core, and PostgreSQL & n8n, along with live JSON health responses.

2. **FastAPI Interactive Swagger UI:**  
   👉 [http://localhost:8000/docs](http://localhost:8000/docs)  
   *Expected:* Interactive OpenAPI/Swagger documentation displaying the root and `/api/health` endpoints. You can click "Try it out" $\rightarrow$ "Execute" to test live responses.

3. **Backend Health Endpoint:**  
   👉 [http://localhost:8000/api/health](http://localhost:8000/api/health)  
   *Expected:* JSON response: `{"status":"healthy", "timestamp":"...", "service":"hospital-backend"}`.

4. **n8n Workflow Engine:**  
   👉 [http://localhost:5678](http://localhost:5678)  
   *Expected:* n8n welcome setup screen asking you to create your initial local admin account.

---

### 2. In PowerShell (CLI Verification)

Run these diagnostic commands to verify all services and database integrity:

```powershell
# 1. Check all container statuses (all should be Up / Healthy)
docker compose ps

# 2. Test FastAPI health endpoint
curl.exe -s http://localhost:8000/api/health

# 3. Verify both PostgreSQL databases exist (hospital_core and hospital_n8n)
docker exec hospital_db psql -U postgres -c "\l"

# 4. Verify n8n HTTP response
curl.exe -s -I http://localhost:5678/
```

---

## 6. What's Next: Phase 2 Implementation Plan

In Phase 2, we build the core domain engine:
1. **SQLAlchemy 2.0 ORM Models:** Define the 9 relational tables (`users`, `patients`, `doctors`, `doctor_availability`, `appointments`, `waitlist`, `appointment_offers`, `workflow_executions`, `audit_logs`).
2. **Alembic Migrations:** Set up automated versioned database migrations.
3. **Authentication & RBAC:** Implement password hashing (bcrypt) and JWT authentication with patient vs. admin role guards.
4. **Appointment Management:** Endpoints to book and cancel appointments (dispatching webhook events).
5. **Deterministic Prioritization Engine:** Pure Python scoring logic (+25 day, +25 time, +25 seniority, +25 history) with automated Pytest unit tests.
6. **Agent Tools Endpoints (`/api/agent/*`):** Secure internal endpoints for Gemini tool calling with row-level transaction locks (`SELECT FOR UPDATE`).

