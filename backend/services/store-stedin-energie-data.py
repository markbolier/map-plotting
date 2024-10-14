import os
import subprocess
import psycopg2
from dotenv import load_dotenv

load_dotenv()

host = os.getenv('DB_HOST')
port = os.getenv('DB_PORT')
dbname = os.getenv('DB_NAME')
user = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')

shapefile_path = "../assets/stedin/Hoogspanningsstations.shp"

table_name = "stedin_hoogspanningsstations"

def drop_table_if_exists(table, host, port, dbname, user, password):
    try:
        print(f"Dropping table '{table}' if it exists...")
        connection = psycopg2.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password
        )
        cursor = connection.cursor()
        
        drop_query = f"DROP TABLE IF EXISTS {table};"
        cursor.execute(drop_query)
        connection.commit()
        print(f"Table '{table}' dropped if it existed.")

        cursor.close()
        connection.close()
    except psycopg2.Error as e:
        print(f"Error dropping PostGIS table: {e}")
        exit(1)

def create_table(table, host, port, dbname, user, password):
    try:
        print(f"Creating table '{table}'...")
        connection = psycopg2.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password
        )
        cursor = connection.cursor()
        
        # Create the table with MultiPolygon geometry type
        create_query = f"""
        CREATE TABLE {table} (
            id SERIAL PRIMARY KEY,
            geom GEOMETRY(MultiPolygon, 4326)  -- Use 'geom' for compatibility
        );
        """
        cursor.execute(create_query)
        connection.commit()
        print(f"Table '{table}' created.")

        cursor.close()
        connection.close()
    except psycopg2.Error as e:
        print(f"Error creating PostGIS table: {e}")
        exit(1)

def load_shapefile_to_postgis(shapefile, table, host, port, dbname, user, password):
    try:
        print("Loading Shapefile into PostGIS...")
        command = [
            "ogr2ogr", 
            "-f", "PostgreSQL", 
            f"PG:host={host} port={port} dbname={dbname} user={user} password={password}",
            shapefile, 
            "-nln", table,  # Specify the table name
            "-t_srs", "EPSG:4326",  # Reproject to WGS84
            "-lco", "GEOMETRY_NAME=geom",  # Ensure this matches the table definition
            "-lco", "OVERWRITE=YES",  # Overwrite existing data
            "-nlt", "MULTIPOLYGON"  # Convert to MultiPolygon during loading
        ]
        subprocess.check_call(command)
        print("Shapefile loaded successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error loading Shapefile: {e}")
        exit(1)

def verify_data_in_postgis(table, host, port, dbname, user, password):
    try:
        print("Verifying data in PostGIS...")
        connection = psycopg2.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password
        )
        cursor = connection.cursor()
        
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        result = cursor.fetchone()
        print(f"Total rows in table '{table}': {result[0]}")

        cursor.close()
        connection.close()
    except psycopg2.Error as e:
        print(f"Error querying PostGIS: {e}")
        exit(1)

def main():
    drop_table_if_exists(table_name, host, port, dbname, user, password)
    create_table(table_name, host, port, dbname, user, password)
    load_shapefile_to_postgis(shapefile_path, table_name, host, port, dbname, user, password)
    verify_data_in_postgis(table_name, host, port, dbname, user, password)

if __name__ == "__main__":
    main()
