import os
import pandas as pd
import bcrypt
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import models
from app.database import Base
from app.models.models import Flight, Passenger, Facility, Parking, Weather, Direction, FacilityOccupancy, User

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DATABASE_SYNC_URL = os.getenv("DATABASE_SYNC_URL", "postgresql://postgres:qExTXiV6sGMAtc0b@127.0.0.1:5432/postgres")

print(f"Connecting to database to seed: {DATABASE_SYNC_URL}")
engine = create_engine(DATABASE_SYNC_URL)
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()

def hash_pw(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def parse_dt(val):
    if pd.isna(val):
        return None
    return pd.to_datetime(val).to_pydatetime()

from sqlalchemy import text

try:
    # 0. Truncate existing tables to ensure a clean state
    print("Clearing existing data from tables...")
    session.execute(text("TRUNCATE TABLE chat_logs, users, model_metrics, predictions, simulation_results, facility_occupancy, directions, weather, parking, passengers, flights, facilities CASCADE;"))
    session.commit()

    # 1. Seed Flights
    print("Seeding flights...")
    flights_df = pd.read_csv(os.path.join(DATA_DIR, "flights.csv"))
    flights = []
    for _, row in flights_df.iterrows():
        f = Flight(
            flight_id=row["flight_id"],
            airline=row["airline"],
            flight_number=str(row["flight_number"]),
            origin=row["origin"],
            destination=row["destination"],
            destination_city=row["destination_city"],
            scheduled_departure=parse_dt(row["scheduled_departure"]),
            scheduled_arrival=parse_dt(row["scheduled_arrival"]),
            actual_departure=parse_dt(row["actual_departure"]),
            actual_arrival=parse_dt(row["actual_arrival"]),
            gate_number=row["gate_number"] if not pd.isna(row["gate_number"]) else None,
            terminal=row["terminal"],
            status=row["status"],
            aircraft_type=row["aircraft_type"],
            delay_minutes=float(row["delay_minutes"]),
            delay_reason=row["delay_reason"] if not pd.isna(row["delay_reason"]) else None
        )
        flights.append(f)
    session.add_all(flights)
    session.commit()
    print(f"Seeded {len(flights)} flights.")

    # 2. Seed Passengers
    print("Seeding passengers...")
    pass_df = pd.read_csv(os.path.join(DATA_DIR, "passengers.csv"))
    passengers = []
    for _, row in pass_df.iterrows():
        p = Passenger(
            passenger_id=row["passenger_id"],
            first_name=row["first_name"],
            last_name=row["last_name"],
            full_name=row["full_name"],
            pnr_booking_ref=row["pnr_booking_ref"],
            flight_id=row["flight_id"],
            seat_number=row["seat_number"],
            ticket_class=row["ticket_class"],
            checkin_status=row["checkin_status"],
            special_assistance_flag=bool(row["special_assistance_flag"]),
            nationality=row["nationality"],
            contact_email=row["contact_email"]
        )
        passengers.append(p)
    session.add_all(passengers)
    session.commit()
    print(f"Seeded {len(passengers)} passengers.")

    # 3. Seed Facilities
    print("Seeding facilities...")
    fac_df = pd.read_csv(os.path.join(DATA_DIR, "facilities.csv"))
    facilities = []
    for _, row in fac_df.iterrows():
        fac = Facility(
            facility_id=row["facility_id"],
            facility_name=row["facility_name"],
            category=row["category"],
            terminal=row["terminal"],
            floor=int(row["floor"]),
            x_coordinate=float(row["x_coordinate"]),
            y_coordinate=float(row["y_coordinate"]),
            operating_hours=row["operating_hours"],
            capacity=int(row["capacity"])
        )
        facilities.append(fac)
    
    # Add virtual entry facilities to satisfy foreign key constraints for directions
    virtual_entries = [
        Facility(facility_id="T1-ENTRY", facility_name="T1 Main Entrance", category="checkin_counter", terminal="T1", floor=1, x_coordinate=0.0, y_coordinate=0.0, operating_hours="24/7", capacity=5000),
        Facility(facility_id="T2-ENTRY", facility_name="T2 Main Entrance", category="checkin_counter", terminal="T2", floor=1, x_coordinate=0.0, y_coordinate=0.0, operating_hours="24/7", capacity=5000),
        Facility(facility_id="T3-ENTRY", facility_name="T3 Main Entrance", category="checkin_counter", terminal="T3", floor=1, x_coordinate=0.0, y_coordinate=0.0, operating_hours="24/7", capacity=5000),
    ]
    facilities.extend(virtual_entries)

    session.add_all(facilities)
    session.commit()
    print(f"Seeded {len(facilities)} facilities (including 3 virtual terminal entries).")

    # 4. Seed Directions
    print("Seeding directions...")
    dir_df = pd.read_csv(os.path.join(DATA_DIR, "directions.csv"))
    directions = []
    for _, row in dir_df.iterrows():
        d = Direction(
            direction_id=row["direction_id"],
            from_location_id=row["from_location_id"],
            from_location_name=row["from_location_name"],
            to_location_id=row["to_location_id"],
            to_location_name=row["to_location_name"],
            path_description=row["path_description"],
            distance_m=float(row["distance_m"]),
            estimated_walk_time_min=float(row["estimated_walk_time_min"]),
            terminal=row["terminal"],
            floor_change_flag=bool(row["floor_change_flag"])
        )
        directions.append(d)
    session.add_all(directions)
    session.commit()
    print(f"Seeded {len(directions)} directions.")

    # 5. Seed Facility Occupancy
    print("Seeding facility occupancy...")
    occ_df = pd.read_csv(os.path.join(DATA_DIR, "facility_occupancy.csv"))
    occupancies = []
    for _, row in occ_df.iterrows():
        occ = FacilityOccupancy(
            occupancy_id=row["occupancy_id"],
            facility_id=row["facility_id"],
            facility_name=row["facility_name"],
            category=row["category"],
            terminal=row["terminal"],
            timestamp=parse_dt(row["timestamp"]),
            occupancy_count=int(row["occupancy_count"]),
            capacity=int(row["capacity"]),
            occupancy_ratio=float(row["occupancy_ratio"]),
            crowd_level=row["crowd_level"]
        )
        occupancies.append(occ)
    session.add_all(occupancies)
    session.commit()
    print(f"Seeded {len(occupancies)} facility occupancy records.")

    # 6. Seed Parking
    print("Seeding parking...")
    parking_df = pd.read_csv(os.path.join(DATA_DIR, "parking.csv"))
    parking_records = []
    for _, row in parking_df.iterrows():
        pk = Parking(
            parking_id=row["parking_id"],
            zone_name=row["zone_name"],
            total_slots=int(row["total_slots"]),
            occupied_slots=int(row["occupied_slots"]),
            occupancy_ratio=float(row["occupancy_ratio"]),
            hourly_rate=float(row["hourly_rate"]),
            distance_to_terminal_m=int(row["distance_to_terminal_m"]),
            timestamp=parse_dt(row["timestamp"]),
            vehicle_type=row["vehicle_type"]
        )
        parking_records.append(pk)
    session.add_all(parking_records)
    session.commit()
    print(f"Seeded {len(parking_records)} parking records.")

    # 7. Seed Weather
    print("Seeding weather...")
    w_df = pd.read_csv(os.path.join(DATA_DIR, "weather.csv"))
    weather_records = []
    for _, row in w_df.iterrows():
        w = Weather(
            weather_id=row["weather_id"],
            timestamp=parse_dt(row["timestamp"]),
            temperature_c=float(row["temperature_c"]),
            precipitation_mm=float(row["precipitation_mm"]),
            wind_speed_kmph=float(row["wind_speed_kmph"]),
            visibility_km=float(row["visibility_km"]),
            condition=row["condition"],
            forecast_horizon_hrs=int(row["forecast_horizon_hrs"])
        )
        weather_records.append(w)
    session.add_all(weather_records)
    session.commit()
    print(f"Seeded {len(weather_records)} weather records.")

    # 8. Seed Users from Credentials
    print("Seeding users from credentials...")
    
    # 20 Passenger logins: PNR + Last Name
    passenger_creds = [
        ("9GACQD", "Brown", "Mei Brown"),
        ("JUGBAC", "Chen", "Omar Chen"),
        ("TWJYAD", "Silva", "Omar Silva"),
        ("X92GBW", "Nguyen", "Michael Nguyen"),
        ("KTRFKE", "Schmidt", "Ahmed Schmidt"),
        ("RCZZQK", "Sharma", "Jennifer Sharma"),
        ("5FLBCH", "Hernandez", "Valentina Hernandez"),
        ("UBCT9B", "Davis", "Carlos Davis"),
        ("D29PGQ", "Ibrahim", "Patricia Ibrahim"),
        ("APW8ET", "Smith", "Fatima Smith"),
        ("J9VQRQ", "Tran", "Ahmed Tran"),
        ("7QUSSV", "Patel", "Wei Patel"),
        ("DRPXRQ", "Ibrahim", "Daniel Ibrahim"),
        ("KJN6TV", "Lefevre", "Fatima Lefevre"),
        ("ERPF8M", "Andersson", "Priya Andersson"),
        ("94TZFU", "Williams", "Lucas Williams"),
        ("3ZBDJH", "Williams", "David Williams"),
        ("57WWTP", "Patel", "Diego Patel"),
        ("MMD9AE", "Ali", "James Ali"),
        ("HG26XS", "Costa", "Ethan Costa")
    ]
    
    users = []
    for pnr, last_name, name in passenger_creds:
        # Link to actual passenger record
        p_record = session.query(Passenger).filter(Passenger.pnr_booking_ref == pnr).first()
        p_id = p_record.passenger_id if p_record else None
        
        u = User(
            username=pnr,
            hashed_password=hash_pw(last_name),
            role="passenger",
            full_name=name,
            passenger_id=p_id
        )
        users.append(u)
        
    # 5 Staff logins
    staff_creds = [
        ("staff01.verma", "Staff@2027!", "Ananya Verma", "staff"),
        ("staff02.nair", "Staff@2028!", "Rahul Nair", "staff"),
        ("staff03.thompson", "Staff@2029!", "Sarah Thompson", "staff"),
        ("staff04.alvarez", "Staff@2030!", "Mateo Alvarez", "staff"),
        ("staff05.bennett", "Staff@2031!", "Chloe Bennett", "staff")
    ]
    for username, pw, name, role in staff_creds:
        u = User(
            username=username,
            hashed_password=hash_pw(pw),
            role=role,
            full_name=name,
            passenger_id=None
        )
        users.append(u)
        
    # 2 Admin logins
    admin_creds = [
        ("admin.ops", "AdminOps@2026!", "Priyanka Desai", "admin"),
        ("admin.system", "AdminSys@2026!", "Marcus Webb", "admin")
    ]
    for username, pw, name, role in admin_creds:
        u = User(
            username=username,
            hashed_password=hash_pw(pw),
            role=role,
            full_name=name,
            passenger_id=None
        )
        users.append(u)
        
    session.add_all(users)
    session.commit()
    print(f"Seeded {len(users)} users.")

    print("\nDatabase seeding completed successfully!")
except Exception as e:
    session.rollback()
    print(f"Error seeding database: {e}")
finally:
    session.close()
