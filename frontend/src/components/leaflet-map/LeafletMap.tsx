import { MapContainer, TileLayer } from "react-leaflet";

interface LeafletMapProps {
  geoJsonLayers: JSX.Element[];
}

export const LeafletMap = ({ geoJsonLayers }: LeafletMapProps) => {
  return geoJsonLayers.length > 0 ? (
    <MapContainer
      center={[52.3676, 4.9041]}
      zoom={10}
      style={{ width: "50%", height: "600px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {geoJsonLayers}
    </MapContainer>
  ) : (
    <div>Loading map...</div>
  );
};
