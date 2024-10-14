import os
import psycopg2
import requests
import json
from dotenv import load_dotenv

load_dotenv()

db_params = {
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT'),
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD')
}

# SQL queries
DROP_TABLE_QUERY = "DROP TABLE IF EXISTS public.woonplaats;"
CREATE_TABLE_QUERY = """
CREATE TABLE public.woonplaats (
    id SERIAL PRIMARY KEY,
    name TEXT,
    geom GEOMETRY(Geometry, 4326)
);
"""
INSERT_QUERY = """
INSERT INTO public.woonplaats (name, geom)
VALUES (%s, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%s), 28992), 4326));
"""

response = requests.get(
    "https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&typeName=bag:woonplaats&outputFormat=application/json"
)

if response.status_code != 200:
    print("Error fetching data:", response.status_code)
    exit()

features = response.json().get('features', [])

try:
    with psycopg2.connect(**db_params) as conn:
        with conn.cursor() as cursor:
            cursor.execute(DROP_TABLE_QUERY)
            cursor.execute(CREATE_TABLE_QUERY)
            print("Table dropped and created successfully.")

            # Insert data
            for feature in features:
                name = feature['properties'].get('woonplaats', 'Unknown')
                geometry = feature.get('geometry')

                if geometry is None:
                    print(f"Warning: No geometry found for feature '{name}'. Skipping.")
                    continue

                geometry_json = json.dumps(geometry)
                try:
                    cursor.execute(INSERT_QUERY, (name, geometry_json))
                except Exception as e:
                    print(f"Error inserting feature '{name}': {e}")
                    conn.rollback()  # Rollback for this specific insert

            conn.commit()  # Commit all changes
            print("Data successfully inserted.")

except (psycopg2.Error, Exception) as e:
    print("Error:", e)
