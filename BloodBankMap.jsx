import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Auto-recenter map view when coordinates or branches update
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Custom Google Maps Style Marker Icon
const createGoogleStyleIcon = (name, type) => {
  const isPRC = type === 'PRC';
  const dotColor = isPRC ? '#e11d48' : '#2563eb';

  return L.divIcon({
    className: 'custom-google-marker',
    html: `
      <div style="display: flex; align-items: center; white-space: nowrap; cursor: pointer;">
        <div style="
          width: 14px;
          height: 14px;
          background-color: ${dotColor};
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 5px rgba(0,0,0,0.4);
          flex-shrink: 0;
        "></div>
        <span style="
          margin-left: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          background-color: rgba(255, 255, 255, 0.95);
          padding: 2px 6px;
          border-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          border: 1px solid #cbd5e1;
          font-family: Arial, sans-serif;
        ">${name}</span>
      </div>
    `,
    iconSize: [160, 24],
    iconAnchor: [7, 12],
  });
};

export default function BloodBankMap() {
  const [selectedBloodType, setSelectedBloodType] = useState('A+');
  const [userCoords, setUserCoords] = useState({ lat: 14.5547, lng: 121.0244 });
  const [branches, setBranches] = useState([]);
  const [closestBranch, setClosestBranch] = useState(null);
  const [suggestDonorLocator, setSuggestDonorLocator] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [newFacility, setNewFacility] = useState({
    name: '',
    type: 'PRC',
    address: '',
    contactNumber: '',
    operatingHours: '24/7',
    latitude: 14.5547,
    longitude: 121.0244,
  });

  const fetchBranches = async () => {
    try {
      const res = await fetch(
        `/api/inventory/search-bsf?bloodType=${encodeURIComponent(
          selectedBloodType
        )}&userLat=${userCoords.lat}&userLng=${userCoords.lng}`
      );
      const data = await res.json();

      if (data.success) {
        setBranches(data.data);
        setSuggestDonorLocator(data.suggestDonorLocator);
        setClosestBranch(data.data.length > 0 ? data.data[0] : null);
      }
    } catch (err) {
      console.error('Error fetching BSF locations:', err);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [selectedBloodType]);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/admin/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFacility),
      });
      const data = await res.json();
      if (data.success) {
        alert('New BSF Facility added! It is now pinned on the map.');
        setShowAdminPanel(false);
        setNewFacility({
          name: '',
          type: 'PRC',
          address: '',
          contactNumber: '',
          operatingHours: '24/7',
          latitude: 14.5547,
          longitude: 121.0244,
        });
        fetchBranches();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const mapCenter = branches.length > 0 
    ? [branches[0].latitude, branches[0].longitude] 
    : [userCoords.lat, userCoords.lng];

  return (
    <div
      style={{
        backgroundColor: '#f07171',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1
          style={{
            color: '#fff',
            fontSize: '2.5rem',
            fontWeight: '800',
            margin: 0,
            letterSpacing: '1px',
          }}
        >
          SANDUGO
        </h1>
        <button
          onClick={() => setShowAdminPanel(!showAdminPanel)}
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: '#881337',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {showAdminPanel ? 'Close Admin' : '+ Admin: Add Location'}
        </button>
      </div>

      {showAdminPanel && (
        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#881337' }}>
            Admin: Add New BSF Location
          </h3>
          <form
            onSubmit={handleAdminSubmit}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}
          >
            <input
              required
              placeholder="Facility Name"
              value={newFacility.name}
              onChange={(e) =>
                setNewFacility({ ...newFacility, name: e.target.value })
              }
              style={{ padding: '0.5rem' }}
            />
            <select
              value={newFacility.type}
              onChange={(e) =>
                setNewFacility({ ...newFacility, type: e.target.value })
              }
              style={{ padding: '0.5rem' }}
            >
              <option value="PRC">PRC Branch (Priority 1)</option>
              <option value="Participating_BSF">
                Participating BSF (Priority 2)
              </option>
            </select>
            <input
              required
              placeholder="Address"
              value={newFacility.address}
              onChange={(e) =>
                setNewFacility({ ...newFacility, address: e.target.value })
              }
              style={{ padding: '0.5rem' }}
            />
            <input
              required
              placeholder="Contact Number"
              value={newFacility.contactNumber}
              onChange={(e) =>
                setNewFacility({
                  ...newFacility,
                  contactNumber: e.target.value,
                })
              }
              style={{ padding: '0.5rem' }}
            />
            <input
              required
              type="number"
              step="any"
              placeholder="Latitude"
              value={newFacility.latitude}
              onChange={(e) =>
                setNewFacility({ ...newFacility, latitude: e.target.value })
              }
              style={{ padding: '0.5rem' }}
            />
            <input
              required
              type="number"
              step="any"
              placeholder="Longitude"
              value={newFacility.longitude}
              onChange={(e) =>
                setNewFacility({ ...newFacility, longitude: e.target.value })
              }
              style={{ padding: '0.5rem' }}
            />
            <button
              type="submit"
              style={{
                gridColumn: 'span 2',
                padding: '0.75rem',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Save Location & Pin to Map
            </button>
          </form>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
        }}
      >
        <div style={{ color: '#fff' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                marginBottom: '0.2rem',
              }}
            >
              CLOSEST BSF BRANCH TO YOU:
            </h2>
            <p style={{ fontSize: '1.2rem', margin: 0, fontWeight: '500' }}>
              {closestBranch
                ? closestBranch.name
                : 'No available facility found near you'}
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                marginBottom: '0.8rem',
              }}
            >
              WHAT BLOOD TYPE DO YOU NEED?
            </h2>
            <select
              value={selectedBloodType}
              onChange={(e) => setSelectedBloodType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '8px',
                fontSize: '1.1rem',
                border: '2px solid #333',
                backgroundColor: '#e5e7eb',
                cursor: 'pointer',
              }}
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {suggestDonorLocator ? (
            <div
              style={{
                backgroundColor: '#fff',
                padding: '1.2rem',
                borderRadius: '8px',
                color: '#991b1b',
                marginTop: '1rem',
              }}
            >
              <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold' }}>
                No participating BSF currently has available status for{' '}
                {selectedBloodType}.
              </p>
              <button
                onClick={() =>
                  alert('Redirecting to Emergency Donor Locator Module...')
                }
                style={{
                  padding: '0.6rem 1rem',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Proceed to Emergency Donor Locator 🚨
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                Top Nearest Branches with Available Blood:
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                }}
              >
                {branches.map((b, i) => (
                  <div
                    key={b.id || i}
                    style={{
                      backgroundColor: '#fff',
                      color: '#333',
                      padding: '1rem',
                      borderRadius: '8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        fontWeight: 'bold',
                      }}
                    >
                      <span>
                        {i + 1}. {b.name}
                      </span>
                      <span
                        style={{
                          color: b.status === 'Available' ? '#16a34a' : '#d97706',
                          backgroundColor: '#f3f4f6',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                        }}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: '#666',
                        marginTop: '0.4rem',
                      }}
                    >
                      📍 {b.address} ({b.distanceKm} km away)
                      <br />
                      🕒 {b.operatingHours} | 📞 {b.contactNumber}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        color: '#2563eb',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                      }}
                    >
                      Open Navigation 🧭
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            height: '520px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '3px solid #fff',
          }}
        >
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <RecenterMap center={mapCenter} zoom={13} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {branches.map((b) => (
              <Marker
                key={b.id}
                position={[b.latitude, b.longitude]}
                icon={createGoogleStyleIcon(b.name, b.type)}
              >
                <Popup>
                  <strong style={{ color: '#881337', fontSize: '1rem' }}>🩸 {b.name}</strong>
                  <br />
                  <span>Type: {b.type === 'PRC' ? 'Red Cross Branch' : 'Participating BSF'}</span>
                  <br />
                  <span>Status: <strong>{b.status}</strong></span>
                  <br />
                  <small>🕒 {b.operatingHours}</small>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
