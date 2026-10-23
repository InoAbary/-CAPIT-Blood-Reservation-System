# Blood Reservation System

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set `MONGODB_LINK`, a private `JWT_SECRET`, and `VITE_GMAPS_API_KEY`.
3. Start the API in one terminal: `node backend/server.cjs`.
4. Start the web app in another terminal: `npm run dev`.
5. Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

The blood locator loads active facilities and inventory from MongoDB through the API. Add or update facility information through the staff interface; the locator does not bundle facility inventory as frontend data. Keep `.env` private and do not commit it.

## Google Maps branch details

The Add Branch form uses Google Places Autocomplete and Place Details to fill a branch's current phone number and opening hours. The locator fetches those fields again when displaying a saved branch. MongoDB stores the Google Place ID, while the facility name, address, and map coordinates are sourced from OpenStreetMap. Google Places phone numbers and opening hours are never stored in MongoDB.

Create a Google Maps Platform API key with Maps JavaScript API and Places API (New) enabled and billing configured. Restrict the key to this site's browser origins and the Maps JavaScript API. Put it in `.env` as `VITE_GMAPS_API_KEY`; restart the Vite dev server after changing `.env`. Without the key, Google branch search and live phone/hours lookup will not work.
