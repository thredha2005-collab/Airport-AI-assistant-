# AI Airport Companion — Phased Build Plan & Prompts

## Why the order changed

Your original sequence was: **Data → Simulation → ML → Database → Backend → Frontend.**

The fix: **Database moves to Phase 2, right after raw data.** Reason — your simulation (Phase 3) needs somewhere to read resource counts from and write queue/wait results to, and your ML phase (Phase 4) needs somewhere to read historical + simulated data from and write predictions to. Designing the database *after* you've already generated simulation and ML output means rebuilding storage twice. Two tools you listed without a phase number now have a home too: **OpenAI LLM → Phase 5** (it's the chatbot's brain, lives in the backend), **Power BI → Phase 6** (it's a staff-facing dashboard, lives with the frontend).

**Correct order:**
1. Data Foundation (CSV datasets)
2. Database Architecture (PostgreSQL)
3. Simulation Engine (SimPy)
4. Machine Learning Models (Scikit-learn)
5. Backend API + LLM Chatbot (FastAPI + OpenAI)
6. Frontend Website + Staff Dashboard (React + Power BI)

Each phase below has a goal, what it outputs into the next phase, and a self-contained prompt you can hand to a coding assistant to build it.

---

## Phase 1 — Data Foundation (CSV Datasets)

**Goal:** Create the raw datasets every later phase depends on, plus the demo credentials and demo-mode manifest derived from them.
**Feeds into:** Phase 2 (gets loaded into PostgreSQL), Phase 4 (facility_occupancy.csv trains the utilization model), Phase 6 (test_credentials.md + demo manifest power Demo Mode).

> **Build prompt:**
> Generate seven realistic, interlinked CSV datasets for an AI Airport Companion platform for a mid-to-large international airport. Create:
> 1. `passengers.csv` — passenger_id, first_name, last_name, full_name, pnr_booking_ref, flight_id, seat_number, ticket_class, checkin_status, special_assistance_flag, nationality, contact_email
> 2. `flights.csv` — flight_id, airline, flight_number, origin, destination, destination_city, scheduled_departure, scheduled_arrival, actual_departure, actual_arrival, gate_number, terminal, status (on-time/delayed/cancelled/boarding), aircraft_type, delay_minutes, delay_reason
> 3. `facilities.csv` — facility_id, facility_name, category (restroom, medical, gift_shop, cafe, lounge, ATM, prayer_room, baggage_claim, immigration_desk, security_checkpoint, checkin_counter, boarding_gate), terminal, floor, x_coordinate, y_coordinate, operating_hours, **capacity**
> 4. `parking.csv` — parking_id, zone_name, total_slots, occupied_slots, occupancy_ratio, hourly_rate, distance_to_terminal_m, timestamp, vehicle_type
> 5. `weather.csv` — weather_id, timestamp, temperature_c, precipitation_mm, wind_speed_kmph, visibility_km, condition (clear/rain/fog/storm), forecast_horizon_hrs
> 6. `directions.csv` — direction_id, from_location_id, from_location_name, to_location_id, to_location_name, path_description, distance_m, estimated_walk_time_min, terminal, floor_change_flag
> 7. **`facility_occupancy.csv`** (new — supports Phase 4 facility utilization prediction) — occupancy_id, facility_id, facility_name, category, terminal, timestamp, occupancy_count, capacity, occupancy_ratio, crowd_level (low/medium/high). Hourly time series for lounges, cafes, security checkpoints, restrooms, gift shops, immigration desks, check-in counters, and boarding gates.
>
> Generate realistic distributions (peak-hour passenger clustering, weather seasonality, rising/falling parking and facility occupancy curves) with a fixed random seed for reproducibility. Include a data-dictionary markdown file documenting every column. Save everything in a `/data` folder.
>
> **Then derive two more files from this data:**
> - `test_credentials.md` — pick 20 demo passenger accounts (login = PNR + last name, spread across on-time/delayed/boarding statuses and terminals), 5 staff accounts (one each for check-in, security, immigration, boarding gate, and parking — username + password + assigned area), and 2 admin accounts (username + password + access level, e.g. Operations Admin and System Admin). Include a "quick demo picks" section pointing at specific accounts for common demo scenarios.
> - `demo_mode_manifest.json` — a one-click "Demo Mode" scenario loader contract listing 2–3 named scenarios (e.g. "Evening Rush Hour", "Weather-Driven Delay", "Calm Early Morning") each with a preset time window, highlighted checkpoints/flights, expected alerts, and a pointer to one quick-login passenger/staff/admin account per scenario — this is what Phase 6's one-click demo loader button will fetch.

---

## Phase 2 — Database Architecture (PostgreSQL)

**Goal:** Build the schema that stores raw data, simulation results, ML predictions, user accounts, and chatbot history — *before* those other phases generate anything.
**Feeds into:** Phase 3 (reads facility/flight config, writes simulation results), Phase 4 (reads/writes predictions), Phase 5 (everything queries this), Phase 6 (Power BI connects directly to it).

> **Build prompt:**
> Design and implement a PostgreSQL schema for the AI Airport Companion platform covering five data groups:
> (a) the seven raw tables from Phase 1 (passengers, flights, facilities, parking, weather, directions, **facility_occupancy**);
> (b) `simulation_results` (checkpoint, queue_length, wait_time, congestion_level, scenario_name, timestamp);
> (c) `predictions` (predicted_wait_time, predicted_congestion, predicted_delay, **predicted_facility_utilization**, confidence_score, model_version, timestamp);
> (d) `users` for passenger login (linked by PNR + last name), and staff/admin login with role-based access (passenger / staff / admin), passwords hashed with bcrypt — seed this table directly from `test_credentials.md` (20 passenger, 5 staff, 2 admin demo rows);
> (e) `chat_logs` (session_id, user_id, message, response, detected_intent, timestamp) for chatbot context retrieval.
> Requirements: SQLAlchemy ORM models + Alembic migrations, 3NF normalization with foreign keys (flights→gates→facilities, passengers→flights, parking_zone→occupancy logs, facility→facility_occupancy), indexes on flight_id/timestamp/terminal/facility_id, a seed script that loads the Phase 1 CSVs **and the demo credentials** into these tables, and a `model_metrics` table for tracking ML retraining performance over time. Output the full schema as a `.sql` file plus an ERD description.

---

## Phase 3 — Simulation Engine (SimPy)

**Goal:** Model the passenger journey end-to-end and produce the queue/wait/congestion numbers that ML will later learn from.
**Feeds into:** Phase 4 (trains on this output), Phase 5 (exposed as an on-demand "what-if" tool for staff).

> **Build prompt:**
> Build a passenger-flow simulation using SimPy, reading resource capacities (check-in counters, security lanes, immigration desks, boarding gates) and flight schedules from the PostgreSQL database built in Phase 2. Model the journey as a sequential SimPy process: **Arrival → Check-in → Security Screening → Immigration Check → Boarding Gate → Boarding.**
> Requirements:
> - Each stage is a SimPy Resource with configurable capacity and a configurable service-time distribution (exponential/normal).
> - Passenger arrivals follow a non-homogeneous Poisson process driven by `scheduled_departure` times in the flights table (more arrivals 2–3 hours before peak departures).
> - Track per-passenger timestamps at every stage to compute: queue length over time, wait time per stage, total journey time, and a congestion_level (low/medium/high) from queue-length thresholds.
> - Run multiple scenarios: normal day, peak/holiday, bad-weather delay-heavy day, and varied staffing configs (e.g. "2 extra security lanes") for later comparison.
> - Compute average wait time per stage, per terminal, per hour-of-day.
> - Write all results into the `simulation_results` table from Phase 2.
> - Wrap everything in a reusable function `run_airport_simulation(config)` that Phase 5's FastAPI backend can call on demand for "what-if" staffing scenarios.

---

## Phase 4 — Machine Learning Models (Scikit-learn)

**Goal:** Learn from simulated + historical data so the system can *predict* instead of just *simulate*.
**Feeds into:** Phase 5 (models are called live by API endpoints).

> **Build prompt:**
> Using the historical simulation outputs and raw datasets stored in PostgreSQL (Phases 1–3), build four Scikit-learn models:
> 1. **Wait-Time Regressor** — predicts wait time (minutes) at check-in/security/immigration/boarding from: hour_of_day, day_of_week, terminal, active_counters, flight_volume, weather_condition, holiday_flag. Compare RandomForestRegressor vs GradientBoostingRegressor on cross-validated RMSE/MAE.
> 2. **Congestion Classifier** — predicts congestion_level (low/medium/high) per checkpoint from the same features plus current queue_length. Evaluate with accuracy/F1/confusion matrix.
> 3. **Delay Predictor** — predicts flight delay (minutes or delayed/on-time) from weather (precipitation, wind, visibility), airline, time_of_day, and historical route delay rate.
> 4. **Facility Utilization Predictor** — predicts occupancy_ratio and crowd_level (low/medium/high) for **lounges, cafes, security checkpoints, restrooms, gift shops, immigration desks, check-in counters, and boarding gates** using `facility_occupancy.csv` as the training source. Features: hour_of_day, day_of_week, facility category, terminal, nearby flight volume (joined from flights table), weather_condition. Build this as both a regressor (occupancy_ratio) and a classifier (crowd_level), since the chatbot needs the categorical label but the dashboard needs the precise number.
> Requirements: scikit-learn Pipelines with ColumnTransformer preprocessing (StandardScaler/OneHotEncoder), **time-based** train/test split (not random, since this is operational time-series data), models persisted with joblib and versioned with a metadata.json (training date + metrics). Build a single `predict_service.py` exposing `predict_wait_time()`, `predict_congestion()`, `predict_delay()`, and `predict_facility_utilization(facility_id_or_category, timestamp)` for Phase 5 to call directly. Include a nightly retraining script that logs performance to the `model_metrics` table.

---

## Phase 5 — Backend API + LLM Chatbot (FastAPI + OpenAI)

**Goal:** The hub — connects database, simulation, ML, and the LLM chatbot, and exposes everything to the frontend.
**Feeds into:** Phase 6 (every page and the chatbot widget call this).

> **Build prompt:**
> Build the FastAPI backend integrating PostgreSQL (Phase 2), the SimPy service (Phase 3), the Scikit-learn prediction service (Phase 4), and an OpenAI-powered chatbot branded **"SkyGuide AI"**. Endpoint groups:
> 1. **Auth** — `/auth/login` (passenger via PNR + last name → JWT), `/auth/staff-login` (role-based), `/auth/me`.
> 2. **Flights & Itinerary** — `/passenger/{pnr}/itinerary` returns flight time, gate, and a recommended arrival time = scheduled_departure − predicted_total_wait_time − buffer, plus live predicted wait time at each checkpoint.
> 3. **Facilities & Directions** — `/facilities?category=`, `/directions?from=&to=` (path + walk time) — powers "where is gate 5 / the medical shop / a cafe".
> 4. **Parking** — `/parking/status` (live occupancy), `/parking/predict` (predicted rush-hour windows for next 24h using the Phase 4 model + historical parking patterns).
> 5. **Weather** — `/weather/current`, `/weather/forecast` — powers "when should I leave for the airport".
> 6. **Predictions & Simulation** — `/predict/wait-time`, `/predict/congestion`, `/predict/delay`, and `POST /simulate/what-if` so staff can test a hypothetical staffing config and see the simulated result before acting.
> 7. **Facility Utilization** (new) — `/facilities/{facility_id}/occupancy` (current occupancy_count, capacity, crowd_level), `/facilities/nearest?lat=&lng=&category=` (nearest facility of a given type using directions.csv distances), `/facilities/crowd-levels?category=` (crowd level snapshot across all facilities of a type, for the "which lounge/cafe is least busy" question), `/predict/facility-utilization?facility_id=&timestamp=` (predicted occupancy_ratio + crowd_level + estimated wait at that facility).
> 8. **Staff/Admin** — `/admin/live-congestion` (real-time per-checkpoint and per-facility data with alert flags when thresholds are crossed, so authority can open more counters) + a WebSocket `/ws/admin/live` for push updates.
> 9. **Demo Mode** — `GET /demo/manifest` (serves `demo_mode_manifest.json` from Phase 1), `POST /demo/load-scenario/{scenario_id}` (resets session state to the chosen scenario's preset time window and highlighted data, for one-click presentation use).
> 10. **SkyGuide AI Chatbot** — `POST /chatbot/message` sends the message + session_id to the OpenAI API with function-calling enabled for: `get_facility_location(name)`, `get_directions(from,to)`, `get_facility_occupancy(facility_id_or_name)`, `get_nearest_facility(category, current_location)`, `get_crowd_level(category_or_facility)`, `get_parking_prediction()`, `get_weather_forecast()`, `get_flight_status(pnr_or_flight_id)`, and `navigate_to(page)` (returns a frontend route like `/login`, `/facilities`, `/parking` so the widget can auto-redirect). Pull relevant DB rows before calling the LLM (RAG-style) for accurate facility/flight answers, and have the system prompt establish the assistant's identity as "SkyGuide AI, the airport's AI companion" with a warm, concise, helpful tone. Log every exchange to `chat_logs`.
> General: Pydantic schemas throughout, async SQLAlchemy sessions, CORS for the React frontend, `.env`-based config for the OpenAI key and DB credentials, and auto-generated Swagger docs at `/docs`.

---

## Phase 6 — Frontend Website + Staff Dashboard (React + Power BI)

**Goal:** The interface both passengers and airport staff actually use.
**Feeds into:** End users; nothing further downstream.

> **Build prompt:**
> Build the React frontend consuming the Phase 5 API, for both passengers and airport employees.
> 1. **Navbar** — Home, Flights, Facilities, Parking, Weather, Directions, Dashboard (staff-only, role-gated), Login/Logout.
> 2. **Home page** — live airport status summary (on-time %, current average wait time), quick links.
> 3. **Login Portal (passenger)** — PNR + last name; after login show flight time, gate, recommended arrival time, live predicted wait times per checkpoint, and a "leave by ___" suggestion factoring in weather.
> 4. **Facilities page** — searchable/filterable directory (restrooms, medical, shops, cafes, lounges) with a simple floor-plan view, walking directions, and a live crowd-level badge (low/medium/high) per facility from the Phase 4 utilization model.
> 5. **Parking page** — live occupancy per zone + a predicted rush-hour chart (low/medium/high windows for the next 24h).
> 6. **Weather page** — current conditions + forecast with a plain-language recommendation (e.g. "Heavy rain expected at 6 PM — consider arriving 45 min earlier").
> 7. **Staff/Admin Dashboard (role-gated)** — embed Power BI Embedded reports connected live to PostgreSQL: real-time queue length, congestion heatmap by checkpoint/terminal, facility crowd-level heatmap, historical wait-time trends, delay analytics, an alert banner, and a "simulate what-if staffing" button calling `POST /simulate/what-if`.
> 8. **SkyGuide AI — branded chatbot widget (bottom-right, every page)** — a floating circular avatar button with an aviation-themed animated icon (e.g. a subtle radar-sweep or paper-plane motion on idle/hover, built in CSS/SVG — no external image assets needed) and the label "SkyGuide AI". On open, shows a branded header ("SkyGuide AI — your airport companion"), a typing indicator (animated three-dot bounce) while waiting on `/chatbot/message`, and persists session_id across the visit. Must correctly answer and route:
>    - Location questions — "where is gate 5", "where is the medical shop" → calls `get_facility_location` / `get_directions`, can render a small inline map snippet.
>    - **Facility occupancy & crowd level** — "is the T2 lounge busy right now", "which security checkpoint is fastest" → calls `get_facility_occupancy` / `get_crowd_level`, replies with occupancy_ratio + crowd_level in plain language.
>    - **Nearest facility** — "nearest cafe to gate 12" → calls `get_nearest_facility`.
>    - **Waiting-time predictions** — "how long is the wait at immigration right now" → calls the Phase 4/5 prediction endpoints and replies with a number + confidence framing ("around 18 minutes, moderate confidence").
>    - Navigation commands — "open the login portal" / "open parking page" → calls `navigate_to` and auto-navigates via React Router.
>    - Parking & weather — rush-hour predictions and "should I leave now" recommendations.
> 9. **Demo Mode** — a small "Demo Mode" toggle/button (visible to staff/admin, or behind a `?demo=true` query flag) that fetches `GET /demo/manifest` and shows the 2–3 named scenarios (Evening Rush Hour, Weather-Driven Delay, Calm Early Morning) as one-click cards; clicking a card calls `POST /demo/load-scenario/{id}`, jumps the app to that scenario's preset time window, highlights the relevant checkpoints/flights, and offers a "quick login" button using that scenario's demo account — built for project presentations so a reviewer can see rush-hour congestion, a delay prediction, and a calm baseline without manually navigating.
> Design: clean "aviation" palette (navy/teal + white + amber for alerts), WCAG AA accessible, fully responsive. React Router for navigation, Context/Redux for auth state, Axios/React Query for data fetching, Recharts/Chart.js for passenger-facing charts, Tailwind CSS (or shadcn/ui) for styling.

---

## Using this plan

Each block above is self-contained — paste just that prompt into a build session when you're ready to start that phase, since each one assumes the previous phase's output already exists.

**Phase 1 is done** — the `/data` folder, `test_credentials.md`, and `demo_mode_manifest.json` referenced throughout this plan have already been generated and are included alongside this document.
