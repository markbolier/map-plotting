# Using PDOK GeoJSON data for visualizing map layers

This project focuses on leveraging `GeoJSON` data from the `PDOK` (Publieke Dienstverlening Op de Kaart) service to build interactive map layers. The aim is to create one (or several) scripts that automate the process from data download through database management, and ultimately to data visualization. By leveraging `PDOK`'s `GeoJSON` data, the project will demonstrate how to efficiently handle geospatial information and use it to create meaningful visual representations.

## Get this repo up and running

Make sure these are all installed on your machine:

- Minikube
- PostgreSQL
- Python
- Helm

1. Spin up this Bitnami PostgreSQL database in your local minikube:

```
https://github.com/bitnami/charts/tree/main/bitnami/postgresql
```

2. Once the database is up and running in minikube, give it a port forward to expose the service to your localhost.

3. Retrieve the base64 password for your Bitnami database, decode it and store it inside `.env`:

```zsh
kubectl get secret --namespace ory bitnami-db-postgresql -o jsonpath="{.data.postgres-password}" | base64 -d
```

4. Store the PDOK and Stedin data in your database:

```zsh
python <script-you-want-to-execute>
```

5. Spin up the API & front-end and interact with the charts:

```zsh
npm run start
```

## Enabling PostGIS in your PostgreSQL database

You may need to enable the PostGIS extension in your PostgreSQL database. PostGIS provides the GEOMETRY type and other spatial functions.

Here’s how you can enable PostGIS:

Connect to your PostgreSQL database using psql or a database management tool. Run the following SQL command to create the PostGIS extension:

```sql
CREATE EXTENSION postgis;
```

If you are using a script to set up your database, you can add this command to your script before creating tables:

```python
enable_postgis_query = "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Handling coordinate systems

The `PDOK` (Publieke Dienstverlening Op de Kaart) platform provides geospatial data using various coordinate systems, which is crucial for ensuring compatibility with mapping libraries like Leaflet. PDOK data is typically served in the `RD New` (Rijksdriehoeksmeting) coordinate system, also known as `EPSG:28992`. However, for visualization in Leaflet, which by default uses the `WGS84` (EPSG:4326) system (latitude and longitude), it's often necessary to convert between these systems.

### Converting RD New to WGS84 Directly with PostGIS

When inserting `PDOK` data in the `RD New` (EPSG:28992) coordinate system into your `PostGIS` database, you can directly convert it to `WGS84` (EPSG:4326) using the `ST_Transform()` function.

Here’s an example query that inserts data and converts the geometry in one step:

```sql
INSERT INTO my_geospatial_table (name, geom)
VALUES (
    'Location Name',
    ST_Transform(
        ST_SetSRID(ST_MakePoint(155000, 463000), 28992), -- RD New coordinates
        4326  -- Convert to WGS84
    )
);
```

For `GeoJSON` data with `RD New` coordinates:

```sql
WITH geojson_data AS (
    SELECT ST_SetSRID(ST_GeomFromGeoJSON('{"type": "Point", "coordinates": [155000, 463000]}'), 28992) AS geom
)
INSERT INTO my_geospatial_table (name, geom)
SELECT 'Location Name', ST_Transform(geom, 4326) FROM geojson_data;
```

This method ensures your data is ready for tools like `Leaflet` in `WGS84` format during insertion.

### Integrating with Leaflet or MapLibre

Once you have converted `RD New` coordinates to `WGS84`, you can easily use them in `Leaflet` or `MapLibre`. Here's an example of how you would place a marker in `Leaflet` using the converted `latitude` and `longitude`:

```js
const leafletMap = L.map("map").setView([52.379189, 4.899431], 13);

// Add OpenStreetMap tiles as the base layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(leafletMap);

// Add a marker at the converted coordinates
L.marker([52.379189, 4.899431])
  .addTo(leafletMap)
  .bindPopup("A marker in Amsterdam!")
  .openPopup();
```

And here's how you would do this in `MapLibre`:

```js
const maplibreMap = new maplibregl.Map({
  container: "map-maplibre",
  style: "https://demotiles.maplibre.org/style.json",
  center: [4.9041, 52.3676],
  zoom: 9,
});

// Add a marker at the converted coordinates
new maplibregl.Marker()
  .setLngLat([52.379189, 4.899431])
  .addTo(maplibreMap)
  .setPopup(new maplibregl.Popup().setHTML("A marker in Amsterdam!"))
  .openPopup();
```

## Understanding XML, GML and PDOK's URL building

### Part 1 - The XML Structure

The `XML` format used by `PDOK` (Publieke Dienstverlening Op de Kaart) for its `WFS` (Web Feature Service) responses is based on the Geography Markup Language (`GML`). Here’s a brief overview of the `XML` structure:

1. **Root Element**: The root element of the `XML` response is typically `<gml:FeatureCollection>`. This element contains all the feature data.

```xml
<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml">
  <!-- Feature elements go here -->
</gml:FeatureCollection>
```

2. **Feature Elements**: Each geographic feature is encapsulated in a `<gml:featureMember>` element. This element contains one or more `<gml:Point>`, `<gml:Polygon>`, or other `GML` geometric elements, depending on the type of data.

```xml
<gml:featureMember>
  <gml:Point>
    <gml:pos>48.8566 2.3522</gml:pos>
  </gml:Point>
</gml:featureMember>
```

3. **Properties**: Each feature may include a `<gml:properties>` element that contains attributes of the feature. These are represented as key-value pairs.

```xml
    <gml:featureMember>
      <gml:Point>
        <gml:pos>48.8566 2.3522</gml:pos>
      </gml:Point>
      <gml:properties>
        <name>Paris</name>
        <description>Capital city of France</description>
      </gml:properties>
    </gml:featureMember>
```

### Part 2 - How PDOK builds the URL

The URL used to request data from `PDOK`’s `WFS` service follows a specific pattern. Here’s a breakdown of the URL components:

1. **Base URL**: This is the endpoint of the `PDOK` `WFS` service.

```
https://service.pdok.nl/lv/bag/wfs/v2_0
```

2. **Query Parameters**: These parameters specify the details of the request. They are appended to the base URL and include:

- `service`: Specifies the service type. For `WFS`, this is always `WFS`.
- `version`: Indicates the `WFS` version. The example uses `2.0.0`.
- `request`: Defines the type of request. For data retrieval, this is `GetFeature`.
- `typeName`: Specifies the type of features to retrieve. For example, `bag:woonplaats` refers to a particular type of geographic feature.
- `outputFormat`: Determines the format of the response. For `GeoJSON`, this is `application/json`.

Example URL:

```
https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&typeName=bag:woonplaats&outputFormat=application/json
```

### Part 3 - Differences between JSON and GML

- Data Format: `JSON` is text-based and uses key-value pairs, while `GML` is `XML`-based and uses a markup language structure.
- Purpose: `JSON` is a general-purpose data interchange format, while `GML` is specifically designed for geospatial data.
- Complexity: `JSON` is generally simpler and more compact compared to `XML`-based `GML`.
- Geospatial Support: `GML` provides comprehensive support for geospatial data, while `JSON` needs extensions like `GeoJSON` for similar functionality.

**Choosing Between JSON and GML**
Use `JSON` (or `GeoJSON`) if you need a lightweight, easy-to-use format for web applications or simple data interchange. Use `GML` if you require a detailed and standardized format for complex geospatial data and need compatibility with `GIS` systems.
