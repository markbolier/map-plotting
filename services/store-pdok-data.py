import os
import psycopg2
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection parameters
host = os.getenv('DB_HOST')
port = os.getenv('DB_PORT')
dbname = os.getenv('DB_NAME')
user = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')

# SQL queries
drop_table_query = "DROP TABLE IF EXISTS public.woonplaats;"  # Query to drop the table if it exists
create_table_query = """
CREATE TABLE public.woonplaats (
    id SERIAL PRIMARY KEY,
    name TEXT,
    geom GEOMETRY(Geometry, 4326)  -- Store geometries in WGS84
);
"""
insert_query = """
INSERT INTO public.woonplaats (name, geom)
VALUES (%s, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%s), 28992), 4326));  -- Transform from EPSG:28992 to EPSG:4326
"""

# Fetch data from the URL
url = "https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&typeName=bag:woonplaats&outputFormat=application/json"
response = requests.get(url)

# Check for errors in response
if response.status_code != 200:
    print("Error fetching data:", response.status_code)
    exit()

data = response.json()
features = data.get('features', [])

# Connect to PostgreSQL and execute queries
connection = None
cursor = None

try:
    connection = psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=password
    )
    cursor = connection.cursor()
    
    # Drop the table if it exists
    cursor.execute(drop_table_query)
    connection.commit()
    print("Table dropped successfully.")

    # Create table
    cursor.execute(create_table_query)
    connection.commit()
    print("Table created successfully.")

    # Insert data
    for feature in features:
        try:
            # Get 'name' and 'geometry'
            name = feature['properties'].get('woonplaats', 'Unknown')
            geometry = feature.get('geometry')

            # Check if geometry is valid
            if geometry is None:
                print(f"Warning: No geometry found for feature with name '{name}'. Skipping this feature.")
                continue  # Skip to the next feature

            # Convert the geometry dictionary to a valid GeoJSON string
            geometry_json = json.dumps(geometry)

            # Insert name and geometry into the table
            cursor.execute(insert_query, (name, geometry_json))
        
        except Exception as e:
            print(f"Error inserting feature '{name}': {e}")
            connection.rollback()  # Rollback for this specific insert

    connection.commit()
    print("Data successfully inserted.")

except psycopg2.Error as e:
    print("Database error:", e)

except Exception as e:
    print("General error:", e)

# Ensure that the cursor and connection are closed
finally:
    if cursor:
        cursor.close()
    if connection:
        connection.close()
