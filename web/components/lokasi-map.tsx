"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Leaflet nyari file ikon markernya lewat URL relatif ke bundle JS,
// yang gak match sama cara Next.js nge-bundle asset -- makanya ikon
// defaultnya suka ilang/pecah kalau dipakai langsung di Next.js.
// Solusinya: override manual pakai file yang ditaruh di public/leaflet/
// (3 file itu sudah aku siapin, tinggal taruh di public/leaflet/).
const kavlingIcon = new L.Icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function LokasiMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={kavlingIcon}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  );
}