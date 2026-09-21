import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LngLatBounds }  from 'maplibre-gl';


function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function BloodBankMap() {
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 53.54,
    zoom: 9,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('Philippine Red Cross');
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef();
  const abortRef = useRef(null);

  // --- 1. Get user location ---
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { longitude: coords.longitude, latitude: coords.latitude };
        setUserLocation(loc);
        setViewState((v) => ({ ...v, ...loc, zoom: 13 }));
      },
      (err) => console.warn('Location error:', err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // --- 2. Fetch places from Overpass API ---
  const searchNearby = async (keyword) => {
    if (!userLocation) {
        setError('Waiting for your location...');
        return;
    }
    if (!keyword.trim()) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    const radius = 15000; // meters
    const { latitude, longitude } = userLocation;

    // Convert the radius into a bounding box (left, top, right, bottom)
    const dLat = radius / 111320;
    const dLon = radius / (111320 * Math.cos((latitude * Math.PI) / 180));
    const viewbox = [
        longitude - dLon,
        latitude + dLat,
        longitude + dLon,
        latitude - dLat,
    ].join(',');

    const params = new URLSearchParams({
        q: keyword,
        format: 'jsonv2',
        limit: '30',
        bounded: '1',
        viewbox,
        addressdetails: '1',
        extratags: '1',
    });

    try {
        const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { signal: abortRef.current.signal }
        );
        if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
        const data = await res.json();

        const results = data
        .map((el) => {
            const lat = parseFloat(el.lat);
            const lon = parseFloat(el.lon);
            const a = el.address || {};
            const x = el.extratags || {};
            return {
            id: `${el.osm_type}/${el.osm_id}`,
            name: el.name || el.display_name.split(',')[0],
            latitude: lat,
            longitude: lon,
            address: [
                [a.house_number, a.road].filter(Boolean).join(' '),
                a.suburb || a.city_district,
                a.city || a.town || a.municipality,
            ]
                .filter(Boolean)
                .join(', '),
            phone: x.phone || x['contact:phone'],
            website: x.website || x['contact:website'],
            distanceMeters: getDistance(latitude, longitude, lat, lon),
            };
        })
        .filter((p) => p.distanceMeters <= radius) // box -> true circle
        .sort((a, b) => a.distanceMeters - b.distanceMeters);

        setPlaces(results);

        if (results.length === 0) {
        setError('No results found nearby. Try a different keyword.');
        return;
        }

        if (mapRef.current) {
        const lons = results.map((p) => p.longitude);
        const lats = results.map((p) => p.latitude);
        mapRef.current.fitBounds(
            [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
            ],
            { padding: 60, duration: 800, maxZoom: 15 }
        );
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setError('Failed to search. Please try again later.');
    } finally {
        setLoading(false);
    }
    };

  // --- 3. Trigger search on load and on keyword change ---
  useEffect(() => {
    if (userLocation) searchNearby(searchKeyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  const handleSearch = (e) => {
    e.preventDefault();
    searchNearby(searchKeyword);
  };

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          width: 320,
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="e.g. blood bank, Red Cross, hospital"
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid #ccc',
            borderRadius: 6,
            outline: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0 16px',
            border: 'none',
            borderRadius: 6,
            background: '#e53935',
            color: 'white',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          {loading ? '…' : 'Search'}
        </button>
      </form>

      {/* Status / error message */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 16,
            zIndex: 10,
            background: 'rgba(255,255,255,0.95)',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          {error}
        </div>
      )}

      {/* Results sidebar */}
      {places.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 16,
            zIndex: 10,
            width: 320,
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: 6,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', fontWeight: 600 }}>
            {places.length} result{places.length !== 1 ? 's' : ''} nearby
          </div>
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() => {
                setSelectedPlace(place);
                setViewState((v) => ({
                  ...v,
                  longitude: place.longitude,
                  latitude: place.latitude,
                  zoom: 15,
                }));
              }}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
                background: selectedPlace?.id === place.id ? '#eef4ff' : 'white',
              }}
            >
              <div style={{ fontWeight: 500, fontSize: 13 }}>{place.name}</div>
              {place.address && (
                <div style={{ fontSize: 12, color: '#666' }}>{place.address}</div>
              )}
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {Math.round(place.distanceMeters)} m away
              </div>
            </div>
          ))}
        </div>
      )}

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <NavigationControl position="top-right" />

        {/* User location */}
        {userLocation && (
          <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
            <div
              title="Your location"
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#4285F4',
                border: '3px solid white',
                boxShadow: '0 0 0 4px rgba(66, 133, 244, 0.3)',
              }}
            />
          </Marker>
        )}

        {/* Nearby place markers */}
        {places.map((place) => (
          <Marker
            key={place.id}
            longitude={place.longitude}
            latitude={place.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedPlace(place);
            }}
          >
            <div
              title={place.name}
              style={{
                cursor: 'pointer',
                fontSize: 28,
                lineHeight: 1,
                transform: selectedPlace?.id === place.id ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.15s ease',
              }}
            >
              🩸
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {selectedPlace && (
          <Popup
            longitude={selectedPlace.longitude}
            latitude={selectedPlace.latitude}
            anchor="top"
            onClose={() => setSelectedPlace(null)}
            closeOnClick={false}
          >
            <div style={{ padding: 4, minWidth: 180 }}>
              <strong>{selectedPlace.name}</strong>
              {selectedPlace.address && (
                <div style={{ fontSize: 12, marginTop: 4 }}>{selectedPlace.address}</div>
              )}
              {selectedPlace.phone && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <a href={`tel:${selectedPlace.phone}`}>{selectedPlace.phone}</a>
                </div>
              )}
              {selectedPlace.website && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <a href={selectedPlace.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

export default BloodBankMap;