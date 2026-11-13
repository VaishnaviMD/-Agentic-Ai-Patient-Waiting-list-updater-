# n8n Autonomous Workflow Engine Documentation
## CareFlow AI Hospital Scheduling Platform

This directory contains the production-ready n8n workflow definitions that orchestrate the autonomous agentic scheduling lifecycle.

---

## 1. Overview of the 4 Workflows

| Workflow | File | Trigger | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Workflow A** | [`workflows/appointment_cancellation_coordinator.json`](./workflows/appointment_cancellation_coordinator.json) | Webhook: `POST /webhook/appointment-cancelled` | Activates Gemini AI Agent to query slot details, find candidates, calculate deterministic ranking, and create Offer #1. |
| **Workflow B** | [`workflows/patient_offer_response.json`](./workflows/patient_offer_response.json) | Webhook: `POST /webhook/patient-offer-response` | Evaluates patient decision. If accepted: confirms booking. If declined: immediately queries next candidate and generates Offer #2. |
| **Workflow C** | [`workflows/offer_expiration_monitor.json`](./workflows/offer_expiration_monitor.json) | Cron: Every 1 Minute (`* * * * *`) | Sweeps for expired pending offers, transitions status to `expired`, and extends the slot to the next waitlisted candidate. |
| **Workflow D** | [`workflows/failure_escalation.json`](./workflows/failure_escalation.json) | Error Trigger: Workflow failure | Catches execution errors and logs escalation tickets directly to the Hospital Admin Dashboard. |

---

## 2. How to Import Workflows into n8n

Follow these simple steps to import all workflows into your running n8n instance:

1. Open your browser to **[http://localhost:5678](http://localhost:5678)**.
2. In the left navigation bar, click **Workflows** $\rightarrow$ **Add Workflow** (or **+**).
3. In the top-right corner of the canvas, click the **Three Dots (...)** menu $\rightarrow$ **Import from File**.
4. Select one of the JSON files from `n8n/workflows/`:
   - `appointment_cancellation_coordinator.json`
   - `patient_offer_response.json`
   - `offer_expiration_monitor.json`
   - `failure_escalation.json`
5. Click **Save** and toggle the workflow switch to **Active**.

Repeat for each of the 4 workflows.

---

## 3. Configuring the Google Gemini Credential in n8n

To enable the AI Agent node in Workflow A:
1. In n8n, navigate to **Credentials** (left menu) $\rightarrow$ **Add Credential**.
2. Search for **Google Gemini** (or **Google PaLM / Gemini Chat Model**).
3. Paste your API Key from [Google AI Studio](https://aistudio.google.com/).
4. Click **Save**.
5. In Workflow A, double-click the **Google Gemini Model** node and ensure the credential is selected.

---

## 4. End-to-End Execution Trace

```
1. Cancellation Occurs in Portal
             │
             ▼ (FastAPI Event Dispatch)
2. Workflow A: Webhook Trigger
             │
             ▼
3. Gemini AI Agent Evaluates Context
     ├── Calls Tool 1: get_appointment_details
     ├── Calls Tool 2: find_eligible_patients
     ├── Calls Tool 3: rank_waitlist_candidates (Deterministic Python Scoring)
     ├── Calls Tool 4: create_appointment_offer (PostgreSQL Row Lock & 15m Expiry)
     └── Calls Tool 5: notify_patient (Portal In-App Alert)
             │
             ▼
4. Patient Responds (or Offer Expires)
     ├── Accepted ──► Workflow B marks slot BOOKED (Atomic SELECT FOR UPDATE)
     ├── Declined ──► Workflow B calls next_candidate ──► Offers to Candidate #2
     └── Timed Out ─► Workflow C Sweeper marks EXPIRED ──► Offers to Candidate #2
```

