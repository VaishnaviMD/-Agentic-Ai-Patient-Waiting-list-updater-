# CareFlow AI Hospital Scheduling Platform
## Senior Demonstration Runbook & Complete Setup Guide

> **Quick Reference Guide:** Use this document whenever you need to demonstrate the working platform to a senior engineer, interviewer, or client. It contains all login credentials, 1-click startup/shutdown scripts, live execution steps, custom patient testing, and architectural explanations.

---

## 1. Quick-Start Scripts (1-Click Controls)

Three automated helper scripts are provided in the project root:

| Script | Purpose | How to Run |
| :--- | :--- | :--- |
| **`start_demo.bat`** | Starts Docker containers, waits for health, and seeds demo data | Double-click in File Explorer or run `.\start_demo.bat` |
| **`reset_demo.bat`** | Resets the database between demo runs (Alice scheduled, Bob waiting) | Double-click in File Explorer or run `.\reset_demo.bat` |
| **`stop_demo.bat`** | Cleanly shuts down all 4 containers and frees up ports & RAM | Double-click in File Explorer or run `.\stop_demo.bat` |

> [!TIP]
> **If double-clicking does not launch in Windows:**
> 1. Make sure **Docker Desktop** is running first.
> 2. If Windows associates `.bat` with your code editor, simply **Right-Click** `start_demo.bat` $\rightarrow$ click **Run as administrator** or **Open**.
> 3. Alternatively, open **PowerShell** in the project folder and type:
>    ```powershell
>    .\start_demo.bat
>    ```

---

## 2. Pre-Configured Demo Accounts & Credentials

The system comes pre-seeded with realistic clinical accounts:

| Role | Name | Email | Password | Pre-Configured State |
| :--- | :--- | :--- | :--- | :--- |
| **Patient 1 (Canceller)** | Alice Smith | `alice@example.com` | `Password123!` | Scheduled appointment with Dr. Sharma (Monday at 3:00 PM) |
| **Patient 2 (Rank #1 Waitlist)** | Bob Williams | `bob@example.com` | `Password123!` | On waitlist (Prefers Monday Afternoon) $\rightarrow$ **Rank 1 Candidate** |
| **Patient 3 (Rank #2 Waitlist)** | Charlie Brown | `charlie@example.com` | `Password123!` | On waitlist (Prefers Any Day) $\rightarrow$ **Rank 2 Candidate** |
| **Hospital Administrator** | Admin Staff | `admin@careflow.hospital` | `Admin123!` | Full access to Observability Dashboard & Audit Trails |

---

## 3. Web Service Addresses

| Service | Local URL | Description |
| :--- | :--- | :--- |
| **Patient & Admin Portal** | [http://localhost:5173](http://localhost:5173) | React + TypeScript + Tailwind UI |
| **n8n AI Orchestrator** | [http://localhost:5678](http://localhost:5678) | Visual AI Agent workflows & live execution traces |
| **Backend API & Swagger** | [http://localhost:8000/docs](http://localhost:8000/docs) | FastAPI OpenAPI documentation & tool schemas |

---

## 4. Step-by-Step Live Demonstration Script

### Setup: Open 3 Browser Windows Side-by-Side
1. **Window 1 (Standard Chrome):** [http://localhost:5173/login](http://localhost:5173/login) $\rightarrow$ Log in as **Alice Smith** (`alice@example.com` / `Password123!`)
2. **Window 2 (Incognito / 2nd Browser):** [http://localhost:5173/login](http://localhost:5173/login) $\rightarrow$ Log in as **Bob Williams** (`bob@example.com` / `Password123!`)
3. **Window 3:** [http://localhost:5678/workflow/Bi9sopk66Q27ifCv/executions](http://localhost:5678/workflow/Bi9sopk66Q27ifCv/executions) $\rightarrow$ n8n **Executions** tab

---

### Act 1: The Executive Pitch (Explain the Architecture)
> **What to Say:**  
> *"When a patient cancels an appointment at the last minute, clinics lose critical revenue while waitlisted patients wait weeks. Traditional systems rely on manual staff phone calls or blind mass-SMS blasts that cause race conditions.  
>  
> We solved this by pairing **Google Gemini (AI Agent)** with an **Authoritative Deterministic Core**:  
> - **FastAPI and PostgreSQL** enforce ACID transactions, concurrency row-level locks (`SELECT FOR UPDATE`), and pure Python multi-factor priority scoring.  
> - **Google Gemini inside n8n** acts as the cognitive coordinator—it receives the webhook cancellation, reasons about the slot, queries clinical tools, picks the highest-priority candidate, and delivers a time-limited expiring offer."*

---

### Act 2: Triggering the Cancellation (Window 1 - Alice)
1. In Window 1 (Alice), show her appointment with **Dr. Sharma (Cardiology)** on **Monday at 3:00 PM** (`SCHEDULED`).
2. Click the red **"Cancel Appointment"** button.
3. In the dialog, type the reason: `"Work travel"`.
4. Click **"Confirm Cancellation"**.
5. Alice's appointment instantly updates to `CANCELLED`.

---

### Act 3: Inspecting the AI Agent's Thinking (Window 3 - n8n)
1. Switch to Window 3 (n8n Executions).
2. Within ~2 seconds, a new execution row appears with a **green checkmark (Success)**.
3. Click the execution to inspect the live node graph and tool calls:
   - **`get_appointment_details`**: Retrieves slot parameters (Dr. Sharma, Monday, Afternoon).
   - **`find_eligible_patients`**: Queries active waitlisted candidates.
   - **`rank_waitlist_candidates`**: Calculates multi-factor deterministic scores:
     - *Day Match:* +25 exact match
     - *Time Match:* +25 exact match
     - *FIFO Seniority:* Up to +30 points
     - *History Fairness:* Penalizes repeated declines, boosts patient fairness
   - **`create_appointment_offer`**: Generates a pending offer in PostgreSQL with a strict **15-minute expiration timestamp**.
   - **`notify_patient`**: Dispatches the in-app notification alert to Bob.

---

### Act 4: Real-Time Offer Delivery & Live Countdown (Window 2 - Bob)
1. Switch to Window 2 (Bob Williams).
2. Point out the glowing **Urgent Alert Banner** at the top of the dashboard:
   - **Doctor:** Dr. Rajesh Sharma (Cardiology)
   - **Slot:** Next Monday at 3:00 PM
   - **Live Countdown Timer:** `14:59... 14:58... 14:57...`
3. Explain:
   > *"Bob's portal immediately detects the active offer. Notice the live 15-minute ticking countdown. If Bob declines or lets the timer expire, our secondary automated monitor sweeps the offer and delivers it to the next candidate (Charlie)."*

---

### Act 5: Accepting the Offer & Verifying Database Locks
1. In Bob's portal, click the green **"Accept Offer"** button $\rightarrow$ Click **"Confirm"**.
2. Bob's upcoming appointment list immediately shows the slot as **Booked / Scheduled**.
3. Explain:
   > *"Under the hood, `accept_offer_atomic()` executed a `SELECT ... FOR UPDATE` row lock in PostgreSQL. Even if multiple candidates clicked at the exact same millisecond, the database engine enforces atomicity—preventing double-booking."*

---

## 5. Testing with Any Custom / Newly Registered Patient

You are not limited to pre-seeded accounts. The system supports full dynamic user registration and waitlist matching:

1. **Register a New Person:**
   - Go to [http://localhost:5173/register](http://localhost:5173/register)
   - Fill in details (e.g. `David Miller`, `david@example.com`, `Password123!`).
   - Click **Create Account**. A new clinical Patient record with a unique MRN is created in PostgreSQL.
2. **Join the Waitlist:**
   - In David's dashboard, click **Join Waitlist**.
   - Select **Dr. Sharma**, preferred day (e.g. `Monday` or `Any`), preferred time (e.g. `Afternoon` or `Any`), and enter reason.
   - Click **Join Waitlist**. David is now actively registered in the database.
3. **Trigger AI Prioritization:**
   - When any appointment with Dr. Sharma is cancelled, the Gemini agent scans the waitlist, ranks David against all other waiting patients, and routes the offer to whoever has the highest clinical/seniority score.

---

## 6. How to Close the System Properly

When you are done demonstrating:
- **1-Click:** Double-click `stop_demo.bat`
- **Or Terminal:** Run:
  ```powershell
  docker compose down
  ```
All containers will stop cleanly. Your database and workflow state are safely preserved in Docker volumes.

> [!CAUTION]
> Never use `docker compose down -v`. The `-v` flag deletes Docker volumes, which would erase your saved n8n configurations and database tables. Always use standard `docker compose down` or `stop_demo.bat`.

---

## 7. Frequently Asked Senior Technical Questions

#### Q1: "Why did you use n8n instead of purely Python code with LangGraph?"
> **Answer:** *"n8n provides visual observability, error recovery, built-in retry logic, and zero-code workflow edits for clinic operators. However, all clinical business logic is decoupled from n8n: n8n simply coordinates tool calls to FastAPI endpoints. If we ever want to swap n8n for LangGraph or Temporal, our backend API contracts remain 100% identical."*

#### Q2: "How do you prevent two patients from booking the exact same cancelled slot?"
> **Answer:** *"At two independent layers:  
> 1. **Database engine layer:** PostgreSQL enforces a partial unique index `uq_pending_offer_per_appointment` on `appointment_offers` where `status = 'pending'`. The DB will raise a 409 Conflict if two offers are created simultaneously.  
> 2. **Transaction layer:** When a patient accepts an offer, `accept_offer_atomic()` executes `SELECT ... FOR UPDATE` row-level locks on both the offer row and appointment slot. Any concurrent request must wait for the transaction commit and will immediately receive a 400 Bad Request indicating the slot is already booked."*

#### Q3: "What prevents Gemini from hallucinating an offer or modifying patient scores?"
> **Answer:** *"Gemini has zero direct write privileges on the database and does not compute scores. Scoring is executed exclusively in pure Python by `PrioritizationEngine.calculate_score()`. Gemini only receives the ranked list and invokes our pre-validated `create_offer` tool. Any invalid payload is caught by Pydantic v2 schemas and rejected with HTTP 422."*
