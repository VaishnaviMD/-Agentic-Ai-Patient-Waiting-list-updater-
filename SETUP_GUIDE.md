# Complete Setup & Quickstart Guide
## How to Clone, Configure, and Run the Platform on Any Machine

This guide provides step-by-step instructions for any developer, reviewer, or interviewer to clone this repository and run the complete system locally with zero friction.

---

## 1. System Requirements & Prerequisites

Ensure the target machine has the following installed:

| Tool | Minimum Version | Why It Is Needed | Download / Install Link |
| :--- | :--- | :--- | :--- |
| **Git** | v2.30+ | To clone and manage version control | [git-scm.com](https://git-scm.com/) |
| **Docker Desktop** | v24.0+ (with Compose v2) | Runs PostgreSQL, FastAPI, React, and n8n in isolated containers | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **WSL 2 (Windows only)** | Ubuntu 22.04 LTS | Required backend engine for Docker Desktop on Windows 11 | Installed automatically with Docker Desktop |
| **Google Gemini API Key** | Free Tier (Gemini 1.5/2.5 Flash) | Powers the AI Agent reasoning and tool calling in n8n | [aistudio.google.com](https://aistudio.google.com/) |
| **Web Browser** | Chrome, Edge, Firefox, Brave | To access the Patient Portal, Admin Dashboard, and n8n | Pre-installed |

> [!NOTE]
> You do **NOT** need to manually install Python, PostgreSQL, Node.js, or n8n on your host machine to run this project. Docker Compose packages and provisions all runtimes, databases, and dependencies inside isolated containers.

---

## 2. Step-by-Step Installation Instructions

### Step 1: Clone the Repository
Open PowerShell (Windows) or Terminal (macOS/Linux) and clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd "waiting-patient-poc"
```

---

### Step 2: Configure Environment Variables (`.env`)
The repository contains a template file called `.env.example`. Create your local `.env` file by copying it:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On macOS / Linux (Bash):**
```bash
cp .env.example .env
```

The default `.env` file contains sensible local defaults that work out of the box with Docker Compose.

---

### Step 3: Obtain Your Free Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** $\rightarrow$ **Create API key in new project**.
4. Copy the API key string (starts with `AIzaSy...`).
*(Keep this key handy; you will paste it into the n8n visual credentials manager in Step 6).*

---

### Step 4: Build and Launch All Containers
Ensure **Docker Desktop is open and running**. Then run:

```bash
docker compose up -d --build
```

**What Docker does during this command:**
1. Creates the isolated internal network (`hospital_net`).
2. Creates persistent volumes (`postgres_data` and `n8n_data`).
3. Starts `hospital_db` (PostgreSQL 16) and runs [`database/init-db.sh`](./database/init-db.sh) to initialize both `hospital_core` and `hospital_n8n` databases.
4. Builds and launches `hospital_backend` (FastAPI / Python 3.11).
5. Builds and launches `hospital_frontend` (React + Vite + Tailwind).
6. Starts `hospital_n8n` (n8n Workflow Engine).

---

### Step 5: Verify Running Microservices

Run the following command to check that all 4 containers are **Up** and **healthy**:

```bash
docker compose ps
```

**Expected Output:**
```
NAME                IMAGE                                  STATUS                    PORTS
hospital_backend    waitingpaitientpoc-hospital_backend    Up (healthy)              0.0.0.0:8000->8000/tcp
hospital_db         postgres:16-alpine                     Up (healthy)              0.0.0.0:5432->5432/tcp
hospital_frontend   waitingpaitientpoc-hospital_frontend   Up                        0.0.0.0:5173->5173/tcp
hospital_n8n        docker.n8n.io/n8nio/n8n:latest         Up                        0.0.0.0:5678->5678/tcp
```

---

### Step 6: Access the Services in Your Browser

| Service | Browser URL | Default Credentials / Purpose |
| :--- | :--- | :--- |
| **Patient & Admin Portal** | [http://localhost:5173](http://localhost:5173) | Frontend web interface for booking, cancellations, offers, and admin dashboard. |
| **FastAPI Interactive Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI for testing all REST and Agent endpoints. |
| **Backend Health Endpoint** | [http://localhost:8000/api/health](http://localhost:8000/api/health) | Verifies backend uptime and database connectivity. |
| **n8n Orchestrator** | [http://localhost:5678](http://localhost:5678) | Create your free local admin account on first launch, import workflows, and set your Gemini API key. |

---

### Step 7: Configuring Google Gemini in n8n (One-Time Setup)
1. Open [http://localhost:5678](http://localhost:5678) in your browser.
2. Complete the initial local setup screen (enter name, email, password).
3. In the left sidebar, click **Credentials** $\rightarrow$ **Add Credential**.
4. Search for **Google Gemini** (or **Google PaLM / Gemini Chat Model**).
5. Paste your API Key from Step 3 and click **Save**.
6. n8n will now securely encrypt your key and power all autonomous AI Agent nodes.

---

## 3. Useful Day-to-Day Docker Commands

```bash
# 1. Stop all containers (data is safely preserved in Docker volumes)
docker compose down

# 2. Start containers again (instant startup)
docker compose up -d

# 3. View live logs of all services
docker compose logs -f

# 4. View live logs of the FastAPI backend only
docker compose logs -f hospital_backend

# 5. Execute database migrations
docker compose exec hospital_backend alembic upgrade head

# 6. Run automated test suite
docker compose exec hospital_backend pytest
```

---

## 4. Troubleshooting & FAQ

### Issue A: "Ports already in use" (e.g., 5432, 8000, 5173, 5678)
- **Cause:** You have a local PostgreSQL or Node process running on your host machine.
- **Solution:** Either stop your local service (e.g. `Stop-Service postgresql` in PowerShell) or change the host port in `docker-compose.yml` (e.g., change `"5432:5432"` to `"5433:5432"`).

### Issue B: "Docker daemon is not running"
- **Solution:** Open Docker Desktop from your Start menu / Applications and wait until the whale icon in the taskbar turns solid green.

### Issue C: Line Endings Error on Windows (`\r: command not found`)
- **Cause:** Git converted Linux shell scripts (`.sh`) to Windows CRLF line endings.
- **Solution:** The project `.gitattributes` enforces LF. If needed, run:
  ```powershell
  (Get-Content -Raw "database/init-db.sh") -replace "`r`n","`n" | Set-Content -NoNewline -Encoding utf8 "database/init-db.sh"
  ```

---

## 5. Summary of Architecture for Evaluators

When explaining this project to a senior engineer or interviewer:
1. **FastAPI + PostgreSQL** is the **Authoritative Core** — it executes ACID transactions, prevents race conditions using `SELECT ... FOR UPDATE`, and calculates priority scores deterministically.
2. **n8n + Gemini** is the **Cognitive Layer** — it observes cancellation events via webhooks, selects tools, coordinates patient offers, and escalates edge cases to humans.
3. **React + Vite** is the **Presentation Layer** — it provides a responsive healthcare SaaS interface with live countdown timers and transparent administrative queues.

