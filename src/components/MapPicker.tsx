// components/MapPicker.tsx
"use client";

import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { useCallback, useRef, useState } from "react";

type LocationData = {
    lat: number;
    lng: number;
    formattedAddress?: string;
    placeId?: string;
    components?: Record<string, string>;
};

const containerStyle = { width: "100%", height: "520px" };
const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center (change as you like)

export default function MapPicker({ onSelect }: { onSelect?: (data: LocationData) => void }) {
    const [marker, setMarker] = useState<LocationData | null>(null);
    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
        libraries: ["places"],
    });

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarker({ lat, lng });
        reverseGeocode(lat, lng);
    }, []);

    const reverseGeocode = (lat: number, lng: number) => {
        if (!window.google || !window.google.maps) {
            setLocationData({ lat, lng });
            return;
        }

        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat, lng };

        geocoder.geocode({ location: latlng }, (results, status) => {
            if (status === "OK" && results && results[0]) {
                const res = results[0];
                const formattedAddress = res.formatted_address;
                const placeId = res.place_id;
                const components = parseAddressComponents(res.address_components || []);
                const data = { lat, lng, formattedAddress, placeId, components };
                setLocationData(data);
                if (onSelect) onSelect(data);
            } else {
                setLocationData({ lat, lng });
            }
        });
    };

    const parseAddressComponents = (address_components: google.maps.GeocoderAddressComponent[]) => {
        const out: Record<string, string> = {};
        address_components.forEach((comp) => {
            comp.types.forEach((t) => {
                out[t] = comp.long_name;
            });
        });

        return {
            street_number: out["street_number"] || "",
            route: out["route"] || "",
            locality: out["locality"] || out["sublocality"] || "",
            administrative_area_level_1: out["administrative_area_level_1"] || "",
            administrative_area_level_2: out["administrative_area_level_2"] || "",
            country: out["country"] || "",
            postal_code: out["postal_code"] || "",
            ...out,
        };
    };

    if (loadError) return <div>Failed to load Google Maps</div>;
    if (!isLoaded) return <div>Loading Google Maps...</div>;

    return (
        <div className="w-full md:flex gap-4">
            <div style={{ flex: 1 }}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={marker ? { lat: marker.lat, lng: marker.lng } : defaultCenter}
                    zoom={marker ? 14 : 5}
                    onLoad={onMapLoad}
                    onClick={onMapClick}
                    options={{ fullscreenControl: true }}
                >
                    {marker && <Marker position={{ lat: marker.lat, lng: marker.lng }} />}
                </GoogleMap>
            </div>

            <div style={{ width: 360, padding: 12 }}>
                <h3 className="text-lg font-medium">Selected location</h3>
                {!locationData && <p>Click on the map to pick a location</p>}

                {locationData && (
                    <div>
                        <p>
                            <strong>Lat / Lng:</strong> {locationData.lat.toFixed(6)}, {locationData.lng.toFixed(6)}
                        </p>
                        {locationData.formattedAddress && (
                            <p>
                                <strong>Address:</strong> {locationData.formattedAddress}
                            </p>
                        )}
                        {locationData.placeId && (
                            <p>
                                <strong>Place ID:</strong> {locationData.placeId}
                            </p>
                        )}

                        <details>
                            <summary className="mt-2">Address components</summary>
                            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(locationData.components, null, 2)}</pre>
                        </details>

                        <button
                            onClick={() => onSelect?.(locationData)}
                            style={{ marginTop: 10 }}
                            className="px-3 py-2 rounded shadow"
                        >
                            Confirm
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
