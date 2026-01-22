import os
import pandas as pd
import json

# Ensure the output folder exists.
os.makedirs("public", exist_ok=True)

# Load the source CSV (update the path if needed).
df = pd.read_csv(
    r"c:\Users\jensy\Documents\BCC\USDA\Bodega Project\Website\Fresh Produce Bodegas Master.csv"
)

features = []
for _, row in df.iterrows():
    # Split the coordinate string and convert to floats.
    name = row["Store Name"]
    address = row["Address"]
    lon, lat = map(float, row["Location"].strip("()").split())
    features.append(
        {
            "type": "Feature",
            "properties": {"name": name, "address": address, "type": "produce"},
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
        }
    )

geojson = {"type": "FeatureCollection", "features": features}

# Write the GeoJSON output.
with open("public/produce.geojson", "w") as f:
    json.dump(geojson, f, indent=2)

print("public/produce.geojson")
