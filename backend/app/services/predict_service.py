import os
import sys
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import joblib

# Ensure the backend directory is in the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.models.models import Flight, Facility, Weather

# Cache for loaded models
_models = {}
MODEL_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "models", "saved_models")

def get_model(model_name):
    """
    Lazy loads and caches scikit-learn models.
    """
    if model_name not in _models:
        model_path = os.path.join(MODEL_DIR, f"{model_name}.joblib")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file {model_name}.joblib not found at {model_path}. Run training first.")
        _models[model_name] = joblib.load(model_path)
    return _models[model_name]

def _get_db_weather(session, timestamp):
    """
    Helper to fetch the closest weather record in the database for a given timestamp.
    """
    if not session:
        return {
            "weather_condition": "clear",
            "precipitation_mm": 0.0,
            "wind_speed_kmph": 10.0,
            "visibility_km": 10.0
        }
    
    # Query weather closest to timestamp
    closest = session.query(Weather).order_by(
        Weather.timestamp.desc()
    ).filter(Weather.timestamp <= timestamp).first()
    
    if not closest:
        closest = session.query(Weather).order_by(
            Weather.timestamp.asc()
        ).filter(Weather.timestamp >= timestamp).first()
        
    if closest:
        return {
            "weather_condition": closest.condition,
            "precipitation_mm": closest.precipitation_mm,
            "wind_speed_kmph": closest.wind_speed_kmph,
            "visibility_km": closest.visibility_km
        }
        
    return {
        "weather_condition": "clear",
        "precipitation_mm": 0.0,
        "wind_speed_kmph": 10.0,
        "visibility_km": 10.0
    }

def _get_flight_volume(session, terminal, timestamp, window_hours=1):
    """
    Helper to count flights in terminal departing within timestamp +/- window_hours.
    """
    if not session:
        return 2  # default fallback
        
    start = timestamp - timedelta(hours=window_hours)
    end = timestamp + timedelta(hours=window_hours)
    
    count = session.query(Flight).filter(
        Flight.terminal == terminal,
        Flight.scheduled_departure >= start,
        Flight.scheduled_departure <= end
    ).count()
    return count

def _get_nearby_flight_volume(session, terminal, timestamp):
    """
    Helper to count flights departing in terminal from timestamp - 1h to timestamp + 2h.
    """
    if not session:
        return 4  # default fallback
        
    start = timestamp - timedelta(hours=1)
    end = timestamp + timedelta(hours=2)
    
    count = session.query(Flight).filter(
        Flight.terminal == terminal,
        Flight.scheduled_departure >= start,
        Flight.scheduled_departure <= end
    ).count()
    return count

def predict_wait_time(terminal, stage, timestamp, active_counters=None, weather_condition=None, holiday_flag=None, flight_volume=None, session=None):
    """
    Predicts the expected wait time (minutes) at a terminal checkpoint stage.
    """
    # 1. Fill default features
    hour_of_day = timestamp.hour
    day_of_week = timestamp.weekday()
    
    if holiday_flag is None:
        holiday_flag = 0  # Default to normal day
        
    if active_counters is None:
        if stage == 'Check-in':
            active_counters = 8
        elif stage == 'Security Screening':
            active_counters = 3
        elif stage == 'Immigration Check':
            active_counters = 5 if terminal == 'T2' else 1
        else:
            active_counters = 2
            
    if weather_condition is None:
        w_info = _get_db_weather(session, timestamp)
        weather_condition = w_info["weather_condition"]
        
    if flight_volume is None:
        flight_volume = _get_flight_volume(session, terminal, timestamp, window_hours=1)
        
    # 2. Prepare feature dataframe
    features = pd.DataFrame([{
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "stage": stage,
        "terminal": terminal,
        "active_counters": active_counters,
        "flight_volume": flight_volume,
        "weather_condition": weather_condition,
        "holiday_flag": holiday_flag
    }])
    
    # 3. Predict
    model = get_model("wait_time_model")
    prediction = model.predict(features)[0]
    return max(0.0, float(prediction))

def predict_congestion(terminal, stage, timestamp, queue_length, active_counters=None, weather_condition=None, holiday_flag=None, flight_volume=None, session=None):
    """
    Predicts the congestion level (low, medium, high) for a terminal checkpoint stage.
    """
    hour_of_day = timestamp.hour
    day_of_week = timestamp.weekday()
    
    if holiday_flag is None:
        holiday_flag = 0
        
    if active_counters is None:
        if stage == 'Check-in':
            active_counters = 8
        elif stage == 'Security Screening':
            active_counters = 3
        elif stage == 'Immigration Check':
            active_counters = 5 if terminal == 'T2' else 1
        else:
            active_counters = 2
            
    if weather_condition is None:
        w_info = _get_db_weather(session, timestamp)
        weather_condition = w_info["weather_condition"]
        
    if flight_volume is None:
        flight_volume = _get_flight_volume(session, terminal, timestamp, window_hours=1)
        
    # Prepare feature dataframe
    features = pd.DataFrame([{
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "stage": stage,
        "terminal": terminal,
        "active_counters": active_counters,
        "flight_volume": flight_volume,
        "weather_condition": weather_condition,
        "holiday_flag": holiday_flag,
        "queue_length": queue_length
    }])
    
    model = get_model("congestion_model")
    prediction = model.predict(features)[0]
    return str(prediction)

def predict_delay(airline, scheduled_departure, weather_condition=None, precipitation_mm=None, wind_speed_kmph=None, visibility_km=None, session=None):
    """
    Predicts flight delay minutes based on airline and weather conditions.
    """
    hour_of_day = scheduled_departure.hour
    day_of_week = scheduled_departure.weekday()
    
    if weather_condition is None or precipitation_mm is None or wind_speed_kmph is None or visibility_km is None:
        w_info = _get_db_weather(session, scheduled_departure)
        weather_condition = weather_condition or w_info["weather_condition"]
        precipitation_mm = precipitation_mm if precipitation_mm is not None else w_info["precipitation_mm"]
        wind_speed_kmph = wind_speed_kmph if wind_speed_kmph is not None else w_info["wind_speed_kmph"]
        visibility_km = visibility_km if visibility_km is not None else w_info["visibility_km"]
        
    # Prepare feature dataframe
    features = pd.DataFrame([{
        "weather_condition": weather_condition,
        "precipitation_mm": precipitation_mm,
        "wind_speed_kmph": wind_speed_kmph,
        "visibility_km": visibility_km,
        "airline": airline,
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week
    }])
    
    model = get_model("delay_model")
    prediction = model.predict(features)[0]
    return max(0.0, float(prediction))

def predict_facility_utilization(facility_id_or_category, timestamp, terminal=None, nearby_flight_volume=None, weather_condition=None, session=None):
    """
    Predicts occupancy ratio and crowd level for any facility.
    Supports either facility_id lookup or broad category & terminal lookup.
    """
    category = facility_id_or_category
    
    # 1. Lookup facility details from database if it's an ID
    if session and facility_id_or_category.startswith("FAC"):
        fac = session.query(Facility).filter(Facility.facility_id == facility_id_or_category).first()
        if fac:
            category = fac.category
            terminal = fac.terminal
            
    # Fallback/defaults
    if terminal is None:
        terminal = "T1"
        
    hour_of_day = timestamp.hour
    day_of_week = timestamp.weekday()
    
    if weather_condition is None:
        w_info = _get_db_weather(session, timestamp)
        weather_condition = w_info["weather_condition"]
        
    if nearby_flight_volume is None:
        nearby_flight_volume = _get_nearby_flight_volume(session, terminal, timestamp)
        
    # Prepare feature dataframe
    features = pd.DataFrame([{
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "category": category,
        "terminal": terminal,
        "nearby_flight_volume": nearby_flight_volume,
        "weather_condition": weather_condition
    }])
    
    ratio_model = get_model("facility_utilization_ratio_model")
    crowd_model = get_model("facility_utilization_crowd_model")
    
    pred_ratio = ratio_model.predict(features)[0]
    pred_crowd = crowd_model.predict(features)[0]
    
    return {
        "occupancy_ratio": round(max(0.0, min(1.0, float(pred_ratio))), 2),
        "crowd_level": str(pred_crowd)
    }
