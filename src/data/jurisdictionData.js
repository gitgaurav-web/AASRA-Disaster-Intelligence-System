// =========================================================================
// AASRA INDIA JURISDICTION HIERARCHY (States & Districts Mapping)
// =========================================================================

export const STATE_DISTRICT_MAP = {
  Uttarakhand: [
    "Chamoli",
    "Rudraprayag",
    "Uttarkashi",
    "Tehri Garhwal",
    "Pithoragarh",
    "Dehradun",
    "Nainital",
  ],
  Bihar: [
    "Darbhanga",
    "Madhubani",
    "Supaul",
    "Saharsa",
    "Samastipur",
    "Patna",
    "Muzaffarpur",
  ],
  Kerala: [
    "Wayanad",
    "Idukki",
    "Kozhikode",
    "Malappuram",
    "Palakkad",
    "Ernakulam",
    "Thrissur",
  ],
  "Uttar Pradesh": [
    "Varanasi",
    "Prayagraj",
    "Gorakhpur",
    "Mirzapur",
    "Chandauli",
    "Ballia",
    "Lucknow",
  ],
  Assam: [
    "Dibrugarh",
    "Dhemaji",
    "Lakhimpur",
    "Kamrup",
    "Guwahati",
    "Majuli",
    "Barpeta",
  ],
  Odisha: [
    "Mayurbhanj",
    "Balasore",
    "Bhadrak",
    "Puri",
    "Kendrapara",
    "Jagatsinghpur",
    "Cuttack",
  ],
  Karnataka: [
    "Chamarajanagar",
    "Mysuru",
    "Kodagu",
    "Dakshina Kannada",
    "Udupi",
    "Uttara Kannada",
    "Bengaluru",
  ],
};

export const ALL_STATES = Object.keys(STATE_DISTRICT_MAP);

export const STATE_COORDINATES = {
  Uttarakhand: { center: [30.0668, 79.0193], zoom: 8 },
  Bihar: { center: [25.0961, 85.3131], zoom: 8 },
  Kerala: { center: [10.8505, 76.2711], zoom: 8 },
  "Uttar Pradesh": { center: [26.8467, 80.9462], zoom: 7 },
  Assam: { center: [26.2006, 92.9376], zoom: 7 },
  Odisha: { center: [20.9517, 85.0985], zoom: 7 },
  Karnataka: { center: [15.3173, 75.7139], zoom: 7 },
  national: { center: [22.8, 79.5], zoom: 5 },
  all: { center: [22.8, 79.5], zoom: 5 },
};

export const DISTRICT_COORDINATES = {
  national: { center: [22.8, 79.5], zoom: 5 },
  all: { center: [22.8, 79.5], zoom: 5 },
  Chamoli: { center: [30.4034, 79.324], zoom: 11 },
  chamoli: { center: [30.4034, 79.324], zoom: 11 },
  Darbhanga: { center: [26.1554, 85.8918], zoom: 11 },
  darbhanga: { center: [26.1554, 85.8918], zoom: 11 },
  Wayanad: { center: [11.6854, 76.132], zoom: 11 },
  wayanad: { center: [11.6854, 76.132], zoom: 11 },
  Varanasi: { center: [25.3176, 82.9739], zoom: 11 },
  varanasi: { center: [25.3176, 82.9739], zoom: 11 },
  Dibrugarh: { center: [26.1445, 91.7362], zoom: 11 },
  dibrugarh: { center: [26.1445, 91.7362], zoom: 11 },
  Mayurbhanj: { center: [21.9397, 86.3264], zoom: 11 },
  mayurbhanj: { center: [21.9397, 86.3264], zoom: 11 },
  Chamarajanagar: { center: [11.854, 76.6288], zoom: 11 },
  chamarajanagar: { center: [11.854, 76.6288], zoom: 11 },
};

export function getStateForDistrict(districtName) {
  if (!districtName) return null;
  const dNorm = districtName.toLowerCase().trim();
  for (const [state, districts] of Object.entries(STATE_DISTRICT_MAP)) {
    if (districts.some((d) => d.toLowerCase() === dNorm)) {
      return state;
    }
  }
  if (dNorm.includes("chamoli")) return "Uttarakhand";
  if (dNorm.includes("darbhanga")) return "Bihar";
  if (dNorm.includes("wayanad")) return "Kerala";
  if (dNorm.includes("varanasi")) return "Uttar Pradesh";
  if (dNorm.includes("dibrugarh")) return "Assam";
  if (dNorm.includes("mayurbhanj")) return "Odisha";
  if (dNorm.includes("chamarajanagar")) return "Karnataka";
  return null;
}

export function getDistrictsForState(stateName) {
  if (!stateName || stateName === "all") {
    const set = new Set();
    Object.values(STATE_DISTRICT_MAP).forEach((arr) => arr.forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }
  return STATE_DISTRICT_MAP[stateName] || [];
}
