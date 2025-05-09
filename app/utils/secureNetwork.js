
// Certificate hashes for your domains - get these from your backend team
const CERTIFICATES = {
  'api.mixcloud.com': ['sha256/HASH1', 'sha256/HASH2'],
  'voicesradio.out.airtime.pro': ['sha256/HASH3'],
  'api.yourbackend.com': ['sha256/HASH4']
};

export const fetchWithPinning = async (url) => {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`Network request failed: ${error.message}`);
    throw error;
  }
};

export default function DummyComponent() {
    return null;
  }