# MedShare – RapidBlood Network

> **Tagline:** *"Every Drop Matters. Every Medicine Counts."*

[![Production Ready](https://img.shields.io/badge/Platform-Production--Quality-blue.svg)](#)
[![Hackathon Innovation](https://img.shields.io/badge/Innovation-Healthcare--AI-red.svg)](#)
[![Next.js 14](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](#)
[![Express & Socket.IO](https://img.shields.io/badge/Backend-Express%20%7C%20Socket.IO-brightgreen.svg)](#)
[![PostGIS Geofence](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20PostGIS-blue.svg)](#)
[![FastAPI OCR](https://img.shields.io/badge/AI%20Microservice-FastAPI%20%7C%20Tesseract-orange.svg)](#)

---

## 1. Project Overview

**MedShare – RapidBlood Network** is a modern, AI-powered healthcare infrastructure platform designed to solve two critical global healthcare challenges:

1. **Emergency Blood Deficits During the Golden Hour:** When acute trauma or surgical hemorrhage occurs, finding compatible, available blood donors near hospitals within minutes is life-critical.
2. **Preventing Pharmaceutical Waste:** Eliminates billions of dollars of preventable pharmaceutical incineration by establishing a regulated, audited surplus medicine redistribution network restricted strictly to licensed healthcare institutions.

> **Medical & Regulatory Compliance Guarantee:**  
> MedShare is **NOT** an unregulated peer-to-peer drug marketplace. Only verified pharmacies and hospitals can list eligible medicines. All donor coordinates and phone numbers are privacy-masked, and final serological crossmatching must be conducted by licensed hospital phlebotomists.

---

## 2. Platform Architecture

```
                                  ┌───────────────────────────┐
                                  │   Next.js 14 Web Client   │
                                  │ (App Router + Leaflet UI) │
                                  └─────────────┬─────────────┘
                                                │
                        REST APIs (v1)          │        WebSockets (Socket.IO)
                        JWT Bearer Auth         │        Real-Time Broadcasts
                                                ▼
                                  ┌───────────────────────────┐
                                  │ Express.js Backend Server │
                                  │  (TypeScript, Zod, Rate)  │
                                  └──────┬─────────────┬──────┘
                                         │             │
                    Prisma ORM           │             │ HTTP / JSON
             PostGIS ST_DWithin Geofence │             │ Image Form-Data
                                         ▼             ▼
                ┌───────────────────────────┐   ┌───────────────────────────┐
                │   PostgreSQL + PostGIS    │   │ Python FastAPI AI Service │
                │  (Donors, Hospital GPS,   │   │  (Tesseract OCR Vision,   │
                │   Inventory, Audit Logs)  │   │  Donor Ranking, Chat Bot) │
                └───────────────────────────┘   └───────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | **Next.js 14 (App Router)** | High-performance React server and client components |
| | **TypeScript** | Strict compile-time type safety across all views |
| | **Tailwind CSS** | Premium healthcare design system & responsive layout |
| | **Leaflet & OpenStreetMap** | Interactive geofenced hospital & donor radius maps |
| | **Lucide Icons & Framer Motion**| Polished, accessible UI and subtle status transitions |
| | **TanStack React Query** | Data synchronization & cache management |
| **Backend** | **Node.js & Express.js** | RESTful API micro-architecture (Versioned `/api/v1`) |
| | **Socket.IO** | Sub-minute real-time emergency alert dispatch |
| | **Prisma ORM** | PostgreSQL relational modeling & schema migrations |
| | **JWT Authentication** | Secure role-based access control (RBAC) |
| | **Zod Validation** | Input validation on all endpoints |
| **Database** | **PostgreSQL & PostGIS** | Relational storage with `ST_DWithin` spatial indexing |
| **AI Microservice** | **Python FastAPI** | Computer vision OCR and multi-factor donor ranking |
| | **Tesseract OCR & PIL** | Medicine packaging batch, expiry & dosage extraction |
| **Containerization** | **Docker & Docker Compose** | One-command full-stack containerized deployment |

---

## 4. Key Innovations & Medical Rigor

### 4.1 RapidBlood PostGIS Geofencing & Multi-Factor Donor Ranking
When an emergency blood request is lodged:
1. **Compatibility Matrix Check:** Strictly checks recipient ABO & Rh blood types against medically approved compatibility rules (e.g., O- is universal donor, AB+ is universal recipient).
2. **Geospatial Range Filtering:** Queries candidate donors within selectable radii: **1 KM, 3 KM, 5 KM (default), 10 KM, 15 KM**.
3. **90-Day Cooldown Enforcement:** Whole blood donors are barred from emergency dispatch until at least 90 days have elapsed since their last donation.
4. **Smart Multi-Factor Scoring Formula:**
   $$\text{Score} = (0.35 \times \text{Distance}) + (0.25 \times \text{Availability}) + (0.20 \times \text{Verification}) + (0.10 \times \text{Response History}) + (0.10 \times \text{Eligibility})$$
5. **Location Privacy Masking:** Exact donor coordinates are perturbed by ~300 meters on public and requester maps. Personal phone numbers remain masked until confirmation.

### 4.2 MedShare Regulated Medicine Redistribution
1. **Zero Peer-to-Peer Black Market:** Individual users are barred from uploading or selling prescription drugs directly.
2. **AI OCR Label Scanning:** Uploaded packaging is scanned to extract batch codes, manufacturing dates, and expiry dates.
3. **Pharmacist Sign-Off:** Automated OCR outputs are treated as suggestions and must be verified by a licensed pharmacist.
4. **Strict Rejection Policy:** Expired medications, opened blister packs, damaged bottles, and unknown storage conditions are strictly rejected.
5. **Cold-Chain Protocol:** Specialized biologicals (e.g. Insulin) mandate verified 2°C to 8°C temperature logging.

---

## 5. Demo Accounts for Hackathon Judging

The database comes pre-seeded with realistic demo accounts across all 4 system roles:

| Role | Email | Password | Access / Capabilities |
|---|---|---|---|
| **Administrator** | `admin@medshare.org` | `MedShare123!` | Global metrics, donor & pharmacy verifications, fraud reports |
| **Blood Donor** | `donor@medshare.org` | `MedShare123!` | Availability toggle, nearby broadcasts, donation history |
| **Verified Pharmacy** | `pharmacy@medshare.org` | `MedShare123!` | AI OCR medicine upload, stock management, request reviews |
| **Patient / Requester** | `patient@medshare.org` | `MedShare123!` | Create emergency broadcasts, live timeline, medicine requests |

*(Each role can also be logged into with a single click using the demo buttons on the `/login` page).*

---

## 6. Quick Start & Setup Instructions

### Option A: Running with Docker Compose (Recommended)

To launch the complete infrastructure (Postgres + PostGIS, AI Service, Backend Server, and Web Frontend) in one command:

```bash
# Clone and enter workspace
git clone https://github.com/DevoraX/medshare.git
cd medshare

# Launch all microservices
docker-compose up --build
```

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **AI OCR Microservice:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Local Manual Setup

#### 1. Instant Zero-Setup Mode (Native Node 22+ & Python 3)
```bash
# Start standalone backend (Zero-dependencies with in-memory & file-persisted storage):
node --experimental-strip-types server/standalone-server.ts

# Start Python AI microservice (in another terminal):
python ai-service/main.py

# Start Next.js frontend (in another terminal):
cd web
npm run dev
```

#### 2. Full PostgreSQL & Prisma Production Setup
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

---

## 7. Automated Test Suites

MedShare includes comprehensive test suites across medical algorithms, backend REST integrations, and AI vision pipelines:

```bash
# 1. Medical Compatibility & Haversine Mathematical Tests (20 tests):
node --experimental-strip-types server/test/run-tests.ts

# 2. Backend Handlers, Geofencing & Database Pipeline Tests (25 tests):
node --experimental-strip-types server/test/test-backend-handlers.ts

# 3. AI Service Vision OCR, Expiry Warnings & Signoff Tests (21 tests):
python ai-service/test_ai_service.py
```

**Verified Test Categories:**
- **ABO/Rh Blood Transfusion Matrix:** Complete validation across all 8 blood groups and universal donor/recipient semantics.
- **Geospatial Distance Calculation:** Millimeter-accurate Haversine formulas.
- **Transfusion Cooldown:** Strict 90-day cooldown enforcement for whole blood donors.
- **Multi-Factor Donor Ranking Formula:** Distance (35%), Availability (25%), Verification (20%), Response Rate (10%), Eligibility (10%).
- **Surplus Medicine Safety Invariants:** Automatic rejection of expired, damaged, unsealed, or direct P2P medications.
- **AI OCR Vision & Pharmacist Sign-Off:** Batch/expiry extraction, cold-chain protocol flagging, and SHA-256 cryptographic sign-off receipts.

---

## 8. License & Ethical Disclaimer

Built with ❤️ by **DevoraX** for life-saving healthcare innovation.  
All clinical transfusions and medicine distributions must be supervised by authorized healthcare practitioners.
