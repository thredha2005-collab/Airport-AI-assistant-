import os
import sys
import json
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import joblib

# Ensure the backend directory is in the Python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.models.models import Flight, Passenger, Facility, FacilityOccupancy, Weather, SimulationResult, ModelMetric

# Machine Learning imports
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, accuracy_score, f1_score

# Directory to save models
MODEL_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), "app", "models", "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

def load_data(session):
    print("Loading data from database...")
    sim_results = pd.read_sql(session.query(SimulationResult).statement, session.bind)
    flights = pd.read_sql(session.query(Flight).statement, session.bind)
    weather = pd.read_sql(session.query(Weather).statement, session.bind)
    facilities = pd.read_sql(session.query(Facility).statement, session.bind)
    facility_occ = pd.read_sql(session.query(FacilityOccupancy).statement, session.bind)
    
    print(f"Loaded {len(sim_results)} simulation results.")
    print(f"Loaded {len(flights)} flights.")
    print(f"Loaded {len(weather)} weather records.")
    print(f"Loaded {len(facility_occ)} facility occupancy records.")
    
    return sim_results, flights, weather, facilities, facility_occ

def get_closest_weather(df, weather_df):
    """
    Asynchronously joins weather data to the main dataframe based on the nearest timestamp.
    """
    df = df.sort_values("timestamp")
    weather_df = weather_df.sort_values("timestamp")
    
    # merge_asof requires a tolerance or matches the nearest
    merged = pd.merge_asof(
        df, 
        weather_df[['timestamp', 'condition', 'precipitation_mm', 'wind_speed_kmph', 'visibility_km']], 
        on="timestamp", 
        direction="nearest"
    )
    return merged

def log_metrics(session, model_name, version, metrics):
    print(f"Logging metrics for {model_name}...")
    for name, val in metrics.items():
        m = ModelMetric(
            model_name=model_name,
            version=version,
            trained_at=datetime.utcnow(),
            metric_name=name,
            metric_value=float(val)
        )
        session.add(m)
    session.commit()

def train_wait_time_model(session, sim_df, flights_df, weather_df):
    print("\n--- Training Wait-Time Regressor ---")
    
    # 1. Feature Engineering
    sim_df = get_closest_weather(sim_df, weather_df)
    
    # Parse checkpoint name to get terminal and stage
    # Checkpoint format is "T1 Check-in", "T1 Security Screening", etc.
    sim_df['terminal'] = sim_df['checkpoint'].apply(lambda x: x.split(' ')[0])
    sim_df['stage'] = sim_df['checkpoint'].apply(lambda x: ' '.join(x.split(' ')[1:]))
    
    sim_df['hour_of_day'] = sim_df['timestamp'].dt.hour
    sim_df['day_of_week'] = sim_df['timestamp'].dt.weekday
    sim_df['holiday_flag'] = sim_df['scenario_name'].apply(lambda x: 1 if x == 'peak_holiday' else 0)
    
    # Estimate active counters based on default capacities
    def get_counters(row):
        stage = row['stage']
        term = row['terminal']
        if stage == 'Check-in':
            return 8
        elif stage == 'Security Screening':
            return 3
        elif stage == 'Immigration Check':
            return 5 if term == 'T2' else 1
        else: # Boarding Gate
            return 2
    sim_df['active_counters'] = sim_df.apply(get_counters, axis=1)
    
    # Calculate flight volume: number of flights departing T-1h to T+1h in the same terminal
    flight_times = flights_df['scheduled_departure'].values
    flight_terminals = flights_df['terminal'].values
    
    def get_flight_volume(row):
        ts = row['timestamp']
        term = row['terminal']
        start = ts - timedelta(hours=1)
        end = ts + timedelta(hours=1)
        mask = (flight_terminals == term) & (flight_times >= np.datetime64(start)) & (flight_times <= np.datetime64(end))
        return np.sum(mask)
    
    sim_df['flight_volume'] = sim_df.apply(get_flight_volume, axis=1)
    
    # Rename columns to match model expectations
    sim_df = sim_df.rename(columns={'condition': 'weather_condition'})
    
    # Define features and target
    features = ['hour_of_day', 'day_of_week', 'stage', 'terminal', 'active_counters', 'flight_volume', 'weather_condition', 'holiday_flag']
    X = sim_df[features]
    y = sim_df['wait_time']
    
    # Time-based split (80% train, 20% test)
    split_idx = int(len(sim_df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # Build Pipeline
    categorical_features = ['stage', 'terminal', 'weather_condition']
    numerical_features = ['hour_of_day', 'day_of_week', 'active_counters', 'flight_volume', 'holiday_flag']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    # Compare RandomForest vs GradientBoosting
    rf_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    gb_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', GradientBoostingRegressor(n_estimators=100, random_state=42))
    ])
    
    # Train and evaluate RandomForest
    rf_pipeline.fit(X_train, y_train)
    rf_pred = rf_pipeline.predict(X_test)
    rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
    rf_mae = mean_absolute_error(y_test, rf_pred)
    print(f"Random Forest - RMSE: {rf_rmse:.4f}, MAE: {rf_mae:.4f}")
    
    # Train and evaluate GradientBoosting
    gb_pipeline.fit(X_train, y_train)
    gb_pred = gb_pipeline.predict(X_test)
    gb_rmse = np.sqrt(mean_squared_error(y_test, gb_pred))
    gb_mae = mean_absolute_error(y_test, gb_pred)
    print(f"Gradient Boosting - RMSE: {gb_rmse:.4f}, MAE: {gb_mae:.4f}")
    
    # Choose best model (GB vs RF)
    best_pipeline = gb_pipeline if gb_rmse < rf_rmse else rf_pipeline
    best_rmse = min(gb_rmse, rf_rmse)
    best_mae = gb_mae if gb_rmse < rf_rmse else rf_mae
    model_name = "GradientBoostingRegressor" if gb_rmse < rf_rmse else "RandomForestRegressor"
    
    print(f"Selecting {model_name} as the best model.")
    
    # Save model
    model_path = os.path.join(MODEL_DIR, "wait_time_model.joblib")
    joblib.dump(best_pipeline, model_path)
    print(f"Saved Wait-Time model to {model_path}")
    
    # Log metrics
    metrics = {"rmse": best_rmse, "mae": best_mae}
    log_metrics(session, "wait_time_model", "1.0", metrics)
    return metrics

def train_congestion_model(session, sim_df, flights_df, weather_df):
    print("\n--- Training Congestion Classifier ---")
    
    # 1. Feature Engineering
    sim_df = get_closest_weather(sim_df, weather_df)
    
    sim_df['terminal'] = sim_df['checkpoint'].apply(lambda x: x.split(' ')[0])
    sim_df['stage'] = sim_df['checkpoint'].apply(lambda x: ' '.join(x.split(' ')[1:]))
    
    sim_df['hour_of_day'] = sim_df['timestamp'].dt.hour
    sim_df['day_of_week'] = sim_df['timestamp'].dt.weekday
    sim_df['holiday_flag'] = sim_df['scenario_name'].apply(lambda x: 1 if x == 'peak_holiday' else 0)
    
    def get_counters(row):
        stage = row['stage']
        term = row['terminal']
        if stage == 'Check-in':
            return 8
        elif stage == 'Security Screening':
            return 3
        elif stage == 'Immigration Check':
            return 5 if term == 'T2' else 1
        else:
            return 2
    sim_df['active_counters'] = sim_df.apply(get_counters, axis=1)
    
    flight_times = flights_df['scheduled_departure'].values
    flight_terminals = flights_df['terminal'].values
    
    def get_flight_volume(row):
        ts = row['timestamp']
        term = row['terminal']
        start = ts - timedelta(hours=1)
        end = ts + timedelta(hours=1)
        mask = (flight_terminals == term) & (flight_times >= np.datetime64(start)) & (flight_times <= np.datetime64(end))
        return np.sum(mask)
    
    sim_df['flight_volume'] = sim_df.apply(get_flight_volume, axis=1)
    sim_df = sim_df.rename(columns={'condition': 'weather_condition'})
    
    # Define features and target
    features = ['hour_of_day', 'day_of_week', 'stage', 'terminal', 'active_counters', 'flight_volume', 'weather_condition', 'holiday_flag', 'queue_length']
    X = sim_df[features]
    y = sim_df['congestion_level']
    
    # Time-based split (80% train, 20% test)
    split_idx = int(len(sim_df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # Build Pipeline
    categorical_features = ['stage', 'terminal', 'weather_condition']
    numerical_features = ['hour_of_day', 'day_of_week', 'active_counters', 'flight_volume', 'holiday_flag', 'queue_length']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    pipeline.fit(X_train, y_train)
    pred = pipeline.predict(X_test)
    
    accuracy = accuracy_score(y_test, pred)
    f1 = f1_score(y_test, pred, average='weighted')
    print(f"Congestion Classifier - Accuracy: {accuracy:.4f}, Weighted F1: {f1:.4f}")
    
    # Save model
    model_path = os.path.join(MODEL_DIR, "congestion_model.joblib")
    joblib.dump(pipeline, model_path)
    print(f"Saved Congestion model to {model_path}")
    
    # Log metrics
    metrics = {"accuracy": accuracy, "f1_score": f1}
    log_metrics(session, "congestion_model", "1.0", metrics)
    return metrics

def train_delay_model(session, flights_df, weather_df):
    print("\n--- Training Delay Predictor ---")
    
    # 1. Feature Engineering
    # Map weather to flight scheduled_departure
    flights_df = flights_df.rename(columns={'scheduled_departure': 'timestamp'})
    flights_df = get_closest_weather(flights_df, weather_df)
    flights_df = flights_df.rename(columns={'timestamp': 'scheduled_departure', 'condition': 'weather_condition'})
    
    flights_df['hour_of_day'] = flights_df['scheduled_departure'].dt.hour
    flights_df['day_of_week'] = flights_df['scheduled_departure'].dt.weekday
    
    # Fill NaN values
    flights_df['delay_minutes'] = flights_df['delay_minutes'].fillna(0.0)
    flights_df['precipitation_mm'] = flights_df['precipitation_mm'].fillna(0.0)
    flights_df['wind_speed_kmph'] = flights_df['wind_speed_kmph'].fillna(10.0)
    flights_df['visibility_km'] = flights_df['visibility_km'].fillna(10.0)
    flights_df['weather_condition'] = flights_df['weather_condition'].fillna('clear')
    
    # Define features and target
    features = ['weather_condition', 'precipitation_mm', 'wind_speed_kmph', 'visibility_km', 'airline', 'hour_of_day', 'day_of_week']
    X = flights_df[features]
    y = flights_df['delay_minutes']
    
    # Time-based split (since flights are chronologically sorted)
    split_idx = int(len(flights_df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # Build Pipeline
    categorical_features = ['weather_condition', 'airline']
    numerical_features = ['precipitation_mm', 'wind_speed_kmph', 'visibility_km', 'hour_of_day', 'day_of_week']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    pipeline.fit(X_train, y_train)
    pred = pipeline.predict(X_test)
    
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    mae = mean_absolute_error(y_test, pred)
    print(f"Delay Predictor - RMSE: {rmse:.4f}, MAE: {mae:.4f}")
    
    # Save model
    model_path = os.path.join(MODEL_DIR, "delay_model.joblib")
    joblib.dump(pipeline, model_path)
    print(f"Saved Delay model to {model_path}")
    
    # Log metrics
    metrics = {"rmse": rmse, "mae": mae}
    log_metrics(session, "delay_model", "1.0", metrics)
    return metrics

def train_facility_utilization_model(session, facility_occ_df, flights_df, weather_df):
    print("\n--- Training Facility Utilization Models ---")
    
    # 1. Feature Engineering
    facility_occ_df = get_closest_weather(facility_occ_df, weather_df)
    facility_occ_df = facility_occ_df.rename(columns={'condition': 'weather_condition'})
    
    facility_occ_df['hour_of_day'] = facility_occ_df['timestamp'].dt.hour
    facility_occ_df['day_of_week'] = facility_occ_df['timestamp'].dt.weekday
    
    # Calculate flight volume: flights departing terminal T-1h to T+2h
    flight_times = flights_df['scheduled_departure'].values
    flight_terminals = flights_df['terminal'].values
    
    def get_nearby_flight_volume(row):
        ts = row['timestamp']
        term = row['terminal']
        start = ts - timedelta(hours=1)
        end = ts + timedelta(hours=2)
        mask = (flight_terminals == term) & (flight_times >= np.datetime64(start)) & (flight_times <= np.datetime64(end))
        return np.sum(mask)
    
    facility_occ_df['nearby_flight_volume'] = facility_occ_df.apply(get_nearby_flight_volume, axis=1)
    
    # Define features
    features = ['hour_of_day', 'day_of_week', 'category', 'terminal', 'nearby_flight_volume', 'weather_condition']
    X = facility_occ_df[features]
    
    # Prepare targets
    y_ratio = facility_occ_df['occupancy_ratio']
    y_crowd = facility_occ_df['crowd_level']
    
    # Time-based split (80% train, 20% test)
    split_idx = int(len(facility_occ_df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_ratio_train, y_ratio_test = y_ratio.iloc[:split_idx], y_ratio.iloc[split_idx:]
    y_crowd_train, y_crowd_test = y_crowd.iloc[:split_idx], y_crowd.iloc[split_idx:]
    
    # Pipelines
    categorical_features = ['category', 'terminal', 'weather_condition']
    numerical_features = ['hour_of_day', 'day_of_week', 'nearby_flight_volume']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
    
    # 1. Regressor for occupancy ratio
    reg_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    reg_pipeline.fit(X_train, y_ratio_train)
    reg_pred = reg_pipeline.predict(X_test)
    reg_rmse = np.sqrt(mean_squared_error(y_ratio_test, reg_pred))
    reg_mae = mean_absolute_error(y_ratio_test, reg_pred)
    print(f"Facility Occupancy Ratio Regressor - RMSE: {reg_rmse:.4f}, MAE: {reg_mae:.4f}")
    
    # 2. Classifier for crowd level
    clf_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    clf_pipeline.fit(X_train, y_crowd_train)
    clf_pred = clf_pipeline.predict(X_test)
    clf_accuracy = accuracy_score(y_crowd_test, clf_pred)
    clf_f1 = f1_score(y_crowd_test, clf_pred, average='weighted')
    print(f"Facility Crowd Level Classifier - Accuracy: {clf_accuracy:.4f}, Weighted F1: {clf_f1:.4f}")
    
    # Save models
    reg_path = os.path.join(MODEL_DIR, "facility_utilization_ratio_model.joblib")
    clf_path = os.path.join(MODEL_DIR, "facility_utilization_crowd_model.joblib")
    
    joblib.dump(reg_pipeline, reg_path)
    joblib.dump(clf_pipeline, clf_path)
    print(f"Saved Facility Occupancy models to {MODEL_DIR}")
    
    # Log metrics
    log_metrics(session, "facility_utilization_ratio_model", "1.0", {"rmse": reg_rmse, "mae": reg_mae})
    log_metrics(session, "facility_utilization_crowd_model", "1.0", {"accuracy": clf_accuracy, "f1_score": clf_f1})
    
    return {"ratio_rmse": reg_rmse, "crowd_accuracy": clf_accuracy}

def main():
    db_url = os.getenv("DATABASE_SYNC_URL", "postgresql://postgres:qExTXiV6sGMAtc0b@127.0.0.1:5432/postgres")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    try:
        # Load datasets
        sim_df, flights_df, weather_df, facilities_df, facility_occ_df = load_data(session)
        
        # Train models
        train_wait_time_model(session, sim_df, flights_df, weather_df)
        train_congestion_model(session, sim_df, flights_df, weather_df)
        train_delay_model(session, flights_df, weather_df)
        train_facility_utilization_model(session, facility_occ_df, flights_df, weather_df)
        
        # Save metadata info
        metadata = {
            "training_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "success",
            "models": {
                "wait_time_model": "wait_time_model.joblib",
                "congestion_model": "congestion_model.joblib",
                "delay_model": "delay_model.joblib",
                "facility_utilization_ratio_model": "facility_utilization_ratio_model.joblib",
                "facility_utilization_crowd_model": "facility_utilization_crowd_model.joblib"
            }
        }
        with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
            json.dump(metadata, f, indent=4)
        print("\nAll models trained and metadata written successfully!")
        
    except Exception as e:
        session.rollback()
        print(f"Training failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    main()
