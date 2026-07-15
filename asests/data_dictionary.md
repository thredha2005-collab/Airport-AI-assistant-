# Data Dictionary — AI Airport Companion Phase 1 Datasets

All files are CSV, comma-delimited, UTF-8. Timestamps are `YYYY-MM-DD HH:MM:SS`. Generated with a fixed random seed for reproducibility; values are synthetic, not real airport/passenger data.

## flights.csv (260 rows)
| Column | Type | Description |
|---|---|---|
| flight_id | string | Unique flight identifier (FLxxxx) |
| airline | string | Operating airline |
| flight_number | string | Airline flight number |
| origin | string | Origin IATA code (always PUY — this airport) |
| destination / destination_city | string | Destination IATA code and city name |
| scheduled_departure / scheduled_arrival | datetime | Planned times |
| actual_departure / actual_arrival | datetime | Actual times (blank if cancelled) |
| gate_number | string | Assigned gate, e.g. T1-G05 |
| terminal | string | T1 / T2 / T3 |
| status | string | on-time / delayed / cancelled / boarding |
| aircraft_type | string | Aircraft model |
| delay_minutes | float | Minutes of delay (0 if on-time) |
| delay_reason | string | Weather / ATC / Technical / Crew / Security / Late Inbound |

## passengers.csv (1,561 rows)
| Column | Type | Description |
|---|---|---|
| passenger_id | string | Unique passenger ID |
| first_name / last_name / full_name | string | Passenger name (last_name doubles as a login field) |
| pnr_booking_ref | string | 6-character booking reference (login field) |
| flight_id | string | FK → flights.flight_id |
| seat_number | string | e.g. 27A |
| ticket_class | string | Economy / Premium Economy / Business / First |
| checkin_status | string | checked-in / not-checked-in / boarding-pass-issued |
| special_assistance_flag | bool | Wheelchair/medical/other assistance needed |
| nationality | string | Passenger nationality |
| contact_email | string | Synthetic email |

## facilities.csv (118 rows)
| Column | Type | Description |
|---|---|---|
| facility_id | string | Unique facility ID |
| facility_name | string | Display name |
| category | string | checkin_counter, security_checkpoint, immigration_desk, boarding_gate, restroom, medical, gift_shop, cafe, lounge, atm, prayer_room, baggage_claim |
| terminal | string | T1 / T2 / T3 |
| floor | int | Floor number |
| x_coordinate / y_coordinate | float | Position on terminal floor-plan (meters) — used by directions.csv distance calc |
| operating_hours | string | "24/7" or window string |
| capacity | int | Max people/slots this facility can hold — used for occupancy_ratio in facility_occupancy.csv |

## parking.csv (388 rows)
| Column | Type | Description |
|---|---|---|
| parking_id | string | Unique row ID |
| zone_name | string | One of 4 zones (3 terminal-adjacent + 1 long-term) |
| total_slots / occupied_slots / occupancy_ratio | int/int/float | Capacity and live occupancy snapshot |
| hourly_rate | float | Parking rate (currency units/hour) |
| distance_to_terminal_m | int | Walking distance to nearest terminal entrance |
| timestamp | datetime | Hourly snapshot, spans 1 day before "now" through 3 days ahead |
| vehicle_type | string | Dominant vehicle type for that snapshot |

## weather.csv (73 rows)
| Column | Type | Description |
|---|---|---|
| weather_id | string | Unique row ID |
| timestamp | datetime | Hourly; past 48h = observed, next 24h = forecast |
| temperature_c | float | Temperature |
| precipitation_mm | float | Rainfall |
| wind_speed_kmph | float | Wind speed |
| visibility_km | float | Visibility |
| condition | string | clear / rain / fog / storm |
| forecast_horizon_hrs | int | 0 = observed; >0 = hours-ahead forecast |

## directions.csv (96 rows)
| Column | Type | Description |
|---|---|---|
| direction_id | string | Unique row ID |
| from_location_id / from_location_name | string | Starting facility (checkpoints, gates, counters) |
| to_location_id / to_location_name | string | Destination facility (restroom, cafe, shop, lounge, etc.) |
| path_description | string | Plain-language walking instructions |
| distance_m | float | Straight-line distance (meters) |
| estimated_walk_time_min | float | Estimated walk time at ~80 m/min |
| terminal | string | Terminal, or "T1->T2" style for inter-terminal shuttle routes |
| floor_change_flag | bool | Whether the path crosses floors |

## facility_occupancy.csv (6,984 rows) — supports Phase 4 facility utilization prediction
| Column | Type | Description |
|---|---|---|
| occupancy_id | string | Unique row ID |
| facility_id / facility_name / category / terminal | — | FK → facilities.csv |
| timestamp | datetime | Hourly, spans 1 day before "now" through 2 days ahead |
| occupancy_count | int | Estimated number of people present |
| capacity | int | FK → facilities.capacity |
| occupancy_ratio | float | occupancy_count / capacity |
| crowd_level | string | low (<0.4) / medium (0.4–0.75) / high (>0.75) |

Covers lounges, cafes, security checkpoints, restrooms, gift shops, immigration desks, check-in counters, and boarding gates — the facility categories needed for the Phase 4 utilization model.
