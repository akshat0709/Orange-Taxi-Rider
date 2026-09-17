# 🚖 Orange Taxi — Rider Mobile App

> **Premium Electric Mobility — Official React Native & Expo Rider Application**  
> Direct companion app to the Orange Taxi platform, seamlessly integrated with Supabase backend, real-time chauffeur tracking, in-ride chat, and Pan-India coverage.

---

## 📱 Features

- **Luxury 3-Step Booking Experience:**
  1. **Fleet Selection:** Clean luxury cards for Compact EV, Sedan EV, SUV EV, and Ultra Luxury with seat capacity, range, and transparent pricing.
  2. **Journey & Preferences:** Pan-India airport & transit presets (Bengaluru, Delhi NCR, Mumbai, Hyderabad), keyword search, GPS auto-detect, and ride personalization (AC climate temperature, conversation preference).
  3. **Itemized Fare Breakdown:** Indian SAC 996412 compliant 5% GST calculation, platform fees, minimum fares, and Cash / UPI payment selection.

- **Dual-Layer Auto-Refresh Sync:**
  - Supabase Realtime WebSocket listeners paired with high-frequency 2.5s polling.
  - Automatically transitions state when a driver accepts, arrives at pickup, verifies the OTP, or completes the trip—zero manual reloads needed.

- **Live Interactive Map:**
  - Dark luxury map theme matching the Orange Taxi brand identity (`#0B0D11` background, `#F56B00` brand orange, `#22C55E` electric green).
  - Dynamic route polyline connecting pickup, chauffeur, and destination.
  - Live status indicator: `🚗 Chauffeur En Route to Pickup` vs `🟢 Live GPS to Destination`.

- **Direct In-Ride Realtime Chat:**
  - Dedicated bottom drawer chat linked via Supabase Realtime broadcast channels (`ride-chat-${bookingId}`).
  - Instant two-way messaging with quick response chips ("I'm at the gate", "Heavy traffic", "On my way").

- **Chauffeur Verification & Security:**
  - Dynamic 6-digit trip OTP prominently displayed for customer security.
  - Verified chauffeur details loaded directly from the Supabase `drivers` database (photo, vehicle make/model, plate number, rating, and quick-call button).

- **Post-Trip Feedback & Rating:**
  - Interactive 1–5 gold star rating modal appearing immediately upon trip completion.
  - Compliment chips ("Smooth Driving", "Clean EV", "Polite Chauffeur", "Great Music") and review notes saved directly to Supabase.

---

## 🛠 Tech Stack & Libraries

- **Framework:** [React Native](https://reactnative.dev/) (React 19) with [Expo SDK 57](https://expo.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode, zero errors)
- **Backend & Auth:** [@supabase/supabase-js](https://supabase.com/) with persistent session storage via `@react-native-async-storage/async-storage`
- **Maps & Geolocation:** `react-native-maps` & `expo-location`
- **Icons & Haptics:** `lucide-react-native` & `expo-haptics`
- **Navigation & Screens:** `react-native-safe-area-context` & `react-native-screens`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm or yarn
- [Expo Go](https://expo.dev/go) app installed on your iOS or Android device

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akshat0709/Orange-Taxi-Rider.git
   cd Orange-Taxi-Rider
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Expo development server:**
   ```bash
   npx expo start -c
   ```

4. **Run on your device:**
   - **iOS:** Open the Camera app and scan the QR code to launch in Expo Go.
   - **Android:** Scan the QR code using the Expo Go application.

---

## 🔐 Supabase Configuration & Schema

The application is preconfigured to communicate directly with the production Supabase database:
- **`profiles`:** User profile synchronization upon Sign In / Sign Up.
- **`bookings`:** Creation of ride requests respecting Row Level Security (`customer_id = auth.uid()`).
- **`drivers`:** Real-time driver profile and live latitude/longitude lookup.
- **`vehicle_categories`:** Dynamic pricing rates and vehicle details.

---

## 📦 Project Structure

```
orange-taxi-rider/
├── src/
│   ├── components/
│   │   ├── InRideChatModal.tsx   # Realtime Supabase broadcast chat drawer
│   │   ├── RatingModal.tsx        # Post-ride 5-star rating & review modal
│   │   └── RideMap.tsx            # Interactive dark luxury GPS route map
│   ├── lib/
│   │   ├── presets.ts             # Pan-India presets (BLR, DEL, BOM, HYD)
│   │   └── supabase.ts            # Supabase client with AsyncStorage session
│   └── types/
│       └── index.ts               # Strict TypeScript models for fleet, rides & drivers
├── assets/                        # Brand logos, icons & splash screen
├── App.tsx                        # Master booking flow & active ride controller
├── app.json                       # Expo configuration, permissions & API keys
├── package.json
└── tsconfig.json
```

---

## 📄 License
MIT License. Built with pride for Orange Taxi.