import React, { createContext, useContext, useState, useEffect } from 'react';

export const TRANSLATIONS = {
  en: {
    // Portal labels
    lang_name: 'English',
    switch_lang: 'हिंदी में देखें',
    citizen_portal_title: 'Citizen Safety & Early Warning',
    citizen_portal_sub: '24x7 Citizen Safety Network • Disaster Assistance',
    gov_portal_title: 'Government of India',
    ndma_title: 'National Disaster Management Authority (NDMA)',
    restricted_badge: 'RESTRICTED OFFICIAL ACCESS • NIC VERIFIED',
    switch_to_gov: 'Official Government Portal',
    switch_to_citizen: 'Public Citizen Portal',
    
    // Citizen Nav
    nav_home: 'Home',
    nav_community_reports: 'Community Reports',
    nav_risk_map: 'Risk Map',
    nav_citizen_login: 'Citizen Login',
    nav_profile: 'Profile',
    sos_call: 'Dial 112 (National SOS)',

    // Government Nav
    gov_home: 'Home',
    gov_about: 'About',
    gov_disasters: 'Disaster Information',
    gov_alerts: 'Live Alerts',
    gov_risk_map: 'Risk Map',
    gov_habitations: 'Habitations',
    gov_capacity: 'Capacity',
    gov_relocation: 'Relocation',
    gov_rescue_teams: 'Rescue Teams',
    gov_analytics: 'Analytics',
    gov_resources: 'Resources',
    gov_officer_login: 'Officer Login',
    gov_sign_out: 'Sign Out Officer Session',

    // Citizen Home
    citizen_hero_tag: 'Government Certified Citizen Safety Portal',
    citizen_hero_h1_1: 'Your Safety in Disasters,',
    citizen_hero_h1_2: 'Every Second, Every Step With You.',
    citizen_hero_desc: 'DIASTRA Citizen Safety Network connects you with immediate rescue assistance, nearest verified relief shelters, and live official weather warnings in your local district.',
    btn_report_sos: 'Report Hazard / SOS',
    btn_find_shelter: 'Find Safe Shelters Near Me',
    emergency_dial_title: 'Emergency Fast Dial',
    emergency_dial_sub: 'Toll-free 24x7 response desk',
    services_title: 'Citizen Protection Services',
    services_sub: 'Immediate tools for residents, families, and neighborhood volunteers',
    card1_title: 'Community Hazard Report',
    card1_desc: 'Notice rising river levels, landslides, road blocks, or trapped families? Submit an alert with GPS coordinates and photos for district verification.',
    card1_btn: 'Submit Incident Report',
    card2_title: 'Safe Shelters & Risk Map',
    card2_desc: 'Locate government-vetted cyclone shelters, relief camps, schools, and hospitals with available beds, safe drinking water, and backup power generators.',
    card2_btn: 'View Map & Evacuation Routes',
    card3_title: 'Citizen Profile & Alerts',
    card3_desc: 'Log in with your mobile number to track the status of your submitted reports, save family emergency contacts, and receive localized SMS/WhatsApp warnings.',
    advisories_title: 'Live District Advisories & Early Warnings',
    advisories_sub: 'Synced from IMD & CWC Feeds',
    kit_title: 'Interactive 72-Hour Family Survival Kit Checklist',
    kit_sub: 'Tick items as you pack them before evacuating or during high-alert advisories.',
    kit_progress: 'Kit Preparedness',
    dos_donts_title: 'Life-Saving Guidelines: Do\'s & Don\'ts',
    dos_donts_sub: 'Standard operating procedures for citizens during active hazards',
    gov_cta_title: 'Are you an authorized Disaster Response Officer?',
    gov_cta_desc: 'District Magistrates, NDRF Commanders, and SDMA directors can access the unified Government Command Dashboard with multi-hazard GIS layers, evacuation algorithms, and automated shelter allocation gap tools.',
    gov_cta_btn: 'Enter Government Portal',
  },
  hi: {
    // Portal labels
    lang_name: 'हिन्दी',
    switch_lang: 'View in English',
    citizen_portal_title: 'नागरिक सुरक्षा एवं त्वरित चेतावनी',
    citizen_portal_sub: '24x7 नागरिक सुरक्षा नेटवर्क • आपदा सहायता',
    gov_portal_title: 'भारत सरकार',
    ndma_title: 'राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA)',
    restricted_badge: 'प्रतिबंधित आधिकारिक पहुंच • एनआईसी सत्यापित',
    switch_to_gov: 'आधिकारिक सरकारी पोर्टल',
    switch_to_citizen: 'नागरिक सुरक्षा पोर्टल',

    // Citizen Nav
    nav_home: 'मुख्य पृष्ठ',
    nav_community_reports: 'सामुदायिक रिपोर्ट',
    nav_risk_map: 'जोखिम मानचित्र',
    nav_citizen_login: 'नागरिक लॉगिन',
    nav_profile: 'मेरी प्रोफाइल',
    sos_call: 'डायल 112 (राष्ट्रीय आपातकाल)',

    // Government Nav
    gov_home: 'कमांड होम',
    gov_about: 'परिचय',
    gov_disasters: 'आपदा सूचना',
    gov_alerts: 'सजीव चेतावनियां',
    gov_risk_map: 'जोखिम मानचित्र',
    gov_habitations: 'संवेदनशील बस्तियां',
    gov_capacity: 'आश्रय क्षमता',
    gov_relocation: 'पुनर्वास योजना',
    gov_rescue_teams: 'बचाव दल (NDRF)',
    gov_analytics: 'डेटा विश्लेषण',
    gov_resources: 'राहत संसाधन',
    gov_officer_login: 'अधिकारी लॉगिन',
    gov_sign_out: 'अधिकारी सत्र समाप्त करें',

    // Citizen Home
    citizen_hero_tag: 'सरकारी प्रमाणित नागरिक सुरक्षा पोर्टल',
    citizen_hero_h1_1: 'आपदा में आपकी सुरक्षा,',
    citizen_hero_h1_2: 'हर पल, हर कदम आपके साथ।',
    citizen_hero_desc: 'DIASTRA नागरिक सुरक्षा नेटवर्क आपको त्वरित बचाव सहायता, नजदीकी सत्यापित राहत आश्रयों और आपके जिले में आधिकारिक मौसम चेतावनियों से जोड़ता है।',
    btn_report_sos: 'आपदा रिपोर्ट / आपातकालीन SOS',
    btn_find_shelter: 'नजदीकी सुरक्षित आश्रय खोजें',
    emergency_dial_title: 'आपातकालीन त्वरित डायल',
    emergency_dial_sub: 'टोल-फ्री 24x7 प्रतिक्रिया डेस्क',
    services_title: 'नागरिक सुरक्षा सेवाएं',
    services_sub: 'नागरिकों, परिवारों और स्वयंसेवकों के लिए तत्काल उपयोगी साधन',
    card1_title: 'सामुदायिक आपदा रिपोर्ट',
    card1_desc: 'जलस्तर में वृद्धि, भूस्खलन, सड़क अवरोध या फंसे हुए परिवारों को देखा? जिला प्रशासन के सत्यापन हेतु जीपीएस स्थान और फोटो के साथ तत्काल सूचना भेजें।',
    card1_btn: 'घटना रिपोर्ट दर्ज करें',
    card2_title: 'सुरक्षित आश्रय एवं मानचित्र',
    card2_desc: 'उपलब्ध बिस्तर, सुरक्षित पेयजल और बैकअप जनरेटर वाले सरकार द्वारा सत्यापित चक्रवात आश्रयों, स्कूलों और राहत शिविरों का पता लगाएं।',
    card2_btn: 'नक्शा और निकासी मार्ग देखें',
    card3_title: 'नागरिक प्रोफाइल एवं चेतावनियां',
    card3_desc: 'अपनी भेजी गई रिपोर्टों की स्थिति देखने, पारिवारिक आपातकालीन संपर्क सुरक्षित करने और स्थानीय चेतावनी पाने के लिए मोबाइल नंबर से लॉगिन करें।',
    advisories_title: 'सजीव जिला चेतावनियां एवं पूर्व सूचनाएं',
    advisories_sub: 'आईएमडी और सीडब्ल्यूसी से सीधे अपडेट',
    kit_title: '72-घंटे का पारिवारिक आपातकालीन सर्वाइवल किट',
    kit_sub: 'निकासी से पहले या उच्च चेतावनी के दौरान आवश्यक वस्तुओं को पैक करते समय टिक करें।',
    kit_progress: 'किट की तैयारी',
    dos_donts_title: 'जीवन रक्षक दिशानिर्देश: क्या करें और क्या न करें',
    dos_donts_sub: 'सक्रिय आपदाओं के दौरान नागरिकों के लिए मानक सुरक्षा उपाय',
    gov_cta_title: 'क्या आप अधिकृत आपदा प्रबंधन अधिकारी हैं?',
    gov_cta_desc: 'जिला मजिस्ट्रेट, एनडीआरएफ कमांडेंट और एसडीएमए निदेशक मल्टी-हजार्ड जीआईएस लेयर्स, निकासी एल्गोरिदम और आश्रय आवंटन उपकरणों के लिए सरकारी कमांड सेंटर में प्रवेश कर सकते हैं।',
    gov_cta_btn: 'सरकारी पोर्टल में प्रवेश करें',
  }
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('diastra_language') || 'en';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('diastra_language', lang);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
  };

  const toggleLanguage = () => {
    const next = language === 'en' ? 'hi' : 'en';
    setLanguage(next);
  };

  useEffect(() => {
    const handleLangEvent = (e) => {
      if (e.detail && (e.detail === 'en' || e.detail === 'hi')) {
        setLanguageState(e.detail);
      }
    };
    window.addEventListener('languageChanged', handleLangEvent);
    return () => window.removeEventListener('languageChanged', handleLangEvent);
  }, []);

  const t = (key) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
