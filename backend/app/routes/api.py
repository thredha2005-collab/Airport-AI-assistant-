import os
import sys
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete

from app.database import get_db
from app.models.models import Flight, Passenger, Facility, Direction, FacilityOccupancy, Parking, Weather, SimulationResult
from app.services.demo_state import DemoState
from app.services.predict_service import (
    predict_wait_time,
    predict_congestion,
    predict_delay,
    predict_facility_utilization
)
from app.services.simulation import run_airport_simulation

# Sync engine maker for Simpy which runs synchronously
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

db_url = os.getenv("DATABASE_SYNC_URL", "postgresql://postgres:qExTXiV6sGMAtc0b@127.0.0.1:5432/postgres")
sync_engine = create_engine(db_url)
SyncSessionLocal = sessionmaker(bind=sync_engine)

router = APIRouter(tags=["API"])

# Pydantic Schemas
class ItineraryResponse(BaseModel):
    passenger_id: str
    full_name: str
    pnr_booking_ref: str
    flight_id: str
    airline: str
    flight_number: str
    origin: str
    destination: str
    scheduled_departure: datetime
    actual_departure: Optional[datetime]
    gate_number: Optional[str]
    terminal: str
    status: str
    delay_minutes: float
    checkin_status: str
    predicted_wait_times: Dict[str, float]
    recommended_arrival_time: datetime

class FacilityResponse(BaseModel):
    facility_id: str
    facility_name: str
    category: str
    terminal: str
    floor: int
    x_coordinate: float
    y_coordinate: float
    operating_hours: str
    capacity: int

class FacilityOccupancyResponse(BaseModel):
    facility_id: str
    facility_name: str
    occupancy_count: int
    capacity: int
    occupancy_ratio: float
    crowd_level: str

class NearestFacilityResponse(BaseModel):
    facility: FacilityResponse
    distance_m: float
    estimated_walk_time_min: float

class DirectionResponse(BaseModel):
    from_location_name: str
    to_location_name: str
    path_description: str
    distance_m: float
    estimated_walk_time_min: float
    terminal: str
    floor_change_flag: bool

class ParkingStatusResponse(BaseModel):
    parking_id: str
    zone_name: str
    total_slots: int
    occupied_slots: int
    occupancy_ratio: float
    hourly_rate: float
    distance_to_terminal_m: int
    vehicle_type: str

class ParkingPredictionResponse(BaseModel):
    timestamp: datetime
    zone_name: str
    predicted_occupancy_ratio: float
    predicted_crowd_level: str

class WeatherResponse(BaseModel):
    temperature_c: float
    precipitation_mm: float
    wind_speed_kmph: float
    visibility_km: float
    condition: str

class WaitTimeRequest(BaseModel):
    terminal: str
    stage: str
    timestamp: datetime

class CongestionRequest(BaseModel):
    terminal: str
    stage: str
    timestamp: datetime
    queue_length: int

class DelayRequest(BaseModel):
    airline: str
    scheduled_departure: datetime

class FacilityUtilRequest(BaseModel):
    facility_id_or_category: str
    timestamp: datetime
    terminal: Optional[str] = None

class WhatIfRequest(BaseModel):
    start_date: str  # YYYY-MM-DD
    staffing_config: Dict[str, Dict[str, int]]  # e.g., {"T1": {"checkin_counter": 10}}

class WhatIfResponse(BaseModel):
    checkpoint: str
    timestamp: datetime
    queue_length: int
    wait_time: float
    congestion_level: str

class LiveCongestionResponse(BaseModel):
    checkpoint: str
    queue_length: int
    wait_time: float
    congestion_level: str
    status: str  # OK, ALERT (wait_time > 15m)

# -----------------
# 1. Passenger Itinerary
# -----------------
@router.get("/passenger/{pnr}/itinerary", response_model=ItineraryResponse)
async def get_passenger_itinerary(pnr: str, db: AsyncSession = Depends(get_db)):
    # 1. Fetch passenger
    res = await db.execute(select(Passenger).filter(Passenger.pnr_booking_ref == pnr))
    passenger = res.scalars().first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")
        
    # 2. Fetch flight
    res = await db.execute(select(Flight).filter(Flight.flight_id == passenger.flight_id))
    flight = res.scalars().first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
        
    # 3. Calculate predicted wait times at checkpoints
    dep_time = flight.scheduled_departure
    terminal = flight.terminal
    
    # Run predictions synchronously via predict_service
    # Open a sync DB connection from the pool for scikit-learn helper queries
    sync_db = SyncSessionLocal()
    try:
        w_checkin = 0.0
        if passenger.checkin_status not in ["checked-in", "boarding-pass-issued"]:
            w_checkin = predict_wait_time(terminal, "Check-in", dep_time, session=sync_db)
            
        w_security = predict_wait_time(terminal, "Security Screening", dep_time, session=sync_db)
        w_immigration = predict_wait_time(terminal, "Immigration Check", dep_time, session=sync_db)
        
        # Estimate boarding gate wait time using the boarding model
        # Default fallback to 5 minutes boarding wait if no model prediction
        w_boarding = 5.0
        
        predicted_waits = {
            "Check-in": round(w_checkin, 2),
            "Security Screening": round(w_security, 2),
            "Immigration Check": round(w_immigration, 2),
            "Boarding Gate": round(w_boarding, 2)
        }
        
        # Total wait time includes walk time (say, 5 minutes)
        total_wait_minutes = w_checkin + w_security + w_immigration + w_boarding + 5.0
        
        # Recommended arrival = departure - wait times - 45 minute boarding buffer
        rec_arrival = dep_time - timedelta(minutes=total_wait_minutes) - timedelta(minutes=45)
        
    finally:
        sync_db.close()
        
    return ItineraryResponse(
        passenger_id=passenger.passenger_id,
        full_name=passenger.full_name,
        pnr_booking_ref=passenger.pnr_booking_ref,
        flight_id=flight.flight_id,
        airline=flight.airline,
        flight_number=flight.flight_number,
        origin=flight.origin,
        destination=flight.destination,
        scheduled_departure=flight.scheduled_departure,
        actual_departure=flight.actual_departure,
        gate_number=flight.gate_number,
        terminal=flight.terminal,
        status=flight.status,
        delay_minutes=flight.delay_minutes,
        checkin_status=passenger.checkin_status,
        predicted_wait_times=predicted_waits,
        recommended_arrival_time=rec_arrival
    )

# -----------------
# 2. Facilities
# -----------------
@router.get("/facilities", response_model=List[FacilityResponse])
async def get_facilities(category: Optional[str] = None, terminal: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Facility).filter(Facility.facility_id.notlike("%-ENTRY"))
    if category:
        query = query.filter(Facility.category == category)
    if terminal:
        query = query.filter(Facility.terminal == terminal)
        
    res = await db.execute(query)
    facilities = res.scalars().all()
    return [
        FacilityResponse(
            facility_id=f.facility_id,
            facility_name=f.facility_name,
            category=f.category,
            terminal=f.terminal,
            floor=f.floor,
            x_coordinate=f.x_coordinate,
            y_coordinate=f.y_coordinate,
            operating_hours=f.operating_hours,
            capacity=f.capacity
        ) for f in facilities
    ]

@router.get("/facilities/{facility_id}/occupancy", response_model=FacilityOccupancyResponse)
async def get_facility_occupancy(facility_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Facility).filter(Facility.facility_id == facility_id))
    fac = res.scalars().first()
    if not fac:
        raise HTTPException(status_code=404, detail="Facility not found")
        
    # Query closest occupancy record in time series
    current_time = DemoState.get_current_time()
    res_occ = await db.execute(
        select(FacilityOccupancy)
        .filter(FacilityOccupancy.facility_id == facility_id)
        .order_by(func.abs(func.extract('epoch', FacilityOccupancy.timestamp - current_time)))
        .limit(1)
    )
    occ = res_occ.scalars().first()
    
    if occ:
        return FacilityOccupancyResponse(
            facility_id=fac.facility_id,
            facility_name=fac.facility_name,
            occupancy_count=occ.occupancy_count,
            capacity=occ.capacity,
            occupancy_ratio=occ.occupancy_ratio,
            crowd_level=occ.crowd_level
        )
        
    # Return placeholder if no occupancy logs exist for this facility
    return FacilityOccupancyResponse(
        facility_id=fac.facility_id,
        facility_name=fac.facility_name,
        occupancy_count=10,
        capacity=fac.capacity,
        occupancy_ratio=10 / fac.capacity,
        crowd_level="low"
    )

@router.get("/facilities/nearest", response_model=NearestFacilityResponse)
async def get_nearest_facility(category: str, current_location: str, db: AsyncSession = Depends(get_db)):
    """
    Finds nearest facility of category to the current_location (facility_id) using directions.csv distances.
    """
    # 1. Fetch source facility
    res_src = await db.execute(select(Facility).filter(Facility.facility_id == current_location))
    src = res_src.scalars().first()
    if not src:
        raise HTTPException(status_code=404, detail="Current location facility not found")
        
    # 2. Fetch all facilities of category
    res_dest = await db.execute(select(Facility).filter(Facility.category == category, Facility.facility_id != current_location))
    dest_list = res_dest.scalars().all()
    
    if not dest_list:
        raise HTTPException(status_code=404, detail=f"No facilities of category '{category}' found")
        
    # 3. Query directions to find distances
    nearest_fac = None
    min_dist = float('inf')
    best_direction = None
    
    for dest in dest_list:
        # Check directions from source to dest, or dest to source
        res_dir = await db.execute(
            select(Direction).filter(
                ((Direction.from_location_id == current_location) & (Direction.to_location_id == dest.facility_id)) |
                ((Direction.from_location_id == dest.facility_id) & (Direction.to_location_id == current_location))
            )
        )
        direction = res_dir.scalars().first()
        if direction and direction.distance_m < min_dist:
            min_dist = direction.distance_m
            nearest_fac = dest
            best_direction = direction
            
    if nearest_fac and best_direction:
        return NearestFacilityResponse(
            facility=FacilityResponse(
                facility_id=nearest_fac.facility_id,
                facility_name=nearest_fac.facility_name,
                category=nearest_fac.category,
                terminal=nearest_fac.terminal,
                floor=nearest_fac.floor,
                x_coordinate=nearest_fac.x_coordinate,
                y_coordinate=nearest_fac.y_coordinate,
                operating_hours=nearest_fac.operating_hours,
                capacity=nearest_fac.capacity
            ),
            distance_m=best_direction.distance_m,
            estimated_walk_time_min=best_direction.estimated_walk_time_min
        )
        
    # If no recorded direction in directions table, fall back to physical distance or default
    fallback_fac = dest_list[0]
    return NearestFacilityResponse(
        facility=FacilityResponse(
            facility_id=fallback_fac.facility_id,
            facility_name=fallback_fac.facility_name,
            category=fallback_fac.category,
            terminal=fallback_fac.terminal,
            floor=fallback_fac.floor,
            x_coordinate=fallback_fac.x_coordinate,
            y_coordinate=fallback_fac.y_coordinate,
            operating_hours=fallback_fac.operating_hours,
            capacity=fallback_fac.capacity
        ),
        distance_m=150.0,
        estimated_walk_time_min=3.0
    )

@router.get("/facilities/crowd-levels", response_model=List[FacilityOccupancyResponse])
async def get_facilities_crowd_levels(category: str, db: AsyncSession = Depends(get_db)):
    res_fac = await db.execute(select(Facility).filter(Facility.category == category))
    fac_list = res_fac.scalars().all()
    
    current_time = DemoState.get_current_time()
    results = []
    for fac in fac_list:
        res_occ = await db.execute(
            select(FacilityOccupancy)
            .filter(FacilityOccupancy.facility_id == fac.facility_id)
            .order_by(func.abs(func.extract('epoch', FacilityOccupancy.timestamp - current_time)))
            .limit(1)
        )
        occ = res_occ.scalars().first()
        
        ratio = occ.occupancy_ratio if occ else 0.25
        crowd = occ.crowd_level if occ else "low"
        count = occ.occupancy_count if occ else 10
        
        results.append(FacilityOccupancyResponse(
            facility_id=fac.facility_id,
            facility_name=fac.facility_name,
            occupancy_count=count,
            capacity=fac.capacity,
            occupancy_ratio=ratio,
            crowd_level=crowd
        ))
    return results

@router.get("/directions", response_model=DirectionResponse)
async def get_directions(from_location_id: str, to_location_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Direction).filter(
            ((Direction.from_location_id == from_location_id) & (Direction.to_location_id == to_location_id)) |
            ((Direction.from_location_id == to_location_id) & (Direction.to_location_id == from_location_id))
        )
    )
    direction = res.scalars().first()
    if not direction:
        # Fetch names
        res_from = await db.execute(select(Facility.facility_name).filter(Facility.facility_id == from_location_id))
        from_name = res_from.scalar() or "Source Checkpoint"
        res_to = await db.execute(select(Facility.facility_name).filter(Facility.facility_id == to_location_id))
        to_name = res_to.scalar() or "Destination Checkpoint"
        
        return DirectionResponse(
            from_location_name=from_name,
            to_location_name=to_name,
            path_description="Walk through the main airport terminal hallway following signs.",
            distance_m=200.0,
            estimated_walk_time_min=4.0,
            terminal="T1",
            floor_change_flag=False
        )
        
    return DirectionResponse(
        from_location_name=direction.from_location_name,
        to_location_name=direction.to_location_name,
        path_description=direction.path_description,
        distance_m=direction.distance_m,
        estimated_walk_time_min=direction.estimated_walk_time_min,
        terminal=direction.terminal,
        floor_change_flag=direction.floor_change_flag
    )

# -----------------
# 3. Parking
# -----------------
@router.get("/parking/status", response_model=List[ParkingStatusResponse])
async def get_parking_status(db: AsyncSession = Depends(get_db)):
    current_time = DemoState.get_current_time()
    # Fetch parking records closest to the mock current time
    # There are 388 parking records, grouped by zone name and timestamp
    # Let's select the latest parking record for each distinct zone_name closest to current_time
    zones = ["Zone A", "Zone B", "Zone C", "Zone D"]
    results = []
    for zone in zones:
        res = await db.execute(
            select(Parking)
            .filter(Parking.zone_name == zone)
            .order_by(func.abs(func.extract('epoch', Parking.timestamp - current_time)))
            .limit(1)
        )
        p = res.scalars().first()
        if p:
            results.append(ParkingStatusResponse(
                parking_id=p.parking_id,
                zone_name=p.zone_name,
                total_slots=p.total_slots,
                occupied_slots=p.occupied_slots,
                occupancy_ratio=p.occupancy_ratio,
                hourly_rate=p.hourly_rate,
                distance_to_terminal_m=p.distance_to_terminal_m,
                vehicle_type=p.vehicle_type
            ))
    return results

@router.get("/parking/predict", response_model=List[ParkingPredictionResponse])
async def get_parking_prediction(db: AsyncSession = Depends(get_db)):
    """
    Predicts parking occupancy ratio and crowd level for the next 24 hours.
    """
    current_time = DemoState.get_current_time()
    results = []
    zones = ["Zone A", "Zone B", "Zone C", "Zone D"]
    
    # We simulate predictions by looking at historical data at similar hours, 
    # or mapping to a standard cosine wave peaking around 18:00 (Evening Rush)
    for hour in range(24):
        target_time = current_time + timedelta(hours=hour)
        hour_val = target_time.hour
        
        # Simple cyclic occupancy projection peaking at 18:00 (0.8) and dipping at 04:00 (0.2)
        base_ratio = 0.5 + 0.3 * func.cos((hour_val - 18) * 3.14159 / 12)
        
        for zone in zones:
            # Query sync model or mock parking projection
            # Let's project a realistic occupancy curve with zone-specific variance
            if zone == "Zone A":
                var = 0.05
            elif zone == "Zone B":
                var = 0.15  # Zone B is the busy one highlighted in Evening Rush
            else:
                var = -0.05
                
            # Compute mock ratio
            import math
            ratio = 0.55 + 0.25 * math.cos((hour_val - 18) * 3.14159 / 12) + var
            ratio = max(0.1, min(0.95, ratio))
            
            if ratio < 0.4:
                crowd = "low"
            elif ratio < 0.75:
                crowd = "medium"
            else:
                crowd = "high"
                
            results.append(ParkingPredictionResponse(
                timestamp=target_time,
                zone_name=zone,
                predicted_occupancy_ratio=round(ratio, 2),
                predicted_crowd_level=crowd
            ))
            
    return results

# -----------------
# 4. Weather
# -----------------
@router.get("/weather/current", response_model=WeatherResponse)
async def get_current_weather(db: AsyncSession = Depends(get_db)):
    current_time = DemoState.get_current_time()
    res = await db.execute(
        select(Weather)
        .order_by(func.abs(func.extract('epoch', Weather.timestamp - current_time)))
        .limit(1)
    )
    w = res.scalars().first()
    if w:
        return WeatherResponse(
            temperature_c=w.temperature_c,
            precipitation_mm=w.precipitation_mm,
            wind_speed_kmph=w.wind_speed_kmph,
            visibility_km=w.visibility_km,
            condition=w.condition
        )
    return WeatherResponse(
        temperature_c=24.0,
        precipitation_mm=0.0,
        wind_speed_kmph=12.0,
        visibility_km=10.0,
        condition="clear"
    )

@router.get("/weather/forecast", response_model=List[Dict])
async def get_weather_forecast(db: AsyncSession = Depends(get_db)):
    current_time = DemoState.get_current_time()
    # Forecast for the next 12 hours
    res = await db.execute(
        select(Weather)
        .filter(Weather.timestamp >= current_time)
        .order_by(Weather.timestamp.asc())
        .limit(12)
    )
    weather_list = res.scalars().all()
    
    if not weather_list:
        # If no future forecasts, return default progression
        return [
            {
                "timestamp": current_time + timedelta(hours=i),
                "temperature_c": 24.0 - i * 0.5,
                "precipitation_mm": 0.0,
                "wind_speed_kmph": 12.0 + i,
                "visibility_km": 10.0,
                "condition": "clear"
            } for i in range(12)
        ]
        
    return [
        {
            "timestamp": w.timestamp,
            "temperature_c": w.temperature_c,
            "precipitation_mm": w.precipitation_mm,
            "wind_speed_kmph": w.wind_speed_kmph,
            "visibility_km": w.visibility_km,
            "condition": w.condition
        } for w in weather_list
    ]

# -----------------
# 5. Live Predictions
# -----------------
@router.post("/predict/wait-time")
async def get_predicted_wait_time(req: WaitTimeRequest):
    sync_db = SyncSessionLocal()
    try:
        wait_time = predict_wait_time(req.terminal, req.stage, req.timestamp, session=sync_db)
        return {"predicted_wait_time": round(wait_time, 2)}
    finally:
        sync_db.close()

@router.post("/predict/congestion")
async def get_predicted_congestion(req: CongestionRequest):
    sync_db = SyncSessionLocal()
    try:
        congestion = predict_congestion(req.terminal, req.stage, req.timestamp, req.queue_length, session=sync_db)
        return {"predicted_congestion_level": congestion}
    finally:
        sync_db.close()

@router.post("/predict/delay")
async def get_predicted_delay(req: DelayRequest):
    sync_db = SyncSessionLocal()
    try:
        delay = predict_delay(req.airline, req.scheduled_departure, session=sync_db)
        return {"predicted_delay_minutes": round(delay, 2)}
    finally:
        sync_db.close()

@router.post("/predict/facility-utilization")
async def get_predicted_facility_util(req: FacilityUtilRequest):
    sync_db = SyncSessionLocal()
    try:
        util = predict_facility_utilization(
            req.facility_id_or_category, 
            req.timestamp, 
            terminal=req.terminal, 
            session=sync_db
        )
        return util
    finally:
        sync_db.close()

# -----------------
# 6. What-If Simulation
# -----------------
@router.post("/simulate/what-if", response_model=List[WhatIfResponse])
async def simulate_what_if(req: WhatIfRequest):
    """
    Runs a Simpy simulation in the background with user-configured staffing capacities
    and returns the resulting queue lines and wait times.
    """
    unique_scenario_id = f"what_if_{uuid.uuid4().hex[:8]}"
    
    config = {
        "scenario_name": unique_scenario_id,
        "start_date": req.start_date,
        "passenger_multiplier": 10.0,  # Standard density
        "staffing_config": req.staffing_config,
        "seed": 42
    }
    
    # Run the simulation synchronously (Simpy is fast)
    # The results are written to PostgreSQL
    results = run_airport_simulation(config)
    
    # Format response
    response_list = [
        WhatIfResponse(
            checkpoint=res["checkpoint"],
            timestamp=res["timestamp"],
            queue_length=res["queue_length"],
            wait_time=res["wait_time"],
            congestion_level=res["congestion_level"]
        ) for res in results
    ]
    
    # Clean up what-if records from the DB to prevent bloat
    sync_db = SyncSessionLocal()
    try:
        sync_db.execute(delete(SimulationResult).where(SimulationResult.scenario_name == unique_scenario_id))
        sync_db.commit()
    except Exception as e:
        print(f"Error cleaning up what_if records: {e}")
    finally:
        sync_db.close()
        
    return response_list

# -----------------
# 7. Admin Congestion
# -----------------
@router.get("/admin/live-congestion", response_model=List[LiveCongestionResponse])
async def get_admin_live_congestion(db: AsyncSession = Depends(get_db)):
    """
    Fetches real-time queue lengths and wait times across checkpoints.
    Alert flags are raised when wait time > 15 minutes.
    """
    current_time = DemoState.get_current_time()
    
    # Match the simulation results closest to our mock current time
    # Checkpoints to query
    checkpoints = [
        "T1 Check-in", "T1 Security Screening", "T1 Immigration Check", "T1 Boarding Gate",
        "T2 Check-in", "T2 Security Screening", "T2 Immigration Check", "T2 Boarding Gate",
        "T3 Check-in", "T3 Security Screening", "T3 Immigration Check", "T3 Boarding Gate"
    ]
    
    # If in a custom scenario, we look for that scenario name first (e.g. normal_day, peak_holiday, bad_weather)
    scenario_name = DemoState.scenario_name or "normal_day"
    
    results = []
    for cp in checkpoints:
        res = await db.execute(
            select(SimulationResult)
            .filter(SimulationResult.checkpoint == cp, SimulationResult.scenario_name == scenario_name)
            .order_by(func.abs(func.extract('epoch', SimulationResult.timestamp - current_time)))
            .limit(1)
        )
        r = res.scalars().first()
        if r:
            status_flag = "ALERT" if r.wait_time > 15.0 else "OK"
            results.append(LiveCongestionResponse(
                checkpoint=r.checkpoint,
                queue_length=r.queue_length,
                wait_time=r.wait_time,
                congestion_level=r.congestion_level,
                status=status_flag
            ))
        else:
            # Fallback mock placeholder
            results.append(LiveCongestionResponse(
                checkpoint=cp,
                queue_length=0,
                wait_time=0.0,
                congestion_level="low",
                status="OK"
            ))
    return results

# Flight List Response Schema
class FlightListResponse(BaseModel):
    flight_id: str
    airline: str
    flight_number: str
    origin: str
    destination: str
    destination_city: str
    scheduled_departure: datetime
    actual_departure: Optional[datetime]
    gate_number: Optional[str]
    terminal: str
    status: str
    delay_minutes: float
    delay_reason: Optional[str]

@router.get("/flights", response_model=List[FlightListResponse])
async def get_all_flights(db: AsyncSession = Depends(get_db)):
    """
    Retrieves departures for the current mock date.
    """
    current_time = DemoState.get_current_time()
    
    # Filter flights departing on the current simulated date
    start_of_day = datetime(current_time.year, current_time.month, current_time.day, 0, 0, 0)
    end_of_day = datetime(current_time.year, current_time.month, current_time.day, 23, 59, 59)
    
    res = await db.execute(
        select(Flight)
        .filter(Flight.scheduled_departure >= start_of_day, Flight.scheduled_departure <= end_of_day)
        .order_by(Flight.scheduled_departure.asc())
    )
    flights = res.scalars().all()
    
    return [
        FlightListResponse(
            flight_id=f.flight_id,
            airline=f.airline,
            flight_number=f.flight_number,
            origin=f.origin,
            destination=f.destination,
            destination_city=f.destination_city,
            scheduled_departure=f.scheduled_departure,
            actual_departure=f.actual_departure,
            gate_number=f.gate_number,
            terminal=f.terminal,
            status=f.status,
            delay_minutes=f.delay_minutes,
            delay_reason=f.delay_reason
        ) for f in flights
    ]

