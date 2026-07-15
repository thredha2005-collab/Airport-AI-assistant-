import os
import random
import sys
from datetime import datetime, timedelta
import simpy

# Append backend directory to path if needed for database imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import Flight, Passenger, Facility, SimulationResult

# Default service time distributions
DEFAULT_SERVICE_TIMES = {
    "checkin_counter": {"mean": 3.0, "std": 1.0, "dist": "normal"},
    "security_checkpoint": {"mean": 2.0, "std": 0.5, "dist": "normal"},
    "immigration_desk": {"mean": 1.5, "std": 0.5, "dist": "normal"},
    "boarding_gate": {"mean": 0.5, "std": 0.1, "dist": "normal"},
}

def sample_service_time(stage, config):
    """
    Samples a service time for a given stage based on config parameters.
    """
    stage_params = DEFAULT_SERVICE_TIMES.get(stage, {"mean": 2.0, "std": 0.5, "dist": "normal"})
    mean = config.get(f"{stage}_mean", stage_params["mean"])
    std = config.get(f"{stage}_std", stage_params["std"])
    dist = config.get(f"{stage}_dist", stage_params["dist"])
    
    # Apply service time multipliers (useful for bad weather or peak scenarios)
    multipliers = config.get("service_time_multipliers", {})
    mult = multipliers.get(stage, 1.0)
    
    if dist == "exponential":
        val = random.expovariate(1.0 / (mean * mult))
    else:  # normal
        val = random.normalvariate(mean * mult, std * mult)
        
    return max(0.1, val)  # Service time must be positive

def passenger_process(env, passenger_id, flight_info, passenger_data, resources, flight_gates, config, stats):
    """
    Simpy process representing a passenger's journey through the airport:
    Arrival -> Check-in -> Security -> Immigration -> Boarding.
    """
    terminal = flight_info["terminal"]
    flight_id = flight_info["flight_id"]
    
    # 1. Arrival at Airport
    arrival_offset = passenger_data["arrival_offset"]
    yield env.timeout(arrival_offset)
    
    # 2. Check-in Counter Stage (Skip if already checked in)
    if passenger_data["checkin_status"] not in ["checked-in", "boarding-pass-issued"]:
        checkin_start = env.now
        checkin_res = resources[terminal]["checkin_counter"]
        with checkin_res.request() as req:
            yield req
            wait_time = env.now - checkin_start
            stats[terminal]["checkin_counter"].append(wait_time)
            
            service_time = sample_service_time("checkin_counter", config)
            yield env.timeout(service_time)
            
    # 3. Security Screening Stage
    security_start = env.now
    security_res = resources[terminal]["security_checkpoint"]
    with security_res.request() as req:
        yield req
        wait_time = env.now - security_start
        stats[terminal]["security_checkpoint"].append(wait_time)
        
        service_time = sample_service_time("security_checkpoint", config)
        yield env.timeout(service_time)
        
    # 4. Immigration Desk Stage
    immigration_start = env.now
    immigration_res = resources[terminal]["immigration_desk"]
    with immigration_res.request() as req:
        yield req
        wait_time = env.now - immigration_start
        stats[terminal]["immigration_desk"].append(wait_time)
        
        service_time = sample_service_time("immigration_desk", config)
        yield env.timeout(service_time)
        
    # 5. Walk to Boarding Gate
    # Simulating standard walking time distributed between 2 and 8 minutes
    walk_time = random.uniform(2.0, 8.0)
    yield env.timeout(walk_time)
    
    # 6. Wait for Boarding to Start
    # Boarding typically starts 40 minutes before departure
    dep_offset = flight_info["dep_offset"]
    boarding_start_time = dep_offset - 40.0
    
    if env.now < boarding_start_time:
        yield env.timeout(boarding_start_time - env.now)
        
    # 7. Boarding Stage
    boarding_start = env.now
    gate_res = flight_gates[flight_id]
    with gate_res.request() as req:
        yield req
        wait_time = env.now - boarding_start
        stats[terminal]["boarding_gate"].append(wait_time)
        
        service_time = sample_service_time("boarding_gate", config)
        yield env.timeout(service_time)

def queue_monitor(env, resources, flight_gates, terminal_flights, start_dt, scenario_name, config, stats, db_results):
    """
    Simpy process that monitors queue lengths and wait times at regular intervals.
    """
    sample_interval = config.get("sample_interval", 10.0)  # minutes
    
    while True:
        yield env.timeout(sample_interval)
        
        current_time_offset = env.now
        current_timestamp = start_dt + timedelta(minutes=current_time_offset)
        
        for terminal in ["T1", "T2", "T3"]:
            # Check-in, Security, Immigration
            for stage in ["checkin_counter", "security_checkpoint", "immigration_desk"]:
                res = resources[terminal][stage]
                q_len = len(res.queue)
                active_servers = res.capacity
                
                # Fetch completed wait times in this window
                completed_waits = stats[terminal][stage]
                if completed_waits:
                    avg_wait = sum(completed_waits) / len(completed_waits)
                    # Clear for next interval
                    stats[terminal][stage] = []
                else:
                    # Fallback estimate
                    mean_service = config.get(f"{stage}_mean", DEFAULT_SERVICE_TIMES[stage]["mean"])
                    mult = config.get("service_time_multipliers", {}).get(stage, 1.0)
                    avg_wait = (q_len * mean_service * mult) / max(1, active_servers)
                
                # Determine congestion level (normalized by number of active servers)
                ratio = q_len / max(1, active_servers)
                if ratio < 2.0:
                    congestion = "low"
                elif ratio < 5.0:
                    congestion = "medium"
                else:
                    congestion = "high"
                    
                stage_map = {
                    "checkin_counter": "Check-in",
                    "security_checkpoint": "Security Screening",
                    "immigration_desk": "Immigration Check"
                }
                checkpoint_name = f"{terminal} {stage_map[stage]}"
                
                db_results.append({
                    "checkpoint": checkpoint_name,
                    "queue_length": q_len,
                    "wait_time": round(avg_wait, 2),
                    "congestion_level": congestion,
                    "scenario_name": scenario_name,
                    "timestamp": current_timestamp
                })
                
            # Boarding gate queue monitor (aggregated per terminal)
            active_gates = []
            for f_id, f_info in terminal_flights[terminal].items():
                dep_offset = f_info["dep_offset"]
                # Boarding active window
                if dep_offset - 40.0 <= env.now <= dep_offset:
                    active_gates.append(f_id)
                    
            if active_gates:
                total_q = 0
                for f_id in active_gates:
                    total_q += len(flight_gates[f_id].queue)
                avg_q = total_q / len(active_gates)
                
                completed_waits = stats[terminal]["boarding_gate"]
                if completed_waits:
                    avg_wait = sum(completed_waits) / len(completed_waits)
                    stats[terminal]["boarding_gate"] = []
                else:
                    mean_service = config.get("boarding_gate_mean", DEFAULT_SERVICE_TIMES["boarding_gate"]["mean"])
                    mult = config.get("service_time_multipliers", {}).get("boarding_gate", 1.0)
                    avg_wait = (avg_q * mean_service * mult) / 2.0
                    
                ratio = avg_q / 2.0  # Gates have capacity 2
                if ratio < 2.0:
                    congestion = "low"
                elif ratio < 5.0:
                    congestion = "medium"
                else:
                    congestion = "high"
                    
                db_results.append({
                    "checkpoint": f"{terminal} Boarding Gate",
                    "queue_length": int(round(avg_q)),
                    "wait_time": round(avg_wait, 2),
                    "congestion_level": congestion,
                    "scenario_name": scenario_name,
                    "timestamp": current_timestamp
                })

def run_airport_simulation(config):
    """
    Main entry point for running the airport simulation.
    Reads data from database, configures Simpy, runs the simulation, and writes results.
    
    Config keys:
    - scenario_name: str (e.g. "normal_day", "peak_holiday", "bad_weather")
    - start_date: str in format "YYYY-MM-DD"
    - database_url: str (sync postgres connection url)
    - passenger_multiplier: float (multiplier for scaling passenger count, default 1.0)
    - staffing_config: dict (custom capacities, e.g. {"T1": {"security_checkpoint": 4}})
    - service_time_multipliers: dict (e.g. {"security_checkpoint": 1.2})
    - seed: int (optional random seed)
    """
    # 1. Setup Session
    db_url = config.get("database_url")
    if not db_url:
        db_url = os.getenv("DATABASE_SYNC_URL", "postgresql://postgres:qExTXiV6sGMAtc0b@127.0.0.1:5432/postgres")
        
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    # Set seed if provided
    seed = config.get("seed")
    if seed is not None:
        random.seed(seed)
        
    try:
        # 2. Define Simulation Window
        start_date_str = config.get("start_date", "2026-06-23")
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        
        # Flight window
        flights_start_dt = start_date
        flights_end_dt = start_date + timedelta(days=1) - timedelta(seconds=1)
        
        # Simulation window (starts 4 hours early to warm up, ends 4 hours late to empty queues)
        sim_start_dt = flights_start_dt - timedelta(hours=4)
        sim_end_dt = flights_end_dt + timedelta(hours=4)
        
        total_duration = (sim_end_dt - sim_start_dt).total_seconds() / 60.0
        
        print(f"Running simulation '{config.get('scenario_name')}' for date {start_date_str}")
        print(f"Simulation range: {sim_start_dt} to {sim_end_dt} ({total_duration:.1f} minutes)")
        
        # 3. Load Flight Data
        flights = session.query(Flight).filter(
            Flight.scheduled_departure >= flights_start_dt,
            Flight.scheduled_departure <= flights_end_dt
        ).all()
        
        if not flights:
            print(f"No flights found for date {start_date_str}")
            return []
            
        print(f"Loaded {len(flights)} flights.")
        
        # 4. Load Facility Capacities
        # First get default counts by querying active facilities
        terminals = ["T1", "T2", "T3"]
        default_capacities = {
            t: {
                "checkin_counter": session.query(Facility).filter(Facility.terminal == t, Facility.category == "checkin_counter", Facility.facility_id != f"{t}-ENTRY").count(),
                "security_checkpoint": session.query(Facility).filter(Facility.terminal == t, Facility.category == "security_checkpoint").count(),
                "immigration_desk": session.query(Facility).filter(Facility.terminal == t, Facility.category == "immigration_desk").count()
            } for t in terminals
        }
        
        # Override with staffing_config if provided
        custom_staffing = config.get("staffing_config", {})
        capacities = {}
        for t in terminals:
            capacities[t] = {}
            for cat in ["checkin_counter", "security_checkpoint", "immigration_desk"]:
                val = custom_staffing.get(t, {}).get(cat)
                if val is not None:
                    capacities[t][cat] = val
                else:
                    capacities[t][cat] = default_capacities[t][cat]
                    
        print("Configured Capacities:")
        for t in terminals:
            print(f"  Terminal {t}: Checkin={capacities[t]['checkin_counter']}, Security={capacities[t]['security_checkpoint']}, Immigration={capacities[t]['immigration_desk']}")
            
        # 5. Initialize Simpy Environment & Resources
        env = simpy.Environment()
        
        resources = {
            t: {
                "checkin_counter": simpy.Resource(env, capacity=capacities[t]["checkin_counter"]),
                "security_checkpoint": simpy.Resource(env, capacity=capacities[t]["security_checkpoint"]),
                "immigration_desk": simpy.Resource(env, capacity=capacities[t]["immigration_desk"])
            } for t in terminals
        }
        
        flight_gates = {}
        terminal_flights = {t: {} for t in terminals}
        
        # 6. Generate Passenger Arrival Events
        passenger_multiplier = config.get("passenger_multiplier", 1.0)
        scenario_name = config.get("scenario_name", "normal_day")
        
        # Configure arrival distributions
        arrival_mean = config.get("arrival_mean", 150.0)  # minutes before departure
        arrival_std = config.get("arrival_std", 30.0)
        arrival_min = config.get("arrival_min", 45.0)
        arrival_max = config.get("arrival_max", 240.0)
        
        stats = {
            t: {
                "checkin_counter": [],
                "security_checkpoint": [],
                "immigration_desk": [],
                "boarding_gate": []
            } for t in terminals
        }
        
        db_results = []
        passenger_count = 0
        
        for flight in flights:
            f_id = flight.flight_id
            term = flight.terminal
            
            # Apply flight delays for delay-heavy weather scenarios
            dep_time = flight.scheduled_departure
            if scenario_name == "bad_weather" and flight.delay_minutes > 0:
                dep_time += timedelta(minutes=flight.delay_minutes)
                
            dep_offset = (dep_time - sim_start_dt).total_seconds() / 60.0
            
            flight_info = {
                "flight_id": f_id,
                "terminal": term,
                "dep_offset": dep_offset
            }
            
            terminal_flights[term][f_id] = flight_info
            flight_gates[f_id] = simpy.Resource(env, capacity=2)  # Boarding gate resource
            
            # Fetch passengers
            passengers = session.query(Passenger).filter(Passenger.flight_id == f_id).all()
            
            # Fallback if no passengers in DB
            if not passengers:
                # Create a baseline of passengers if flight has none
                num_passengers = int(round(40 * passenger_multiplier))
                p_list = [{"checkin_status": "not-checked-in"} for _ in range(num_passengers)]
            else:
                num_passengers = int(round(len(passengers) * passenger_multiplier))
                # Sample with replacement to scale passenger size
                p_list = []
                for _ in range(num_passengers):
                    p_db = random.choice(passengers)
                    p_list.append({
                        "checkin_status": p_db.checkin_status
                    })
            
            for p_data in p_list:
                # Sample passenger lead time
                lead_time = random.normalvariate(arrival_mean, arrival_std)
                lead_time = max(arrival_min, min(arrival_max, lead_time))
                
                # Arrival time relative to simulation start
                # Arrival offset = flight departure offset - lead time
                arrival_offset = dep_offset - lead_time
                if arrival_offset < 0:
                    arrival_offset = 0.0
                    
                passenger_sim_data = {
                    "checkin_status": p_data["checkin_status"],
                    "arrival_offset": arrival_offset
                }
                
                passenger_count += 1
                env.process(passenger_process(
                    env, 
                    passenger_count, 
                    flight_info, 
                    passenger_sim_data, 
                    resources, 
                    flight_gates, 
                    config, 
                    stats
                ))
                
        print(f"Generated {passenger_count} passenger processes.")
        
        # 7. Start Queue Monitor Process
        env.process(queue_monitor(
            env, 
            resources, 
            flight_gates, 
            terminal_flights, 
            sim_start_dt, 
            scenario_name, 
            config, 
            stats, 
            db_results
        ))
        
        # 8. Run Simulation
        env.run(until=total_duration)
        
        # 9. Save Results to Database
        print(f"Simulation completed. Saving {len(db_results)} metric records to database...")
        save_simulation_results(session, db_results)
        print("Simulation results saved successfully.")
        
        return db_results
        
    except Exception as e:
        session.rollback()
        print(f"Simulation failed: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        session.close()

def save_simulation_results(session, db_results):
    """
    Saves the list of results to PostgreSQL.
    """
    results_to_insert = [
        SimulationResult(
            checkpoint=res["checkpoint"],
            queue_length=res["queue_length"],
            wait_time=res["wait_time"],
            congestion_level=res["congestion_level"],
            scenario_name=res["scenario_name"],
            timestamp=res["timestamp"]
        )
        for res in db_results
    ]
    
    chunk_size = 500
    for i in range(0, len(results_to_insert), chunk_size):
        session.add_all(results_to_insert[i:i+chunk_size])
        session.commit()
