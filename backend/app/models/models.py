from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.database import Base

class Flight(Base):
    __tablename__ = "flights"

    flight_id = Column(String(50), primary_key=True, index=True)
    airline = Column(String(100), nullable=False)
    flight_number = Column(String(50), nullable=False)
    origin = Column(String(10), nullable=False)  # PUY
    destination = Column(String(10), nullable=False)
    destination_city = Column(String(100), nullable=False)
    scheduled_departure = Column(DateTime, nullable=False, index=True)
    scheduled_arrival = Column(DateTime, nullable=False)
    actual_departure = Column(DateTime, nullable=True)
    actual_arrival = Column(DateTime, nullable=True)
    gate_number = Column(String(50), nullable=True)
    terminal = Column(String(10), nullable=False, index=True)
    status = Column(String(50), nullable=False)  # on-time, delayed, cancelled, boarding
    aircraft_type = Column(String(50), nullable=False)
    delay_minutes = Column(Float, default=0.0)
    delay_reason = Column(String(200), nullable=True)

    # Relationships
    passengers = relationship("Passenger", back_populates="flight")


class Passenger(Base):
    __tablename__ = "passengers"

    passenger_id = Column(String(50), primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(200), nullable=False)
    pnr_booking_ref = Column(String(50), unique=True, index=True, nullable=False)
    flight_id = Column(String(50), ForeignKey("flights.flight_id"), nullable=False, index=True)
    seat_number = Column(String(20), nullable=False)
    ticket_class = Column(String(50), nullable=False)
    checkin_status = Column(String(50), nullable=False)
    special_assistance_flag = Column(Boolean, default=False)
    nationality = Column(String(100), nullable=False)
    contact_email = Column(String(200), nullable=False)

    # Relationships
    flight = relationship("Flight", back_populates="passengers")
    user = relationship("User", back_populates="passenger", uselist=False)


class Facility(Base):
    __tablename__ = "facilities"

    facility_id = Column(String(50), primary_key=True, index=True)
    facility_name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False, index=True)  # restroom, cafe, lounge, checkin_counter, etc.
    terminal = Column(String(10), nullable=False, index=True)
    floor = Column(Integer, nullable=False)
    x_coordinate = Column(Float, nullable=False)
    y_coordinate = Column(Float, nullable=False)
    operating_hours = Column(String(100), nullable=False)
    capacity = Column(Integer, nullable=False)

    # Relationships
    occupancies = relationship("FacilityOccupancy", back_populates="facility")
    directions_from = relationship("Direction", foreign_keys="[Direction.from_location_id]", back_populates="from_location")
    directions_to = relationship("Direction", foreign_keys="[Direction.to_location_id]", back_populates="to_location")


class Parking(Base):
    __tablename__ = "parking"

    parking_id = Column(String(50), primary_key=True)
    zone_name = Column(String(100), nullable=False, index=True)
    total_slots = Column(Integer, nullable=False)
    occupied_slots = Column(Integer, nullable=False)
    occupancy_ratio = Column(Float, nullable=False)
    hourly_rate = Column(Float, nullable=False)
    distance_to_terminal_m = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=False)


class Weather(Base):
    __tablename__ = "weather"

    weather_id = Column(String(50), primary_key=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    temperature_c = Column(Float, nullable=False)
    precipitation_mm = Column(Float, nullable=False)
    wind_speed_kmph = Column(Float, nullable=False)
    visibility_km = Column(Float, nullable=False)
    condition = Column(String(50), nullable=False)  # clear, rain, fog, storm
    forecast_horizon_hrs = Column(Integer, nullable=False)


class Direction(Base):
    __tablename__ = "directions"

    direction_id = Column(String(50), primary_key=True)
    from_location_id = Column(String(50), ForeignKey("facilities.facility_id"), nullable=False, index=True)
    from_location_name = Column(String(200), nullable=False)
    to_location_id = Column(String(50), ForeignKey("facilities.facility_id"), nullable=False, index=True)
    to_location_name = Column(String(200), nullable=False)
    path_description = Column(Text, nullable=False)
    distance_m = Column(Float, nullable=False)
    estimated_walk_time_min = Column(Float, nullable=False)
    terminal = Column(String(50), nullable=False)
    floor_change_flag = Column(Boolean, default=False)

    # Relationships
    from_location = relationship("Facility", foreign_keys=[from_location_id], back_populates="directions_from")
    to_location = relationship("Facility", foreign_keys=[to_location_id], back_populates="directions_to")


class FacilityOccupancy(Base):
    __tablename__ = "facility_occupancy"

    occupancy_id = Column(String(50), primary_key=True)
    facility_id = Column(String(50), ForeignKey("facilities.facility_id"), nullable=False, index=True)
    facility_name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    terminal = Column(String(10), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    occupancy_count = Column(Integer, nullable=False)
    capacity = Column(Integer, nullable=False)
    occupancy_ratio = Column(Float, nullable=False)
    crowd_level = Column(String(50), nullable=False)  # low, medium, high

    # Relationships
    facility = relationship("Facility", back_populates="occupancies")


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    checkpoint = Column(String(100), nullable=False, index=True)  # Check-in, Security, etc.
    queue_length = Column(Integer, nullable=False)
    wait_time = Column(Float, nullable=False)
    congestion_level = Column(String(50), nullable=False)  # low, medium, high
    scenario_name = Column(String(100), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    predicted_wait_time = Column(Float, nullable=True)
    predicted_congestion = Column(String(50), nullable=True)
    predicted_delay = Column(Float, nullable=True)
    predicted_facility_utilization = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=False)
    model_version = Column(String(50), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # passenger, staff, admin
    full_name = Column(String(200), nullable=False)
    passenger_id = Column(String(50), ForeignKey("passengers.passenger_id"), nullable=True, index=True)

    # Relationships
    passenger = relationship("Passenger", back_populates="user")
    chat_logs = relationship("ChatLog", back_populates="user")


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    detected_intent = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="chat_logs")


class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(100), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    trained_at = Column(DateTime, default=func.now(), index=True)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
