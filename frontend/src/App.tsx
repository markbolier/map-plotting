import { useEffect } from "react";
import L, { Map } from "leaflet";
import maplibregl from "maplibre-gl";

function App() {
  useEffect(() => {
    const initMap = (mapId: string, center: [number, number], zoom: number) => {
      const map = L.map(mapId).setView(center, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      return map;
    };

    const addGeoJSONLayerLeaflet = (
      map: Map,
      url: string,
      layerOptions: any
    ) => {
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          return response.json();
        })
        .then((data) => {
          if (data.features.length === 0) {
            console.log(`No features found for ${layerOptions.name}.`);
            return;
          }
          L.geoJSON(data, layerOptions).addTo(map);
        })
        .catch((error) =>
          console.error(`Error fetching ${layerOptions.name} data:`, error)
        );
    };

    const addGeoJSONLayerMapLibre = (
      map: maplibregl.Map,
      url: string,
      sourceName: string,
      layerId: string,
      layerOptions: any
    ) => {
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          return response.json();
        })
        .then((data) => {
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
        })
        .catch((error) =>
          console.error(
            `Error fetching or processing ${layerOptions.name} data:`,
            error
          )
        );
    };

    const mapLeaflet = initMap("map-leaflet", [52.3676, 4.9041], 10);

    // Woonplaats Layer
    addGeoJSONLayerLeaflet(
      mapLeaflet,
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

    // Stedin Hoogspanningsstations Layer
    addGeoJSONLayerLeaflet(
      mapLeaflet,
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

    // Add Riool- en Milieumanagementvoorzieningen Layer for Leaflet
    addGeoJSONLayerLeaflet(
      mapLeaflet,
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
      mapLeaflet.remove();
      maplibreMap.remove();
    };
  }, []);

  return (
    <div
      className="map-container"
      style={{
        display: "flex",
        height: "600px",
        justifyContent: "space-between",
      }}
    >
      <div id="map-leaflet" style={{ width: "48%", height: "600px" }}></div>
      <div id="map-maplibre" style={{ width: "48%", height: "600px" }}></div>
    </div>
  );
}

export default App;
