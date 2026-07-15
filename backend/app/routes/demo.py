import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.demo_state import DemoState

router = APIRouter(prefix="/demo", tags=["Demo Mode"])

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))

class LoadScenarioResponse(BaseModel):
    status: str
    scenario_id: str
    preset_time: str
    message: str

@router.get("/manifest")
def get_demo_manifest():
    manifest_path = os.path.join(DATA_DIR, "demo_mode_manifest.json")
    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=404, detail="Demo manifest not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    return manifest

@router.post("/load-scenario/{scenario_id}", response_model=LoadScenarioResponse)
def load_demo_scenario(scenario_id: str):
    manifest_path = os.path.join(DATA_DIR, "demo_mode_manifest.json")
    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=404, detail="Demo manifest not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    scenarios = manifest.get("demo_mode", {}).get("scenarios", [])
    selected_scenario = None
    for s in scenarios:
        if s.get("id") == scenario_id:
            selected_scenario = s
            break
            
    if not selected_scenario:
        # Check if scenario_id is "reset" to turn off demo mode
        if scenario_id == "reset":
            DemoState.reset()
            return LoadScenarioResponse(
                status="reset",
                scenario_id="reset",
                preset_time="",
                message="Demo mode reset. App is running in live baseline time."
            )
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found in manifest")
        
    preset_time = selected_scenario.get("preset_time")
    
    # Set the global demo state
    DemoState.set_scenario(scenario_id, preset_time)
    
    # Customize scenario_name in DemoState to match simulated datasets
    # "evening_rush" -> scenario_name is "peak_holiday"
    # "weather_delay" -> scenario_name is "bad_weather"
    # "calm_morning" -> scenario_name is "normal_day"
    scenario_map = {
        "evening_rush": "peak_holiday",
        "weather_delay": "bad_weather",
        "calm_morning": "normal_day"
    }
    DemoState.scenario_name = scenario_map.get(scenario_id, "normal_day")
    
    return LoadScenarioResponse(
        status="success",
        scenario_id=scenario_id,
        preset_time=preset_time,
        message=f"Scenario '{selected_scenario.get('label')}' loaded successfully. Mock current time set to {preset_time}."
    )

@router.get("/status")
def get_demo_status():
    return {
        "scenario_id": DemoState.scenario_id or "reset",
        "scenario_name": DemoState.scenario_name or "normal_day",
        "current_time": DemoState.get_current_time().isoformat()
    }

