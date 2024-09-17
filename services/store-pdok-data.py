import os
import psycopg2
import requests
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
# enable_postgis_query = """
# DO $$
# BEGIN
#     IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
#         CREATE EXTENSION postgis;
#     END IF;
# END
# $$;
# """

create_table_query = """
CREATE TABLE IF NOT EXISTS woonplaats (
    id SERIAL PRIMARY KEY,
    name TEXT
);
"""

insert_query = """
INSERT INTO woonplaats (name)
VALUES (%s);
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
# Todo: Use python's with ... as syntax for this?
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

    # Enable PostGIS (do this later)
    # try:
    #     cursor.execute(enable_postgis_query)
    #     connection.commit()
    #     print("PostGIS extension enabled.")
    # except psycopg2.Error as e:
    #     print(f"Error enabling PostGIS: {e}")
    
    # # Create table
    cursor.execute(create_table_query)
    connection.commit()
    print("Table created or already exists.")

    # # Insert data
    for feature in features:
        try:
            name = feature['properties'].get('woonplaats', 'Unknown')
            cursor.execute(insert_query, (name,))
        except Exception as e:
            print(f"Error inserting feature: {e}")

    connection.commit()
    print("Data succesfully inserted.")

except psycopg2.Error as e:
    print("Database error:", e)

except Exception as e:
    print("General error:", e)

finally:
    # Ensure that the cursor and connection are closed
    if cursor:
        cursor.close()
    if connection:
        connection.close()
