const express = require("express");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// WFS Endpoint for layers
app.get("/wfs", async (req, res) => {
  const { request, typeName } = req.query;

  if (request !== "GetFeature") {
    return res.status(400).send("Invalid request");
  }

  const queries = {
    woonplaats: `
      SELECT id, name, ST_AsGeoJSON(geom) AS geometry
      FROM public.woonplaats;
    `,
    stedin_hoogspanningsstations: `
      SELECT hoogspa_id, ST_AsGeoJSON(geom) AS geometry
      FROM public.stedin_hoogspanningsstations;
    `,
  };

  const query = queries[typeName];
  if (!query) return res.status(400).send("Invalid typeName");

  try {
    const { rows } = await pool.query(query);
    const features = rows.map((row) => ({
      type: "Feature",
      properties: {
        id: typeName === "woonplaats" ? row.id : row.hoogspa_id,
        woonplaats: typeName === "woonplaats" ? row.name : undefined,
      },
      geometry: JSON.parse(row.geometry),
    }));

    res.json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
