const express = require("express");
const path = require("path");
require("dotenv").config({
  override: true,
  path: path.join(__dirname, ".env"),
});
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// WFS Endpoint
app.get("/wfs", async (req, res) => {
  const { request, typeName } = req.query;

  if (request === "GetFeature" && typeName === "woonplaats") {
    try {
      const query = `
        SELECT id, name, ST_AsGeoJSON(geom) AS geometry
        FROM public.woonplaats;
      `;
      const { rows } = await pool.query(query);

      const bpfResponse = {
        type: "FeatureCollection",
        features: rows.map((row) => ({
          type: "Feature",
          properties: {
            id: row.id,
            woonplaats: row.name,
          },
          geometry: JSON.parse(row.geometry), // Parse the GeoJSON string
        })),
      };

      res.setHeader("Content-Type", "application/json");
      res.json(bpfResponse);
    } catch (error) {
      console.error("Error querying database:", error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(400).send("Invalid request");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
