import React from 'react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

function BloodBankMap() {
    return (
        <div style={{ height: "100vh"}}> {}
            <Map
                
                initialViewState={{
                    longitude: 10,
                    latitude: 53.54,
                    zoom: 9
                }}
                style={{ width: '100%', height: '100%' }}
                
                mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            >
            </Map>
        </div>
    );
}

export default BloodBankMap;