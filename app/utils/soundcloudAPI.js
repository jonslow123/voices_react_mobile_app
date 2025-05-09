import axios from 'axios';

const CLIENT_ID = 'NNLc87xjDYAgHuz8qGUNDAD2oX5rn47K';
const CLIENT_SECRET = 'DvbA0e1MsoWCBkc0aU2Ssjo1ssFNVKkd';
const VOICES_USERNAME = 'soundcloud:users:799229608';

// Cache for access token
let accessToken = null;
let tokenExpiry = null;

// Get access token with client credentials
const getAccessToken = async () => {
  console.log('📢 soundcloudAPI: getAccessToken called');
  
  // Check if token is still valid
  if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
    console.log('📢 soundcloudAPI: Using cached token, expires at:', tokenExpiry);
    return accessToken;
  }
  
  try {
    console.log('📢 soundcloudAPI: Fetching new access token');
    const response = await axios.post('https://api.soundcloud.com/oauth2/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials'
    });
    
    accessToken = response.data.access_token;
    // Set expiry time (typically 1 hour)
    tokenExpiry = new Date(new Date().getTime() + (response.data.expires_in * 1000));
    
    console.log('📢 soundcloudAPI: New token received, expires at:', tokenExpiry);
    console.log('📢 soundcloudAPI: Access token:', accessToken);
    return accessToken;
  } catch (error) {
    console.error('📢 soundcloudAPI ERROR: Failed to get access token:', error.message);
    if (error.response) {
      console.error('📢 soundcloudAPI ERROR response data:', error.response.data);
    }
    throw error;
  }
};

// Get tracks from Voices Radio account
export const getVoicesTracks = async (limit = 50, offset = 0) => {
  console.log(`📢 soundcloudAPI: getVoicesTracks called (limit: ${limit}, offset: ${offset})`);
  try {
    const token = await getAccessToken();
    console.log('📢 soundcloudAPI: Fetching tracks for Voices Radio account');
    console.log('https://api.soundcloud.com/users/${VOICES_USERNAME}/tracks')
    
    const response = await axios.get(`https://api.soundcloud.com/users/${VOICES_USERNAME}/tracks`, {
      params: {
        limit,
        offset
      },
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    
    console.log(`📢 soundcloudAPI: Retrieved ${response.data.length} tracks`);
    return response.data;
  } catch (error) {
    console.error('📢 soundcloudAPI ERROR: Failed to fetch tracks:', error.message);
    if (error.response) {
      console.error('📢 soundcloudAPI ERROR status:', error.response.status);
      console.error('📢 soundcloudAPI ERROR data:', error.response.data);
    }
    return [];
  }
};

// Search for tracks by artist name
export const searchTracksByArtist = async (artistName, limit = 10) => {
  console.log(`📢 soundcloudAPI: searchTracksByArtist called (artist: "${artistName}", limit: ${limit})`);
  try {
    const token = await getAccessToken();
    const searchQuery = `${artistName} ${VOICES_USERNAME}`;
    console.log(`📢 soundcloudAPI: Searching with query: "${searchQuery}"`);
    
    const response = await axios.get('https://api.soundcloud.com/tracks', {
      params: {
        q: searchQuery,
        limit
      },
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    
    console.log(`📢 soundcloudAPI: Found ${response.data.length} tracks for artist "${artistName}"`);
    return response.data;
  } catch (error) {
    console.error(`📢 soundcloudAPI ERROR: Failed to search tracks for artist "${artistName}":`, error.message);
    if (error.response) {
      console.error('📢 soundcloudAPI ERROR status:', error.response.status);
      console.error('📢 soundcloudAPI ERROR data:', error.response.data);
    }
    return [];
  }
};

// Get track details
export const getTrackDetails = async (trackId) => {
  console.log(`📢 soundcloudAPI: getTrackDetails called (trackId: ${trackId})`);
  try {
    const token = await getAccessToken();
    console.log(`📢 soundcloudAPI: Fetching details for track ID ${trackId}`);
    
    const response = await axios.get(`https://api.soundcloud.com/tracks/${trackId}`, {
      headers: {
        'Authorization': `OAuth ${token}`
      }
    });
    
    console.log(`📢 soundcloudAPI: Retrieved details for track "${response.data.title}"`);
    return response.data;
  } catch (error) {
    console.error(`📢 soundcloudAPI ERROR: Failed to fetch track ${trackId} details:`, error.message);
    if (error.response) {
      console.error('📢 soundcloudAPI ERROR status:', error.response.status);
      console.error('📢 soundcloudAPI ERROR data:', error.response.data);
    }
    return null;
  }
};

// Extract artist name from track title
export const extractArtistFromTitle = (title) => {
  console.log(`📢 soundcloudAPI: extractArtistFromTitle called for "${title}"`);
  
  // Common patterns: "Artist Name - Show Title" or "Show Title w/ Artist Name"
  const dashPattern = /^(.+?) -/;
  const withPattern = /w\/\s*(.+)$/i;
  
  let match = title.match(dashPattern);
  if (match && match[1]) {
    console.log(`📢 soundcloudAPI: Extracted artist "${match[1].trim()}" using dash pattern`);
    return match[1].trim();
  }
  
  match = title.match(withPattern);
  if (match && match[1]) {
    console.log(`📢 soundcloudAPI: Extracted artist "${match[1].trim()}" using "w/" pattern`);
    return match[1].trim();
  }
  
  console.log(`📢 soundcloudAPI: Could not extract artist from title "${title}"`);
  return null;
};

// Utility function to transform SoundCloud track to match Mixcloud format
export const transformTrackToMixcloudFormat = (track) => {
  console.log(`📢 soundcloudAPI: transformTrackToMixcloudFormat called for track ID ${track.id}`);
  
  // Extract artist name from title or user
  const artistName = extractArtistFromTitle(track.title) || track.user.username;
  
  const transformed = {
    _id: `sc-${track.id}`, // Prefixing with sc- to identify SoundCloud items
    key: `sc-${track.id}`,
    title: track.title,
    name: track.title,
    source: 'soundcloud',
    mixcloudPath: null,
    iframeUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${track.id}`,
    imageUrl: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : null,
    pictures: {
      extra_large: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : null
    },
    artistName: artistName,
    username: track.user.username,
    created_time: track.created_at,
    genres: track.genre ? [track.genre] : [],
    streamUrl: `${track.stream_url}?client_id=${CLIENT_ID}`
  };
  
  console.log(`📢 soundcloudAPI: Transformed track - Title: "${transformed.title}", Artist: "${transformed.artistName}"`);
  
  // Log a warning if no artwork is available
  if (!track.artwork_url) {
    console.warn(`📢 soundcloudAPI WARNING: No artwork found for track "${track.title}", ID: ${track.id}`);
  }
  
  return transformed;
};

export default {
  getVoicesTracks,
  searchTracksByArtist,
  getTrackDetails,
  extractArtistFromTitle,
  transformTrackToMixcloudFormat
};