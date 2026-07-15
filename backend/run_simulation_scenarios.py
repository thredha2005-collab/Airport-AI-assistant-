import os
import sys
from datetime import datetime, timedelta

# Ensure the backend directory is in the Python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.simulation import run_airport_simulation
from sqlalchemy import create_engine, text

def clear_existing_simulation_results():
    db_url = os.getenv("DATABASE_SYNC_URL", "postgresql://postgres:qExTXiV6sGMAtc0b@127.0.0.1:5432/postgres")
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Clearing old simulation results...")
        conn.execute(text("TRUNCATE TABLE simulation_results CASCADE;"))
        conn.commit()
    print("Old simulation results cleared.")

def main():
    # 1. Clear old results
    clear_existing_simulation_results()
    
    # 2. Define dates to run
    dates = ["2026-06-22", "2026-06-23", "2026-06-24"]
    
    # 3. Define scenarios
    scenarios = [
        {
            "scenario_name": "normal_day",
            "passenger_multiplier": 10.0,
            "service_time_multipliers": {
                "checkin_counter": 1.0,
                "security_checkpoint": 1.0,
                "immigration_desk": 1.0,
                "boarding_gate": 1.0
            },
            "seed": 42
        },
        {
            "scenario_name": "peak_holiday",
            "passenger_multiplier": 18.0,
            "service_time_multipliers": {
                "checkin_counter": 1.1,
                "security_checkpoint": 1.1,
                "immigration_desk": 1.1,
                "boarding_gate": 1.0
            },
            "seed": 43
        },
        {
            "scenario_name": "bad_weather",
            "passenger_multiplier": 10.0,
            "service_time_multipliers": {
                "checkin_counter": 1.25,
                "security_checkpoint": 1.25,
                "immigration_desk": 1.25,
                "boarding_gate": 1.1
            },
            "seed": 44
        }
    ]
    
    # 4. Run all scenarios for all dates
    db_url = os.getenv("DATABASE_SYNC_URL", "postgresql://postgres:qExTXiV6sGMAtc0b@127.0.0.1:5432/postgres")
    
    for date_str in dates:
        for scenario in scenarios:
            config = {
                "scenario_name": scenario["scenario_name"],
                "start_date": date_str,
                "database_url": db_url,
                "passenger_multiplier": scenario["passenger_multiplier"],
                "service_time_multipliers": scenario["service_time_multipliers"],
                "seed": scenario["seed"]
            }
            
            print(f"\n==================================================")
            print(f"Starting Scenario '{scenario['scenario_name']}' for {date_str}...")
            print(f"==================================================")
            
            try:
                run_airport_simulation(config)
                print(f"Finished Scenario '{scenario['scenario_name']}' for {date_str} successfully.")
            except Exception as e:
                print(f"Failed to run Scenario '{scenario['scenario_name']}' for {date_str}: {e}")
                
    print("\nAll simulation scenarios completed and saved to PostgreSQL!")

if __name__ == "__main__":
    main()
