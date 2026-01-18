import json

# Read the JSON file
with open('mock-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Reorder new cars IDs from 1 to 12
for i, car in enumerate(data['cars'], start=1):
    car['id'] = i

# Keep used cars IDs as is (101-200)
# They are already in order

# Write back to file
with open('mock-data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Reordered {len(data['cars'])} new cars (IDs 1-{len(data['cars'])})")
print(f"Kept {len(data['usedCars'])} used cars (IDs 101-200)")
