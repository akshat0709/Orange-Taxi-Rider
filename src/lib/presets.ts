export interface PresetLocation {
  name: string;
  city: 'Bengaluru' | 'Delhi NCR' | 'Mumbai' | 'Hyderabad';
  lat: number;
  lng: number;
  tag: string;
  is_airport?: boolean;
}

export const ALL_PRESETS: PresetLocation[] = [
  // Bengaluru
  {
    name: "Kempegowda Int'l Airport (BLR) - T1 & T2",
    city: "Bengaluru",
    lat: 13.1986,
    lng: 77.7066,
    tag: "✈️ BLR Airport",
    is_airport: true,
  },
  {
    name: "Indiranagar 100ft Road, Bengaluru",
    city: "Bengaluru",
    lat: 12.9784,
    lng: 77.6408,
    tag: "📍 Indiranagar",
  },
  {
    name: "Koramangala 4th Block, Bengaluru",
    city: "Bengaluru",
    lat: 12.9345,
    lng: 77.6266,
    tag: "🏢 Koramangala",
  },
  {
    name: "Whitefield ITPL Main Road, Bengaluru",
    city: "Bengaluru",
    lat: 12.9863,
    lng: 77.7308,
    tag: "💼 Whitefield",
  },
  {
    name: "HSR Layout Sector 1 to 7, Bengaluru",
    city: "Bengaluru",
    lat: 12.9116,
    lng: 77.6474,
    tag: "📍 HSR Layout",
  },
  {
    name: "Electronic City Phase 1, Bengaluru",
    city: "Bengaluru",
    lat: 12.8452,
    lng: 77.6602,
    tag: "⚡ Electronic City",
  },
  {
    name: "Bellandur / EcoWorld Tech Park, Bengaluru",
    city: "Bengaluru",
    lat: 12.9260,
    lng: 77.6762,
    tag: "🏢 EcoWorld",
  },
  {
    name: "MG Road / Brigade Road, Bengaluru",
    city: "Bengaluru",
    lat: 12.9756,
    lng: 77.6066,
    tag: "🛍️ MG Road",
  },
  {
    name: "Manyata Tech Park, Nagavara, Bengaluru",
    city: "Bengaluru",
    lat: 13.0485,
    lng: 77.6212,
    tag: "🏢 Manyata",
  },

  // Delhi NCR
  {
    name: "IGI Airport (T3) - International & Domestic, Delhi",
    city: "Delhi NCR",
    lat: 28.5562,
    lng: 77.1000,
    tag: "✈️ IGI T3",
    is_airport: true,
  },
  {
    name: "IGI Airport (T1) - Domestic Terminal, Delhi",
    city: "Delhi NCR",
    lat: 28.5562,
    lng: 77.0999,
    tag: "✈️ IGI T1",
    is_airport: true,
  },
  {
    name: "Cyber City & DLF CyberHub, Gurugram",
    city: "Delhi NCR",
    lat: 28.4950,
    lng: 77.0895,
    tag: "🏢 Cyber City",
  },
  {
    name: "Connaught Place (Inner Circle), New Delhi",
    city: "Delhi NCR",
    lat: 28.6315,
    lng: 77.2167,
    tag: "📍 CP Central",
  },
  {
    name: "Aerocity Hospitality District, New Delhi",
    city: "Delhi NCR",
    lat: 28.5492,
    lng: 77.1215,
    tag: "🏨 Aerocity",
  },
  {
    name: "Golf Course Road & Sector 54, Gurugram",
    city: "Delhi NCR",
    lat: 28.4389,
    lng: 77.1054,
    tag: "📍 Golf Course Rd",
  },
  {
    name: "Sector 62 & Tech Zone, Noida",
    city: "Delhi NCR",
    lat: 28.6280,
    lng: 77.3649,
    tag: "🏢 Noida Sec 62",
  },
  {
    name: "South Extension & Defence Colony, New Delhi",
    city: "Delhi NCR",
    lat: 28.5728,
    lng: 77.2228,
    tag: "📍 South Ext",
  },

  // Mumbai
  {
    name: "CSMI Airport (T2) - International, Mumbai",
    city: "Mumbai",
    lat: 19.0896,
    lng: 72.8656,
    tag: "✈️ BOM T2",
    is_airport: true,
  },
  {
    name: "Bandra Kurla Complex (BKC), Mumbai",
    city: "Mumbai",
    lat: 19.0657,
    lng: 72.8687,
    tag: "💼 BKC",
  },
  {
    name: "Nariman Point & Marine Drive, South Mumbai",
    city: "Mumbai",
    lat: 18.9260,
    lng: 72.8235,
    tag: "🌊 Marine Drive",
  },
  {
    name: "Lower Parel / High Street Phoenix, Mumbai",
    city: "Mumbai",
    lat: 18.9953,
    lng: 72.8258,
    tag: "🏢 Lower Parel",
  },

  // Hyderabad
  {
    name: "Rajiv Gandhi Int'l Airport (RGIA), Hyderabad",
    city: "Hyderabad",
    lat: 17.2403,
    lng: 78.4294,
    tag: "✈️ HYD Airport",
    is_airport: true,
  },
  {
    name: "Hitec City / Cyber Towers, Hyderabad",
    city: "Hyderabad",
    lat: 17.4504,
    lng: 78.3808,
    tag: "🏢 Hitec City",
  },
  {
    name: "Gachibowli Financial District, Hyderabad",
    city: "Hyderabad",
    lat: 17.4401,
    lng: 78.3489,
    tag: "💼 Financial Dist",
  },
];
