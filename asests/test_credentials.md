# Test Credentials — AI Airport Companion (Demo / Presentation Use Only)

_Generated from the Phase 1 synthetic datasets on 2026-06-22. These are demo accounts only — do not use real personal data or these password patterns in production._


## 1. Passenger Accounts (20)

Login method: **PNR Booking Reference + Last Name** (per Phase 5 `/auth/login`).

| # | Full Name | PNR (login) | Last Name (login) | Flight | Destination | Terminal / Gate | Scheduled Departure | Status | Class |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Mei Brown | `9GACQD` | `Brown` | AI579 | New Delhi | T3 / T3-G03 | 2026-06-22 06:36 | delayed | Economy |
| 2 | Omar Chen | `JUGBAC` | `Chen` | LU792 | Seoul | T2 / T2-G09 | 2026-06-22 11:30 | on-time | Economy |
| 3 | Omar Silva | `TWJYAD` | `Silva` | DE903 | Sydney | T3 / T3-G08 | 2026-06-22 13:36 | on-time | Economy |
| 4 | Michael Nguyen | `X92GBW` | `Nguyen` | UN324 | Bengaluru | T2 / T2-G23 | 2026-06-22 17:56 | on-time | Economy |
| 5 | Ahmed Schmidt | `KTRFKE` | `Schmidt` | LU750 | Mumbai | T3 / T3-G21 | 2026-06-23 08:25 | on-time | Economy |
| 6 | Jennifer Sharma | `RCZZQK` | `Sharma` | BR547 | Doha | T3 / T3-G11 | 2026-06-23 12:34 | on-time | Economy |
| 7 | Valentina Hernandez | `5FLBCH` | `Hernandez` | QA972 | Paris | T3 / T3-G04 | 2026-06-23 14:40 | delayed | Economy |
| 8 | Carlos Davis | `UBCT9B` | `Davis` | EM537 | Seoul | T2 / T2-G14 | 2026-06-23 15:04 | on-time | Economy |
| 9 | Patricia Ibrahim | `D29PGQ` | `Ibrahim` | UN244 | Bengaluru | T1 / T1-G08 | 2026-06-23 16:14 | on-time | Economy |
| 10 | Fatima Smith | `APW8ET` | `Smith` | SI577 | Bengaluru | T1 / T1-G23 | 2026-06-23 17:21 | on-time | Economy |
| 11 | Ahmed Tran | `J9VQRQ` | `Tran` | DE148 | Bengaluru | T3 / T3-G13 | 2026-06-23 21:05 | on-time | Economy |
| 12 | Wei Patel | `7QUSSV` | `Patel` | LU562 | Abu Dhabi | T2 / T2-G10 | 2026-06-24 00:10 | on-time | Premium Economy |
| 13 | Daniel Ibrahim | `DRPXRQ` | `Ibrahim` | QA750 | Dubai | T2 / T2-G05 | 2026-06-24 01:35 | delayed | Premium Economy |
| 14 | Fatima Lefevre | `KJN6TV` | `Lefevre` | EM582 | New York | T1 / T1-G21 | 2026-06-24 05:07 | delayed | Economy |
| 15 | Priya Andersson | `ERPF8M` | `Andersson` | SI563 | Kolkata | T3 / T3-G02 | 2026-06-24 05:56 | on-time | Economy |
| 16 | Lucas Williams | `94TZFU` | `Williams` | AI154 | London | T1 / T1-G23 | 2026-06-24 06:29 | boarding | Premium Economy |
| 17 | David Williams | `3ZBDJH` | `Williams` | AI923 | Chennai | T2 / T2-G13 | 2026-06-24 07:23 | boarding | Economy |
| 18 | Diego Patel | `57WWTP` | `Patel` | BR677 | Hyderabad | T3 / T3-G02 | 2026-06-24 08:12 | boarding | Premium Economy |
| 19 | James Ali | `MMD9AE` | `Ali` | LU891 | Hyderabad | T1 / T1-G17 | 2026-06-24 17:07 | delayed | Premium Economy |
| 20 | Ethan Costa | `HG26XS` | `Costa` | LU921 | Frankfurt | T1 / T1-G06 | 2026-06-24 20:18 | on-time | Economy |

## 2. Staff Accounts (5)

Login method: **Username + Password** (per Phase 5 `/auth/staff-login`), role-gated dashboard access.

| # | Full Name | Username | Password | Role | Assigned Area | Terminal |
|---|---|---|---|---|---|---|
| 1 | Ananya Verma | `staff01.verma` | `Staff@2027!` | Check-in Supervisor | checkin_counter | T1 |
| 2 | Rahul Nair | `staff02.nair` | `Staff@2028!` | Security Lane Lead | security_checkpoint | T1 |
| 3 | Sarah Thompson | `staff03.thompson` | `Staff@2029!` | Immigration Desk Officer | immigration_desk | T2 |
| 4 | Mateo Alvarez | `staff04.alvarez` | `Staff@2030!` | Boarding Gate Agent | boarding_gate | T3 |
| 5 | Chloe Bennett | `staff05.bennett` | `Staff@2031!` | Parking & Curbside Manager | parking | All Terminals |

## 3. Admin Accounts (2)

| # | Full Name | Username | Password | Role | Access Level |
|---|---|---|---|---|---|
| 1 | Priyanka Desai | `admin.ops` | `AdminOps@2026!` | Operations Admin | Full dashboard + staffing reallocation + simulation what-if tools |
| 2 | Marcus Webb | `admin.system` | `AdminSys@2026!` | System Admin | Full dashboard + user management + ML model retraining controls |

## 4. Quick Demo Picks

- **"Boarding now" scenario** — PNR `94TZFU` / Last Name `Williams` (flight AI154, currently boarding at T1-G23).
- **"Delayed flight" scenario** — PNR `9GACQD` / Last Name `Brown` (flight AI579, status: delayed).
- **Staff view of rush hour** — log in as `staff02.nair` (Security Lane Lead) to see T1 security congestion.
- **Admin staffing decision** — log in as `admin.ops` to open the what-if staffing simulator.