# CareFlow AI Hospital Scheduling Platform
## Senior Demonstration Runbook & Presentation Guide

> **Quick Reference Guide:** Use this document whenever you need to demonstrate the working platform to a senior engineer, interviewer, or client. It contains all login credentials, pre-demo reset commands, live execution steps, and explanation scripts.

---

## 1. Demo User Accounts & Credentials

The system comes pre-seeded with realistic clinical accounts. All accounts use standard passwords for instant demonstration:

| Role | Name | Email | Password | Pre-Configured State |
| :--- | :--- | :--- | :--- | :--- |
| **Patient 1 (Canceller)** | Alice Johnson | `alice@example.com` | `Password123!` | Scheduled appointment with Dr. Sharma (Monday at 3:00 PM) |
| **Patient 2 (Rank #1 Waitlist)** | Bob Williams | `bob@example.com` | `Password123!` | On waitlist (Prefers Monday Afternoon) $\rightarrow$ **Score: 100 pts** |
| **Patient 3 (Rank #2 Waitlist)** | Charlie Davis | `charlie@example.com` | `Password123!` | On waitlist (Prefers Any Day) $\rightarrow$ **Score: 80 pts** |
| **Hospital Administrator** | Admin Staff | `admin@careflow.hospital` | `Admin123!` | Full access to Observability Dashboard & Audit Trails |

---

## 2. One-Click Demo Reset Command

Run this command in Windows PowerShell before every demonstration to reset the database to a fresh state (Alice scheduled, Bob & Charlie waiting, no old offers):

```powershell
docker compose exec hospital_backend python -c "from app.seed_data import seed_database; seed_database()"
```

*Expected Output:*
```
🌱 Seeding CareFlow AI Health Platform demo data...
  ✅ Reset demo appointment #1 for Alice with Dr. Sharma at Monday 03:00 PM
  ✅ Bob waitlist status reset to WAITING
  ✅ Charlie waitlist status reset to WAITING
🎉 Database seeding completed successfully!
```

---

## 3. Browser Window Setup Before Starting

Open the following 3 browser tabs or windows:

1. **Window 1 (Standard Chrome):** [http://localhost:5173/login](http://localhost:5173/login)  
   *(You will log in as Alice Johnson)*
2. **Window 2 (Incognito / Private Window):** [http://localhost:5173/login](http://localhost:5173/login)  
   *(You will log in as Bob Williams)*
3. **Window 3:** [http://localhost:5678](http://localhost:5678)  
   *(Open n8n $\rightarrow$ Navigate to **Executions** tab in the left sidebar)*

---

## 4. Step-by-Step Live Demonstration Script

### Act 1: The Executive Pitch (Explain the Architecture)
> **What to Say:**  
> *"When a patient cancels an appointment at the last minute, clinics lose revenue while waitlists suffer. Traditional solutions rely on manual phone calls or blind FIFO mass-SMS blasts that create race conditions.  
>  
> We solved this by pairing **Google Gemini** with an **Authoritative Deterministic Core**:  
> - **FastAPI and PostgreSQL** enforce ACID transactions, concurrency row-level locks (`SELECT FOR UPDATE`), and pure Python deterministic scoring.  
> - **Google Gemini inside n8n** acts as the cognitive orchestration layer—it receives the cancellation event, reasons about the slot, queries backend tools, evaluates candidate scores, and extends time-limited offers."*

---

### Act 2: Triggering the Cancellation (Window 1 - Alice)
1. In Window 1, log in as **Alice Johnson** (`alice@example.com` / `Password123!`).
2. Show Alice's dashboard:
   - Doctor: **Dr. Rajesh Sharma** (Cardiology)
   - Time: **Next Monday at 3:00 PM**
   - Status: **Scheduled**
3. Click the red **"Cancel Appointment"** button.
4. In the modal, type the reason: `"Emergency business travel"`.
5. Click **"Confirm Cancellation"**.
6. Point out:
   > *"The moment Alice confirms, FastAPI marks the appointment cancelled, records an immutable audit log, and immediately dispatches an asynchronous event to our local n8n orchestrator."*

---

### Act 3: Inspecting the AI Agent's Thinking (Window 3 - n8n)
1. Switch to Window 3 ([http://localhost:5678](http://localhost:5678)).
2. Click **Executions** in the left sidebar $\rightarrow$ Click the latest execution of **CareFlow - Appointment Cancellation Coordinator**.
3. Point out the visual execution path and show the senior engineer the tool calls:
   - **Tool 1 (`get_appointment_details`):** Retrieves the cancelled slot time (Monday Afternoon with Dr. Sharma).
   - **Tool 2 (`find_eligible_patients`):** Queries active waitlisted patients for Dr. Sharma (finds Bob Williams and Charlie Davis).
   - **Tool 3 (`rank_waitlist_candidates`):** Invokes our deterministic scoring engine:
     - *Bob Williams:* Day Match (+25) + Time Match (+25) + FIFO Rank #1 (+25) + History Fairness (+25) = **100 Points (Rank 1)**.
     - *Charlie Davis:* Day Flexible (+15) + Time Flexible (+15) + FIFO Rank #2 (+20) + History (+25) = **75-80 Points (Rank 2)**.
   - **Tool 4 (`create_appointment_offer`):** Creates an official offer for Bob Williams with a strict **15-minute expiration timestamp**.
   - **Tool 5 (`notify_patient`):** Dispatches an in-app alert to Bob's patient portal.

---

### Act 4: Real-Time Offer Delivery & Live Countdown (Window 2 - Bob)
1. Switch to Window 2 (Incognito window).
2. Log in as **Bob Williams** (`bob@example.com` / `Password123!`).
3. Point out the glowing **Teal Urgent Alert Banner** at the top of the dashboard:
   - **Doctor:** Dr. Rajesh Sharma (Cardiology)
   - **Slot:** Next Monday at 3:00 PM
   - **Live Countdown Timer:** `14:52... 14:51... 14:50...`
4. Explain:
   > *"Bob's portal immediately detects the active offer via our 3-second reactive poll. Notice the live ticking countdown. Bob has exactly 15 minutes to respond. If Bob declines or lets the timer expire, Workflow B or C automatically pulls the next candidate (Charlie Davis) and offers the slot to him."*

---

### Act 5: Accepting the Offer & Verifying Database Locks
1. In Bob's portal, click the green **"Accept Offer"** button.
2. Show the confirmation notification:
   > *"Appointment offer accepted! Your appointment is successfully confirmed."*
3. Show the UI update:
   - The banner disappears.
   - The appointment with Dr. Sharma now appears in Bob's **Upcoming Appointments** list as **Booked**.
4. Explain:
   > *"Under the hood, `accept_offer_atomic()` executed a `SELECT ... FOR UPDATE` row lock on PostgreSQL. This guarantees that even if multiple requests arrive at the exact same millisecond, only Bob's transaction commits, and no double-booking is physically possible."*

---

## 5. Frequently Asked Senior Technical Questions

#### Q1: "Why did you use n8n instead of purely Python code with LangGraph?"
> **Answer:** *"n8n provides visual observability, error recovery, built-in retry logic, and zero-code workflow edits for clinic operators. However, we decoupled all business logic from n8n: n8n simply coordinates tool calls to FastAPI endpoints. If we ever want to swap n8n for LangGraph or Temporal, our backend contracts remain 100% identical."*

#### Q2: "How do you prevent two patients from booking the exact same cancelled slot?"
> **Answer:** *"At two independent layers:  
> 1. **Database engine layer:** PostgreSQL enforces a partial unique index `uq_pending_offer_per_appointment` on `appointment_offers` where `status = 'pending'`. The DB will raise a 409 Conflict if two offers are created simultaneously.  
> 2. **Transaction layer:** When a patient accepts an offer, `accept_offer_atomic()` executes `SELECT ... FOR UPDATE` row-level locks on both the offer row and appointment slot. Any concurrent request must wait for the transaction commit and will immediately receive a 400 Bad Request indicating the slot is already booked."*

#### Q3: "What prevents Gemini from hallucinating an offer or modifying patient scores?"
> **Answer:** *"Gemini has zero write privileges on the database and no ability to compute scores. Scoring is executed exclusively in pure Python by `PrioritizationEngine.rank_candidates()`. Gemini only receives the ranked list and invokes our pre-validated `create_offer` tool. Any invalid payload is caught by Pydantic v2 schemas and rejected with HTTP 422."*
