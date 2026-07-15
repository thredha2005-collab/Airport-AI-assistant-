import os
import pandas as pd
import json

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_FILES = [
    "passengers.csv",
    "flights.csv",
    "facilities.csv",
    "parking.csv",
    "weather.csv",
    "directions.csv",
    "facility_occupancy.csv"
]

print("Starting Phase 1 Verification...")

# 1. Load CSVs
for csv_file in CSV_FILES:
    path = os.path.join(DATA_DIR, csv_file)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing CSV file: {csv_file}")
    df = pd.read_csv(path)
    print(f"[OK] Loaded {csv_file} successfully. Shape: {df.shape}")

# 2. Load manifest
manifest_path = os.path.join(DATA_DIR, "demo_mode_manifest.json")
if not os.path.exists(manifest_path):
    raise FileNotFoundError("Missing demo_mode_manifest.json")
with open(manifest_path, "r", encoding="utf-8") as f:
    manifest = json.load(f)
print("[OK] Loaded demo_mode_manifest.json successfully.")

# 3. Load credentials & dictionary
for doc in ["test_credentials.md", "data_dictionary.md"]:
    doc_path = os.path.join(DATA_DIR, doc)
    if not os.path.exists(doc_path):
         raise FileNotFoundError(f"Missing doc: {doc}")
    with open(doc_path, "r", encoding="utf-8") as f:
         content = f.read()
    if not content.strip():
         raise ValueError(f"{doc} is empty")
    print(f"[OK] Verified {doc} existence and content size: {len(content)} bytes")

print("\nAll Phase 1 files loaded successfully without errors!")
