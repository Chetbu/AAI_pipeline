import json
from pathlib import Path
script_name = Path(__file__).stem
current_dir = str(Path(__file__).parent)

# Load the JSON file
with open(current_dir + '/results-2026-04-08.json', 'r') as f:
    data = json.load(f)

# Save the indented version
with open(current_dir + '/indented_results-2026-04-08.json', 'w') as f:
    json.dump(data, f, indent=4)

print("Indented JSON saved to indented_results-2026-04-08.json")
