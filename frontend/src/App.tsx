import { GeoJSON } from "react-leaflet";
import { useEffect, useState } from "react";
import maplibregl from "maplibre-gl";

import { getGeoJSONData } from "./services/get-geojson-data";
import { LeafletMap } from "./components/leaflet-map/LeafletMap";
import { MapLibreMap } from "./components/maplibre-map/MapLibreMap";

function App() {
  const [geoJsonLayersLeaflet, setGeoJsonLayersLeaflet] = useState<
    JSX.Element[]
  >([]);

  useEffect(() => {
    const addGeoJSONLayerLeaflet = async (url: string, layerOptions: any) => {
      try {
        const data = await getGeoJSONData(url);
        if (data.features.length === 0) {
          console.log(`No features found for ${layerOptions.name}.`);
          return;
        }

        const geoJsonLayer = (
          <GeoJSON
            key={layerOptions.name}
            data={data}
            onEachFeature={layerOptions.onEachFeature}
            style={layerOptions.style}
          />
        );
        setGeoJsonLayersLeaflet((prev) => [...prev, geoJsonLayer]);
      } catch (error) {
        console.error(`Error fetching ${layerOptions.name} data:`, error);
      }
    };

    const addGeoJSONLayerMapLibre = async (
      map: maplibregl.Map,
      url: string,
      sourceName: string,
      layerId: string,
      layerOptions: any
    ) => {
      try {
        const data = await getGeoJSONData(url);
        if (!data.features || data.features.length === 0) {
          console.log(`No features found for ${layerOptions.name}.`);
          return;
        }

        map.addSource(sourceName, {
          type: "geojson",
          data: data,
        });

        map.addLayer({
          id: layerId,
          type: layerOptions.layerType,
          source: sourceName,
          paint: layerOptions.paint,
        });
      } catch (error) {
        console.error(
          `Error fetching or processing ${layerOptions.name} data:`,
          error
        );
      }
    };

    // Call addGeoJSONLayerLeaflet for each layer
    addGeoJSONLayerLeaflet(
      "http://localhost:3000/wfs?request=GetFeature&typeName=woonplaats",
      {
        name: "woonplaats",
        onEachFeature: (feature: any, layer: any) => {
          layer.bindPopup(
            `ID: ${feature.properties.id}<br>Woonplaats: ${feature.properties.woonplaats}`
          );
        },
      }
    );

    addGeoJSONLayerLeaflet(
      "http://localhost:3000/wfs?request=GetFeature&typeName=stedin_hoogspanningsstations",
      {
        name: "stedin",
        onEachFeature: (feature: any, layer: any) => {
          layer.bindPopup(`ID: ${feature.properties.hoogspa_id}`);
        },
        style: {
          color: "#ff0000",
          weight: 2,
          fillOpacity: 0.5,
        },
      }
    );

    addGeoJSONLayerLeaflet(
      "https://service.pdok.nl/rws/nutsdiensten-en-overheidsdiensten/riool-milieumanagementvoorzieningen/wfs/v1_0?request=GetFeature&service=WFS&version=1.1.0&outputFormat=application%2Fjson%3B%20subtype%3Dgeojson&typeName=nutsdiensten-en-overheidsdiensten:environmental_management_facility",
      {
        name: "riool_milieumanagementvoorzieningen",
        onEachFeature: (feature: any, layer: any) => {
          layer.bindPopup(
            `ID: ${feature.properties.id}<br>Type: ${feature.properties.type}`
          );
        },
        style: {
          color: "#00ff00",
          weight: 2,
          fillOpacity: 0.5,
        },
      }
    );

    const maplibreMap = new maplibregl.Map({
      container: "map-maplibre",
      style: "https://demotiles.maplibre.org/style.json",
      center: [4.9041, 52.3676],
      zoom: 9,
    });

    maplibreMap.on("load", () => {
      // Woonplaats Layer for MapLibre
      addGeoJSONLayerMapLibre(
        maplibreMap,
        "http://localhost:3000/wfs?request=GetFeature&typeName=woonplaats",
        "woonplaatsData",
        "woonplaatsLayer",
        {
          name: "woonplaats",
          layerType: "fill",
          paint: {
            "fill-color": "#ff0000",
            "fill-opacity": 0.5,
            "fill-outline-color": "#000000",
          },
          idProperty: "id",
        }
      );

      // Stedin Hoogspanningsstations Layer for MapLibre
      addGeoJSONLayerMapLibre(
        maplibreMap,
        "http://localhost:3000/wfs?request=GetFeature&typeName=stedin_hoogspanningsstations",
        "stedinData",
        "stedinLayer",
        {
          name: "stedin",
          layerType: "fill",
          paint: {
            "fill-color": "#FFFF00",
            "fill-opacity": 0.5,
            "fill-outline-color": "#FFFF00",
          },
          idProperty: "hoogspa_id",
        }
      );

      // Update the MapLibre layer addition for Riool layer
      addGeoJSONLayerMapLibre(
        maplibreMap,
        "https://service.pdok.nl/rws/nutsdiensten-en-overheidsdiensten/riool-milieumanagementvoorzieningen/wfs/v1_0?request=GetFeature&service=WFS&version=1.1.0&outputFormat=application%2Fjson%3B%20subtype%3Dgeojson&typeName=nutsdiensten-en-overheidsdiensten:environmental_management_facility",
        "rioolData",
        "rioolLayer",
        {
          name: "riool_milieumanagementvoorzieningen",
          layerType: "circle",
          paint: {
            "circle-color": "#00FF00",
            "circle-radius": 6,
            "circle-opacity": 0.8,
          },
          idProperty: "id",
        }
      );
    });

    return () => {
      maplibreMap.remove();
    };
  }, []);

  return (
    <div
      className="map-container"
      style={{
        display: "flex",
        gap: "20px",
        padding: "20px",
      }}
    >
      <LeafletMap geoJsonLayers={geoJsonLayersLeaflet} />
      <MapLibreMap />
    </div>
  );
}

export default App;
