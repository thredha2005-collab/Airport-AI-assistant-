from datetime import datetime

class DemoState:
    is_demo_active = False
    mock_current_time = None
    scenario_name = None
    scenario_id = None

    @classmethod
    def get_current_time(cls) -> datetime:
        """
        Returns the mock current time if demo mode is active;
        otherwise, returns the actual current UTC time (fallback to June 23, 2026 for consistency with datasets).
        """
        if cls.is_demo_active and cls.mock_current_time:
            return cls.mock_current_time
        # For this project, since raw datasets are static and centered around June 2026,
        # we default to 2026-06-23 12:00:00 as the baseline current time if not in demo mode.
        return datetime(2026, 6, 23, 12, 0, 0)

    @classmethod
    def set_scenario(cls, scenario_id: str, preset_time_str: str):
        cls.is_demo_active = True
        cls.scenario_id = scenario_id
        cls.scenario_name = scenario_id
        # Parse datetime from string (e.g. 2026-06-22T18:30:00)
        cls.mock_current_time = datetime.fromisoformat(preset_time_str)

    @classmethod
    def reset(cls):
        cls.is_demo_active = False
        cls.mock_current_time = None
        cls.scenario_name = None
        cls.scenario_id = None
