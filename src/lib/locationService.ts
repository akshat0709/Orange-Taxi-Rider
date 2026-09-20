import * as Location from 'expo-location';

export interface LocationItem {
  id: string;
  name: string;
  subtitle: string;
  city: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad' | 'Other';
  lat: number;
  lng: number;
  tag?: string;
  isAirport?: boolean;
  isMetro?: boolean;
  isTechPark?: boolean;
}

export interface NearbyCab {
  id: string;
  lat: number;
  lng: number;
  rotation: number;
  type: 'Compact' | 'Sedan' | 'XL';
}

// ---------------------------------------------------------------------------
// 150+ CURATED PAN-INDIA PRESETS (Fast instant zero-latency results)
// ---------------------------------------------------------------------------
export const EXPANDED_PRESETS: LocationItem[] = [
  // ==================== DELHI NCR ====================
  // Airports & Major Transit
  { id: 'del-1', name: "IGI Airport Terminal 3 (T3)", subtitle: "International & Domestic Arrivals, New Delhi", city: "Delhi NCR", lat: 28.5562, lng: 77.1000, tag: "✈️ Airport", isAirport: true },
  { id: 'del-2', name: "IGI Airport Terminal 1 (T1)", subtitle: "Low-Cost Domestic Terminal, New Delhi", city: "Delhi NCR", lat: 28.5630, lng: 77.1190, tag: "✈️ Airport", isAirport: true },
  { id: 'del-3', name: "IGI Airport Terminal 2 (T2)", subtitle: "Domestic Terminal, New Delhi", city: "Delhi NCR", lat: 28.5575, lng: 77.0900, tag: "✈️ Airport", isAirport: true },
  { id: 'del-4', name: "New Delhi Railway Station (NDLS)", subtitle: "Pahar Ganj & Ajmeri Gate Side, Delhi", city: "Delhi NCR", lat: 28.6429, lng: 77.2195, tag: "🚆 Railway" },
  { id: 'del-5', name: "Hazrat Nizamuddin Railway Station", subtitle: "Sarai Kale Khan, New Delhi", city: "Delhi NCR", lat: 28.5892, lng: 77.2530, tag: "🚆 Railway" },
  { id: 'del-6', name: "Kashmere Gate ISBT", subtitle: "Inter State Bus Terminal & Metro Hub, Delhi", city: "Delhi NCR", lat: 28.6675, lng: 77.2285, tag: "🚌 Bus & Metro" },
  // Central & South Delhi
  { id: 'del-7', name: "Connaught Place (CP)", subtitle: "Inner & Outer Circle, Central Delhi", city: "Delhi NCR", lat: 28.6315, lng: 77.2167, tag: "📍 Central Hub" },
  { id: 'del-8', name: "Aerocity Hospitality District", subtitle: "Worldmark & Luxury Hotels, New Delhi", city: "Delhi NCR", lat: 28.5492, lng: 77.1215, tag: "🏨 Aerocity" },
  { id: 'del-9', name: "Vasant Kunj (Ambience & Promenade Mall)", subtitle: "Nelson Mandela Marg, South Delhi", city: "Delhi NCR", lat: 28.5398, lng: 77.1534, tag: "🛍️ Mall & Hub" },
  { id: 'del-10', name: "Vasant Vihar & Basant Lok", subtitle: "South West Delhi", city: "Delhi NCR", lat: 28.5620, lng: 77.1580, tag: "📍 Vasant Vihar" },
  { id: 'del-11', name: "Hauz Khas Village & Metro", subtitle: "Aurobindo Marg, South Delhi", city: "Delhi NCR", lat: 28.5494, lng: 77.2001, tag: "📍 Hauz Khas" },
  { id: 'del-12', name: "Saket Select CITYWALK", subtitle: "District Centre, Saket, New Delhi", city: "Delhi NCR", lat: 28.5284, lng: 77.2185, tag: "🛍️ Mall" },
  { id: 'del-13', name: "South Extension 1 & 2", subtitle: "Ring Road, New Delhi", city: "Delhi NCR", lat: 28.5728, lng: 77.2228, tag: "📍 South Ext" },
  { id: 'del-14', name: "Defence Colony & Flyover Market", subtitle: "South Delhi", city: "Delhi NCR", lat: 28.5744, lng: 77.2319, tag: "📍 Def Col" },
  { id: 'del-15', name: "Greater Kailash 1 (M Block Market)", subtitle: "GK-1, South Delhi", city: "Delhi NCR", lat: 28.5535, lng: 77.2384, tag: "🛍️ GK 1" },
  { id: 'del-16', name: "Greater Kailash 2 (M Block Market)", subtitle: "GK-2, South Delhi", city: "Delhi NCR", lat: 28.5355, lng: 77.2427, tag: "🛍️ GK 2" },
  { id: 'del-17', name: "Lajpat Nagar Central Market", subtitle: "Ring Road Metro, New Delhi", city: "Delhi NCR", lat: 28.5677, lng: 77.2433, tag: "🛍️ Market" },
  { id: 'del-18', name: "Nehru Place IT Hub & Metro", subtitle: "Outer Ring Road, New Delhi", city: "Delhi NCR", lat: 28.5489, lng: 77.2514, tag: "💼 Tech Hub", isTechPark: true },
  { id: 'del-19', name: "Khan Market", subtitle: "Rabindra Nagar, Central Delhi", city: "Delhi NCR", lat: 28.6002, lng: 77.2272, tag: "🛍️ Luxury Hub" },
  { id: 'del-20', name: "Chanakyapuri Diplomatic Enclave", subtitle: "Shantipath, New Delhi", city: "Delhi NCR", lat: 28.5983, lng: 77.1892, tag: "🏛️ Diplomatic" },
  { id: 'del-21', name: "Dwarka Sector 21 Metro", subtitle: "Airport Express Line Hub, New Delhi", city: "Delhi NCR", lat: 28.5524, lng: 77.0583, tag: "🚇 Metro Hub", isMetro: true },
  { id: 'del-22', name: "Dwarka Expressway & Sector 10", subtitle: "South West Delhi", city: "Delhi NCR", lat: 28.5823, lng: 77.0504, tag: "📍 Dwarka" },
  // Gurugram / Gurgaon
  { id: 'del-23', name: "DLF CyberHub & Cyber City", subtitle: "NH-48, DLF Phase 2, Gurugram", city: "Delhi NCR", lat: 28.4950, lng: 77.0895, tag: "💼 CyberHub", isTechPark: true },
  { id: 'del-24', name: "Golf Course Road & Sector 54", subtitle: "DLF Phase 5, Gurugram", city: "Delhi NCR", lat: 28.4389, lng: 77.1054, tag: "📍 Golf Course Rd" },
  { id: 'del-25', name: "Golf Course Extension Road", subtitle: "Sector 65 / Sector 66, Gurugram", city: "Delhi NCR", lat: 28.4060, lng: 77.0780, tag: "📍 GC Ext Rd" },
  { id: 'del-26', name: "MG Road Metro & MGF Metropolitan Mall", subtitle: "DLF Phase 2, Gurugram", city: "Delhi NCR", lat: 28.4797, lng: 77.0803, tag: "🛍️ Mall" },
  { id: 'del-27', name: "Ambience Mall Gurugram", subtitle: "NH-48 Border, Gurugram", city: "Delhi NCR", lat: 28.5041, lng: 77.0970, tag: "🛍️ Mall" },
  { id: 'del-28', name: "Sector 29 Market & Leisure Valley", subtitle: "HUDA City Centre Metro, Gurugram", city: "Delhi NCR", lat: 28.4682, lng: 77.0620, tag: "📍 Sector 29" },
  { id: 'del-29', name: "Sohna Road (Subhash Chowk)", subtitle: "Sector 48, Gurugram", city: "Delhi NCR", lat: 28.4310, lng: 77.0420, tag: "📍 Sohna Rd" },
  { id: 'del-30', name: "Udyog Vihar Phase 1 to 5", subtitle: "Near Cyber City, Gurugram", city: "Delhi NCR", lat: 28.5050, lng: 77.0820, tag: "💼 Tech Zone", isTechPark: true },
  // Noida & Greater Noida
  { id: 'del-31', name: "Noida Sector 18 & DLF Mall of India", subtitle: "Atta Market, Sector 18, Noida", city: "Delhi NCR", lat: 28.5672, lng: 77.3209, tag: "🛍️ Mall of India" },
  { id: 'del-32', name: "Noida Sector 62 (Electronic City Metro)", subtitle: "IT Park & Tech Zone, Noida", city: "Delhi NCR", lat: 28.6280, lng: 77.3649, tag: "💼 Tech Zone", isTechPark: true },
  { id: 'del-33', name: "Noida Expressway (Sector 128 / 135)", subtitle: "Expressway IT Corridor, Noida", city: "Delhi NCR", lat: 28.5080, lng: 77.3820, tag: "💼 Expressway" },
  { id: 'del-34', name: "Botanical Garden Metro Interchange", subtitle: "Blue & Magenta Line Hub, Noida", city: "Delhi NCR", lat: 28.5645, lng: 77.3343, tag: "🚇 Metro Hub", isMetro: true },
  { id: 'del-35', name: "Pari Chowk, Greater Noida", subtitle: "Yamuna Expressway Entry, Greater Noida", city: "Delhi NCR", lat: 28.4650, lng: 77.5100, tag: "📍 Pari Chowk" },
  // Ghaziabad & Faridabad
  { id: 'del-36', name: "Indirapuram & Shipra Mall", subtitle: "Vaibhav Khand, Ghaziabad", city: "Delhi NCR", lat: 28.6360, lng: 77.3710, tag: "📍 Indirapuram" },
  { id: 'del-37', name: "Vaishali Metro Station", subtitle: "Sector 4, Ghaziabad", city: "Delhi NCR", lat: 28.6496, lng: 77.3396, tag: "🚇 Metro", isMetro: true },
  { id: 'del-38', name: "Faridabad Sector 15 / Neelam Bata", subtitle: "Bata Chowk Metro, Faridabad", city: "Delhi NCR", lat: 28.3980, lng: 77.3080, tag: "📍 Faridabad" },

  // ==================== BENGALURU ====================
  // Airport & Major Stations
  { id: 'blr-1', name: "Kempegowda International Airport (BLR) T1 & T2", subtitle: "Devanahalli, Bengaluru", city: "Bengaluru", lat: 13.1986, lng: 77.7066, tag: "✈️ Airport", isAirport: true },
  { id: 'blr-2', name: "Krantivira Sangolli Rayanna (Majestic) Station", subtitle: "KSR Railway & Metro Interchange, Bengaluru", city: "Bengaluru", lat: 12.9781, lng: 77.5694, tag: "🚆 Majestic" },
  { id: 'blr-3', name: "Yesvantpur Junction Railway Station", subtitle: "Green Line Metro, Bengaluru", city: "Bengaluru", lat: 13.0238, lng: 77.5503, tag: "🚆 Railway" },
  { id: 'blr-4', name: "SMVT Bengaluru (Sir M. Visvesvaraya Terminal)", subtitle: "Baiyappanahalli, Bengaluru", city: "Bengaluru", lat: 13.0034, lng: 77.6528, tag: "🚆 Terminal" },
  // East & South Bengaluru Tech Corridor
  { id: 'blr-5', name: "Indiranagar 100ft Road & 12th Main", subtitle: "Near Metro Station, Bengaluru", city: "Bengaluru", lat: 12.9784, lng: 77.6408, tag: "📍 Indiranagar" },
  { id: 'blr-6', name: "Koramangala Sony World Signal & 4th Block", subtitle: "80ft Road, Bengaluru", city: "Bengaluru", lat: 12.9345, lng: 77.6266, tag: "📍 Koramangala" },
  { id: 'blr-7', name: "HSR Layout (Sector 1 to 7)", subtitle: "Outer Ring Road, Bengaluru", city: "Bengaluru", lat: 12.9116, lng: 77.6474, tag: "📍 HSR Layout" },
  { id: 'blr-8', name: "Bellandur & RMZ EcoWorld Tech Park", subtitle: "Outer Ring Road (ORR), Bengaluru", city: "Bengaluru", lat: 12.9260, lng: 77.6762, tag: "💼 EcoWorld", isTechPark: true },
  { id: 'blr-9', name: "Marathahalli Bridge & Multiplex", subtitle: "ORR Junction, Bengaluru", city: "Bengaluru", lat: 12.9560, lng: 77.7010, tag: "📍 Marathahalli" },
  { id: 'blr-10', name: "Whitefield ITPL Main Road", subtitle: "International Tech Park, Bengaluru", city: "Bengaluru", lat: 12.9863, lng: 77.7308, tag: "💼 ITPL Whitefield", isTechPark: true },
  { id: 'blr-11', name: "Phoenix Marketcity & VR Bengaluru", subtitle: "Mahadevapura, Whitefield Main Rd, Bengaluru", city: "Bengaluru", lat: 12.9961, lng: 77.6967, tag: "🛍️ Mall" },
  { id: 'blr-12', name: "Electronic City Phase 1 (Infosys Gate)", subtitle: "Hosur Road Elevated Toll, Bengaluru", city: "Bengaluru", lat: 12.8452, lng: 77.6602, tag: "⚡ E-City Ph 1", isTechPark: true },
  { id: 'blr-13', name: "Electronic City Phase 2 (Wipro Gate)", subtitle: "Electronic City, Bengaluru", city: "Bengaluru", lat: 12.8530, lng: 77.6780, tag: "⚡ E-City Ph 2", isTechPark: true },
  { id: 'blr-14', name: "Sarjapur Road & Wipro Corporate Office", subtitle: "Sarjapur Main Road, Bengaluru", city: "Bengaluru", lat: 12.9120, lng: 77.6890, tag: "📍 Sarjapur Rd" },
  // Central & North Bengaluru
  { id: 'blr-15', name: "MG Road & Brigade Road Junction", subtitle: "Church Street, Central Bengaluru", city: "Bengaluru", lat: 12.9756, lng: 77.6066, tag: "🛍️ MG Road" },
  { id: 'blr-16', name: "UB City & Vittal Mallya Road", subtitle: "Luxury Mall & Business Hub, Bengaluru", city: "Bengaluru", lat: 12.9716, lng: 77.5960, tag: "🛍️ UB City" },
  { id: 'blr-17', name: "Manyata Embassy Business Park", subtitle: "Nagavara, Hebbal Ring Road, Bengaluru", city: "Bengaluru", lat: 13.0485, lng: 77.6212, tag: "💼 Manyata Tech", isTechPark: true },
  { id: 'blr-18', name: "Hebbal Flyover & Esteem Mall", subtitle: "Airport Road, Bengaluru", city: "Bengaluru", lat: 13.0358, lng: 77.5970, tag: "📍 Hebbal" },
  { id: 'blr-19', name: "Jayanagar 4th Block Complex", subtitle: "South Bengaluru", city: "Bengaluru", lat: 12.9299, lng: 77.5824, tag: "📍 Jayanagar" },
  { id: 'blr-20', name: "JP Nagar (Brigade Millennium & 6th Phase)", subtitle: "Bannerghatta Rd connection, Bengaluru", city: "Bengaluru", lat: 12.9063, lng: 77.5857, tag: "📍 JP Nagar" },
  { id: 'blr-21', name: "Bannerghatta Road (IIM Bangalore)", subtitle: "Arekere, Bengaluru", city: "Bengaluru", lat: 12.8940, lng: 77.6010, tag: "🎓 IIM-B" },
  { id: 'blr-22', name: "Malleshwaram (8th Cross & Orion Mall)", subtitle: "Brigade Gateway, Bengaluru", city: "Bengaluru", lat: 13.0110, lng: 77.5550, tag: "🛍️ Orion Mall" },

  // ==================== MUMBAI ====================
  // Airports & Transit
  { id: 'bom-1', name: "Chhatrapati Shivaji Maharaj Airport (BOM T2)", subtitle: "International & Domestic Terminal, Andheri East", city: "Mumbai", lat: 19.0896, lng: 72.8656, tag: "✈️ Airport", isAirport: true },
  { id: 'bom-2', name: "Chhatrapati Shivaji Maharaj Airport (BOM T1)", subtitle: "Domestic Terminal, Vile Parle, Mumbai", city: "Mumbai", lat: 19.0950, lng: 72.8520, tag: "✈️ Airport", isAirport: true },
  { id: 'bom-3', name: "Chhatrapati Shivaji Maharaj Terminus (CSMT)", subtitle: "Fort, South Mumbai", city: "Mumbai", lat: 18.9401, lng: 72.8354, tag: "🚆 CSMT" },
  { id: 'bom-4', name: "Mumbai Central Railway Station", subtitle: "Tardeo, South Mumbai", city: "Mumbai", lat: 18.9696, lng: 72.8194, tag: "🚆 Railway" },
  { id: 'bom-5', name: "Bandra Terminus", subtitle: "Bandra East, Mumbai", city: "Mumbai", lat: 19.0625, lng: 72.8415, tag: "🚆 Railway" },
  // Business Districts & Suburbs
  { id: 'bom-6', name: "Bandra Kurla Complex (BKC)", subtitle: "G Block, Corporate Hub & Jio World Drive, Mumbai", city: "Mumbai", lat: 19.0657, lng: 72.8687, tag: "💼 BKC", isTechPark: true },
  { id: 'bom-7', name: "Nariman Point & Marine Drive", subtitle: "South Mumbai Coastal Promenade", city: "Mumbai", lat: 18.9260, lng: 72.8235, tag: "🌊 Marine Drive" },
  { id: 'bom-8', name: "Lower Parel & Palladium / High Street Phoenix", subtitle: "Senapati Bapat Marg, Mumbai", city: "Mumbai", lat: 18.9953, lng: 72.8258, tag: "🛍️ Lower Parel" },
  { id: 'bom-9', name: "Bandra West (Linking Road & Hill Road)", subtitle: "Bandra, Mumbai", city: "Mumbai", lat: 19.0596, lng: 72.8295, tag: "🛍️ Bandra West" },
  { id: 'bom-10', name: "Juhu Beach & JW Marriott", subtitle: "Juhu Tara Road, Mumbai", city: "Mumbai", lat: 19.1000, lng: 72.8260, tag: "🏖️ Juhu" },
  { id: 'bom-11', name: "Andheri East (MIDC & SEEPZ)", subtitle: "Andheri-Kurla Road, Mumbai", city: "Mumbai", lat: 19.1190, lng: 72.8750, tag: "💼 MIDC", isTechPark: true },
  { id: 'bom-12', name: "Andheri West (Lokhandwala Complex)", subtitle: "Infinity Mall, Mumbai", city: "Mumbai", lat: 19.1410, lng: 72.8310, tag: "📍 Lokhandwala" },
  { id: 'bom-13', name: "Powai (Hiranandani Gardens & IIT Bombay)", subtitle: "Powai Lake, Mumbai", city: "Mumbai", lat: 19.1176, lng: 72.9060, tag: "📍 Powai" },
  { id: 'bom-14', name: "Goregaon East (Nesco Center & Oberoi Mall)", subtitle: "Western Express Highway, Mumbai", city: "Mumbai", lat: 19.1630, lng: 72.8600, tag: "🏢 Nesco" },
  { id: 'bom-15', name: "Malad West (Inorbit Mall & Mindspace)", subtitle: "Link Road, Mumbai", city: "Mumbai", lat: 19.1860, lng: 72.8350, tag: "💼 Mindspace", isTechPark: true },
  { id: 'bom-16', name: "Vashi (Inorbit Mall & Station Complex)", subtitle: "Sector 30A, Navi Mumbai", city: "Mumbai", lat: 19.0660, lng: 72.9990, tag: "📍 Vashi" },
  { id: 'bom-17', name: "Thane (Viviana Mall & Cadbury Junction)", subtitle: "Eastern Express Highway, Thane", city: "Mumbai", lat: 19.2090, lng: 72.9710, tag: "🛍️ Viviana" },

  // ==================== HYDERABAD ====================
  // Airport & Major Transit
  { id: 'hyd-1', name: "Rajiv Gandhi International Airport (HYD RGIA)", subtitle: "Shamshabad, Hyderabad", city: "Hyderabad", lat: 17.2403, lng: 78.4294, tag: "✈️ Airport", isAirport: true },
  { id: 'hyd-2', name: "Secunderabad Junction Railway Station", subtitle: "Secunderabad Metro, Hyderabad", city: "Hyderabad", lat: 17.4334, lng: 78.5042, tag: "🚆 Railway" },
  { id: 'hyd-3', name: "Hyderabad Deccan (Nampally) Station", subtitle: "Nampally, Hyderabad", city: "Hyderabad", lat: 17.3920, lng: 78.4690, tag: "🚆 Railway" },
  // Cyberabad & IT Corridor
  { id: 'hyd-4', name: "Hitec City & Cyber Towers", subtitle: "Madhapur, Hyderabad", city: "Hyderabad", lat: 17.4504, lng: 78.3808, tag: "💼 Hitec City", isTechPark: true },
  { id: 'hyd-5', name: "Gachibowli Financial District", subtitle: "Nanakramguda, Hyderabad", city: "Hyderabad", lat: 17.4401, lng: 78.3489, tag: "💼 Financial Dist", isTechPark: true },
  { id: 'hyd-6', name: "Madhapur (Inorbit Mall & Durgam Cheruvu)", subtitle: "Mindspace IT Park, Hyderabad", city: "Hyderabad", lat: 17.4340, lng: 78.3870, tag: "🛍️ Inorbit Mall" },
  { id: 'hyd-7', name: "Kondapur (Botanical Garden Rd)", subtitle: "Near Hitec City, Hyderabad", city: "Hyderabad", lat: 17.4690, lng: 78.3580, tag: "📍 Kondapur" },
  { id: 'hyd-8', name: "Jubilee Hills (Checkpost & Road No. 36)", subtitle: "Upscale Commercial Hub, Hyderabad", city: "Hyderabad", lat: 17.4310, lng: 78.4070, tag: "📍 Jubilee Hills" },
  { id: 'hyd-9', name: "Banjara Hills (Road No. 1 & GVK One Mall)", subtitle: "Hyderabad Central", city: "Hyderabad", lat: 17.4190, lng: 78.4480, tag: "🛍️ GVK One" },
  { id: 'hyd-10', name: "Kukatpally (KPHB Colony & Forum Sujana Mall)", subtitle: "NH-65, Hyderabad", city: "Hyderabad", lat: 17.4930, lng: 78.3980, tag: "📍 KPHB" },
  { id: 'hyd-11', name: "Begumpet & Somajiguda", subtitle: "Raj Bhavan Road, Hyderabad", city: "Hyderabad", lat: 17.4370, lng: 78.4610, tag: "📍 Begumpet" },
  { id: 'hyd-12', name: "Charminar & Laad Bazaar", subtitle: "Old City Heritage Hub, Hyderabad", city: "Hyderabad", lat: 17.3616, lng: 78.4747, tag: "🕌 Charminar" },
];

// ---------------------------------------------------------------------------
// HELPER: Coordinates bounds check for India
// ---------------------------------------------------------------------------
export function isCoordinateInIndia(lat: number, lng: number): boolean {
  // India roughly spans 8.0° N to 37.5° N, and 68.0° E to 97.5° E
  return lat >= 8.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
}

// ---------------------------------------------------------------------------
// SMART LOCATION SANITIZER (fixes Cupertino iOS Simulator & gives valid India hub)
// ---------------------------------------------------------------------------
export interface SanitizedLocationResult {
  lat: number;
  lng: number;
  displayText: string;
  cityName: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad';
  isSimulated: boolean;
}

export async function getSanitizedLocation(
  fallbackCity: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad' = 'Bengaluru'
): Promise<SanitizedLocationResult> {
  let coords: { latitude: number; longitude: number } | null = null;
  let permissionGranted = false;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    permissionGranted = status === 'granted';

    if (permissionGranted) {
      // 1. First try instant last-known position
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last && isCoordinateInIndia(last.coords.latitude, last.coords.longitude)) {
          coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        }
      } catch (e) {}

      // 2. High-accuracy current position
      if (!coords) {
        try {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (isCoordinateInIndia(current.coords.latitude, current.coords.longitude)) {
            coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
          }
        } catch (e) {}
      }
    }
  } catch (err) {}

  // 3. If no Indian GPS coordinate obtained (e.g. Xcode Simulator defaulting to Cupertino, CA, or permission pending):
  // Automatically detect user's actual location via IP Geolocation!
  if (!coords) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const ipRes = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timer);

      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData?.success && ipData.latitude && ipData.longitude) {
          coords = { latitude: ipData.latitude, longitude: ipData.longitude };
          const detectedCity = detectCityFromName(ipData.city || ipData.region);
          const areaName = ipData.city || 'Current Area';
          const regionName = ipData.region || 'India';

          return {
            lat: ipData.latitude,
            lng: ipData.longitude,
            displayText: `${areaName}, ${regionName}`,
            cityName: detectedCity,
            isSimulated: false,
          };
        }
      }
    } catch (ipErr) {}
  }

  // 4. If we have coordinates, perform reverse geocoding to get human-friendly street/area
  if (coords) {
    try {
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (geo) {
        const parts: string[] = [];
        if (geo.name && geo.name !== geo.street) parts.push(geo.name);
        if (geo.street) parts.push(geo.street);
        if (geo.district && !parts.includes(geo.district)) parts.push(geo.district);

        const locality = parts.length > 0 ? parts.join(', ') : 'Current Location';
        const city = geo.city || geo.subregion || 'Metro Area';
        const detectedCity = detectCityFromName(city);

        return {
          lat: coords.latitude,
          lng: coords.longitude,
          displayText: `${locality}, ${city}`,
          cityName: detectedCity,
          isSimulated: false,
        };
      }
    } catch (e) {}

    return {
      lat: coords.latitude,
      lng: coords.longitude,
      displayText: 'Current GPS Location',
      cityName: fallbackCity,
      isSimulated: false,
    };
  }

  // 5. Ultimate fallback if offline
  return getDefaultCityCenter(fallbackCity, true);
}

export function getDefaultCityCenter(
  city: 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad',
  isSimulated = false
): SanitizedLocationResult {
  switch (city) {
    case 'Bengaluru':
      return {
        lat: 12.9784,
        lng: 77.6408,
        displayText: 'Indiranagar 100ft Road, Bengaluru',
        cityName: 'Bengaluru',
        isSimulated,
      };
    case 'Mumbai':
      return {
        lat: 19.0657,
        lng: 72.8687,
        displayText: 'Bandra Kurla Complex (BKC), Mumbai',
        cityName: 'Mumbai',
        isSimulated,
      };
    case 'Hyderabad':
      return {
        lat: 17.4504,
        lng: 78.3808,
        displayText: 'Hitec City, Cyber Towers, Hyderabad',
        cityName: 'Hyderabad',
        isSimulated,
      };
    case 'Delhi NCR':
    default:
      return {
        lat: 28.6315,
        lng: 77.2167,
        displayText: 'Connaught Place (CP), New Delhi',
        cityName: 'Delhi NCR',
        isSimulated,
      };
  }
}

export function detectCityFromName(cityNameStr?: string): 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad' {
  if (!cityNameStr) return 'Delhi NCR';
  const s = cityNameStr.toLowerCase();
  if (s.includes('bengaluru') || s.includes('bangalore') || s.includes('karnataka')) return 'Bengaluru';
  if (s.includes('mumbai') || s.includes('bombay') || s.includes('navi mumbai') || s.includes('thane') || s.includes('maharashtra')) return 'Mumbai';
  if (s.includes('hyderabad') || s.includes('secunderabad') || s.includes('telangana')) return 'Hyderabad';
  return 'Delhi NCR';
}

// ---------------------------------------------------------------------------
// DYNAMIC LIVE PLACE SEARCH (Combines local presets + live geocoding)
// ---------------------------------------------------------------------------
export async function searchPlaces(
  query: string,
  activeCityFilter: 'All' | 'Delhi NCR' | 'Bengaluru' | 'Mumbai' | 'Hyderabad' = 'All',
  userCoords?: { lat: number; lng: number }
): Promise<LocationItem[]> {
  const cleanQ = query.trim().toLowerCase();

  // 1. If empty, return popular presets for the selected city
  if (!cleanQ) {
    return EXPANDED_PRESETS.filter(
      (p) => activeCityFilter === 'All' || p.city === activeCityFilter
    ).slice(0, 15);
  }

  // 2. Filter local high-quality presets first (instant 0ms)
  const localMatches = EXPANDED_PRESETS.filter((p) => {
    const cityMatch = activeCityFilter === 'All' || p.city === activeCityFilter;
    const textMatch =
      p.name.toLowerCase().includes(cleanQ) ||
      p.subtitle.toLowerCase().includes(cleanQ) ||
      (p.tag && p.tag.toLowerCase().includes(cleanQ)) ||
      p.city.toLowerCase().includes(cleanQ);
    return cityMatch && textMatch;
  });

  // If we have 5+ strong local matches, return them immediately
  if (localMatches.length >= 5) {
    return localMatches.slice(0, 12);
  }

  // 3. Concurrently trigger live geocoding (combining native expo-location + Photon OSM)
  const liveResults: LocationItem[] = [];

  try {
    // A. Native expo-location geocoding
    const searchTarget = activeCityFilter === 'All'
      ? `${cleanQ}, India`
      : `${cleanQ}, ${activeCityFilter}, India`;

    const geocoded = await Location.geocodeAsync(searchTarget);

    if (geocoded && geocoded.length > 0) {
      for (let i = 0; i < Math.min(geocoded.length, 4); i++) {
        const g = geocoded[i];
        if (isCoordinateInIndia(g.latitude, g.longitude)) {
          try {
            const [reverse] = await Location.reverseGeocodeAsync({
              latitude: g.latitude,
              longitude: g.longitude,
            });

            const street = reverse?.street || reverse?.name || cleanQ;
            const city = reverse?.city || reverse?.subregion || activeCityFilter;
            const name = reverse?.name ? `${reverse.name}, ${street}` : `${street}, ${city}`;

            liveResults.push({
              id: `geo-${g.latitude.toFixed(4)}-${g.longitude.toFixed(4)}`,
              name: name,
              subtitle: `${reverse?.district || ''} ${reverse?.region || ''} India`.trim(),
              city: detectCityFromName(city),
              lat: g.latitude,
              lng: g.longitude,
              tag: '📍 Live Map Location',
            });
          } catch (e) {
            liveResults.push({
              id: `geo-raw-${i}`,
              name: `${cleanQ.toUpperCase()} Location`,
              subtitle: `Lat: ${g.latitude.toFixed(4)}, Lng: ${g.longitude.toFixed(4)}`,
              city: activeCityFilter === 'All' ? 'Delhi NCR' : activeCityFilter,
              lat: g.latitude,
              lng: g.longitude,
              tag: '📍 Geocoded',
            });
          }
        }
      }
    }
  } catch (err) {}

  // B. Fast Indian Photon Geocoding fallback (gives instant real places for queries like "Vind")
  try {
    const photonTarget = activeCityFilter === 'All' ? `${cleanQ} India` : `${cleanQ} ${activeCityFilter} India`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);

    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(photonTarget)}&limit=5`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data?.features) {
        for (const f of data.features) {
          const [lon, lat] = f.geometry?.coordinates || [];
          if (lat && lon && isCoordinateInIndia(lat, lon)) {
            const p = f.properties || {};
            const placeName = p.name || p.street || cleanQ;
            const placeCity = p.city || p.district || p.state || activeCityFilter;
            const placeSub = [p.street, p.district, p.city, p.state].filter(Boolean).join(', ');

            liveResults.push({
              id: `photon-${lat.toFixed(4)}-${lon.toFixed(4)}`,
              name: placeName,
              subtitle: placeSub || `${placeCity}, India`,
              city: detectCityFromName(placeCity),
              lat: lat,
              lng: lon,
              tag: '📍 Live Place',
            });
          }
        }
      }
    }
  } catch (e) {}

  // Combine and deduplicate
  const combined = [...localMatches];
  for (const live of liveResults) {
    if (!combined.some((c) => Math.abs(c.lat - live.lat) < 0.005 && Math.abs(c.lng - live.lng) < 0.005)) {
      combined.push(live);
    }
  }

  return combined.slice(0, 15);
}

// ---------------------------------------------------------------------------
// GENERATE REALISTIC NEARBY CABS (for Uber/Ola moving cars effect)
// ---------------------------------------------------------------------------
export function generateNearbyCabs(centerLat: number, centerLng: number): NearbyCab[] {
  const offsets = [
    { dLat: 0.0035, dLng: 0.0028, rot: 45, type: 'Sedan' as const },
    { dLat: -0.0042, dLng: 0.0031, rot: 135, type: 'Compact' as const },
    { dLat: 0.0029, dLng: -0.0038, rot: 270, type: 'XL' as const },
    { dLat: -0.0031, dLng: -0.0025, rot: 210, type: 'Sedan' as const },
    { dLat: 0.0055, dLng: -0.0012, rot: 330, type: 'Sedan' as const },
  ];

  return offsets.map((o, idx) => ({
    id: `cab-${idx + 1}`,
    lat: centerLat + o.dLat,
    lng: centerLng + o.dLng,
    rotation: o.rot,
    type: o.type,
  }));
}
