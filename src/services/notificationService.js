/**
 * Emergency Notification Service
 * Native Web Push, Web Audio Alert Chime & Backend Subscriber Sync
 */

// Generate or retrieve persistent local device token
export function getOrCreateDeviceToken() {
  let token = localStorage.getItem('aasra_device_token') || localStorage.getItem('diastra_device_token');
  if (!token) {
    token = 'fcm_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('aasra_device_token', token);
  }
  return token;
}

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser permission state ('default', 'granted', 'denied')
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Synthesize an emergency alert chime using Web Audio API (Zero external assets needed)
 */
export function playEmergencyAlertChime(type = 'warning') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'critical' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    if (type === 'critical') {
      // Rapid two-tone warning
      playTone(880, 0, 0.2);
      playTone(700, 0.22, 0.25);
      playTone(880, 0.5, 0.2);
      playTone(700, 0.72, 0.35);
    } else {
      // Pleasant alert chime
      playTone(523.25, 0, 0.15); // C5
      playTone(659.25, 0.15, 0.15); // E5
      playTone(783.99, 0.3, 0.3); // G5
    }
  } catch {
    // AudioContext blocked or not supported
  }
}

/**
 * Request browser notification permission and register token to backend
 */
export async function requestNotificationPermission(subscriberName = 'Citizen Device', district = 'All Districts', phoneNumber = null) {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { permission, token: null };
  }

  const token = getOrCreateDeviceToken();

  // Register with backend database
  try {
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriber_name: subscriberName,
        token: token,
        phone_number: phoneNumber,
        district: district,
        alert_rain: true,
        alert_flood: true,
        alert_earthquake: true,
        alert_landslide: true,
      }),
    }).catch(async () => {
      await fetch('http://127.0.0.1:8000/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriber_name: subscriberName,
          token: token,
          phone_number: phoneNumber,
          district: district,
          alert_rain: true,
          alert_flood: true,
          alert_earthquake: true,
          alert_landslide: true,
        }),
      });
    });
  } catch (err) {
    console.warn('Backend subscription sync warning:', err);
  }

  // Play confirmation chime
  playEmergencyAlertChime('standard');

  return { permission, token };
}

/**
 * Trigger a real browser desktop notification
 */
export function displayDesktopNotification(title, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const severity = options.severity || 'warning';
  playEmergencyAlertChime(severity === 'Critical' ? 'critical' : 'standard');

  try {
    const notif = new Notification(title, {
      body: options.body || options.message || '',
      icon: '/aasra-logo.png',
      badge: '/favicon.png',
      tag: options.tag || 'aasra-alert-' + Date.now(),
      requireInteraction: severity === 'Critical',
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (err) {
    console.error('Desktop notification failed:', err);
    return false;
  }
}

/**
 * Send test emergency alert from backend and display desktop notification
 */
export async function sendTestHazardAlert(hazardType, district = 'Chamoli') {
  let res = await fetch('/api/notifications/dispatch-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hazard_type: hazardType, district }),
  }).catch(() => null);

  if (!res || !res.ok) {
    res = await fetch('http://127.0.0.1:8000/api/notifications/dispatch-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazard_type: hazardType, district }),
    });
  }

  if (!res.ok) throw new Error('Failed to dispatch test notification');
  const data = await res.json();
  const alert = data.alert;

  // Trigger actual desktop notification
  displayDesktopNotification(alert.title, {
    body: alert.message,
    severity: alert.severity,
  });

  return alert;
}

/**
 * Synthesize spoken emergency announcement using Web Speech API (Hindi & English)
 * @param {string} text
 * @param {'hi-IN' | 'en-IN' | 'en-US'} lang
 */
export function speakEmergencyAnnouncement(text, lang = 'hi-IN') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

  try {
    // Cancel any ongoing speech to avoid overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.92; // Slightly measured pace for emergency audio clarity
    utterance.pitch = 1.05;

    // Select suitable regional voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const match = voices.find(
        (v) => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2))
      );
      if (match) utterance.voice = match;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis warning:', err);
    return false;
  }
}

/**
 * Generate OASIS CAP v1.2 Compliant XML String for NDMA / International Interoperability
 */
export function generateCAPAlertXML(alertData = {}) {
  const identifier = alertData.cap_id || `DISASTER-CAP-${alertData.id || Date.now()}`;
  const sender = alertData.sender || 'deoc-control-room@disaster-dss.gov.in';
  const sent = alertData.dispatched_at ? new Date(alertData.dispatched_at).toISOString() : new Date().toISOString();
  const title = alertData.title || 'Emergency Multi-Hazard Alert';
  const message = alertData.message || 'Critical emergency threshold exceeded. Evacuate immediately.';
  const severity = alertData.severity === 'Critical' ? 'Extreme' : 'Severe';
  const district = alertData.district || 'All Sectors';

  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${identifier}</identifier>
  <sender>${sender}</sender>
  <sent>${sent}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <code>DISASTER_NDMA_ALERT_V1</code>
  <info>
    <category>Met</category>
    <category>Geo</category>
    <event>${title}</event>
    <urgency>Immediate</urgency>
    <severity>${severity}</severity>
    <certainty>Observed</certainty>
    <eventCode>
      <valueName>SAME</valueName>
      <value>EAN</value>
    </eventCode>
    <headline>${title} for ${district} Sector</headline>
    <description>${message}</description>
    <instruction>Evacuate to designated disaster relief shelters immediately. Avoid low-lying riverbeds and unstable slopes. Tune into emergency radio 1077.</instruction>
    <web>https://disaster-dss.gov.in/emergency-alerts</web>
    <contact>State Disaster Emergency Operation Center (1077 / 112)</contact>
    <area>
      <areaDesc>${district} Disaster Zone</areaDesc>
      <circle>30.38,79.33,15.0</circle>
    </area>
  </info>
</alert>`.trim();
}

/**
 * Download CAP Alert File as XML or JSON
 */
export function downloadCAPAlertFile(alertData = {}, format = 'xml') {
  let content = '';
  let filename = '';
  let mimeType = '';

  if (format === 'xml') {
    content = generateCAPAlertXML(alertData);
    filename = `CAP_Alert_${alertData.id || Date.now()}.xml`;
    mimeType = 'application/xml;charset=utf-8;';
  } else {
    content = JSON.stringify(alertData, null, 2);
    filename = `CAP_Alert_${alertData.id || Date.now()}.json`;
    mimeType = 'application/json;charset=utf-8;';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Send real emergency SMS via Fast2SMS Indian Bulk Gateway or PRI Carrier Route
 */
export async function sendRealSMSAlert({ phoneNumbers, message, hazardType = 'Disaster Alert', district = 'Chamoli', apiKey = null, saveKey = false }) {
  const payload = {
    phone_numbers: Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers],
    message: message || '',
    hazard_type: hazardType,
    district: district,
    api_key: apiKey || null,
    save_key: Boolean(saveKey),
  };

  let res = await fetch('/api/notifications/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!res || !res.ok) {
    res = await fetch('http://127.0.0.1:8000/api/notifications/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to send SMS' }));
    throw new Error(errorData.detail || 'SMS dispatch request failed');
  }

  return await res.json();
}

/**
 * Check configuration status of SMS Gateway (Fast2SMS)
 */
export async function getSMSGatewayConfig() {
  let res = await fetch('/api/notifications/gateway-config').catch(() => null);
  if (!res || !res.ok) {
    res = await fetch('http://127.0.0.1:8000/api/notifications/gateway-config').catch(() => null);
  }
  if (!res || !res.ok) return { configured: false, provider: 'Fast2SMS India', masked_key: null };
  return await res.json();
}

/**
 * Save or remove Fast2SMS API Key
 */
export async function saveSMSGatewayConfig(apiKey) {
  let res = await fetch('/api/notifications/gateway-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fast2sms_api_key: apiKey }),
  }).catch(() => null);

  if (!res || !res.ok) {
    res = await fetch('http://127.0.0.1:8000/api/notifications/gateway-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fast2sms_api_key: apiKey }),
    });
  }

  if (!res.ok) throw new Error('Failed to update SMS gateway configuration');
  return await res.json();
}

/**
 * Format emergency alert into structured WhatsApp advisory message
 */
export function formatWhatsAppMessage({ title, message, district, shelterName, hazardType }) {
  const icon = hazardType === 'Rain' ? '🌧️' : hazardType === 'Flood' ? '🌊' : hazardType === 'Earthquake' ? '💥' : '⚠️';
  return (
    `🚨 *GOVERNMENT OF INDIA — DISASTER EVACUATION DIRECTIVE* 🚨\n` +
    `*Disaster Emergency Operation Center (DEOC) | NDMA Sachet Interop*\n\n` +
    `${icon} *HAZARD TYPE:* ${hazardType ? hazardType.toUpperCase() : 'MULTI-HAZARD EVENT'}\n` +
    `📍 *AFFECTED SECTOR:* ${district || 'Affected Area'} Basin\n` +
    `⚠️ *DIRECTIVE:* ${title || 'Immediate Evacuation Order'}\n\n` +
    `📢 *OFFICIAL ADVISORY:*\n${message || 'Immediate evacuation ordered. Avoid river channels, weak bridges, and unstable slopes.'}\n\n` +
    `🏛️ *DESIGNATED SAFE RELIEF SHELTER:*\n` +
    `*${shelterName || 'Government Inter College Campus'}*\n` +
    `• Distance: 1.8 km via Highway Transit Corridor\n` +
    `• Facilities: Medical Post, Food Relief, Clean Drinking Water\n` +
    `• Turn-by-Turn GPS Map: https://disaster-dss.gov.in/shelter-route\n\n` +
    `📞 *24x7 TOLL-FREE EMERGENCY HELPLINES:*\n` +
    `• State Emergency Control Room: *1077*\n` +
    `• National Emergency Response: *112*\n` +
    `• Ambulance Service: *108*\n\n` +
    `_Issued by State Disaster Management Authority in public safety interest._`
  );
}

/**
 * Generate 1-click WhatsApp deep link
 */
export function generateWhatsAppEmergencyLink({ phoneNumber, title, message, district, shelterName, hazardType }) {
  const formattedText = formatWhatsAppMessage({ title, message, district, shelterName, hazardType });
  const encoded = encodeURIComponent(formattedText);

  if (phoneNumber) {
    const cleaned = String(phoneNumber).replace(/\D/g, '');
    const finalPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    return `https://wa.me/${finalPhone}?text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

/**
 * Trigger opening WhatsApp alert in browser or app
 */
export function triggerWhatsAppAlert(params) {
  const link = generateWhatsAppEmergencyLink(params);
  if (typeof window !== 'undefined') {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
  return link;
}

