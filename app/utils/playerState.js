// app/utils/playerState.js
// Create a global state object
const playerState = {
    isMiniplayer: false,
    currentTrack: null,
    listeners: [],
    
    // Methods to update state
    setMiniPlayer(value, track) {
      this.isMiniplayer = value;
      this.currentTrack = track;
      this.notifyListeners();
    },
    
    // Add/remove listeners
    addListener(callback) {
      this.listeners.push(callback);
      return () => this.removeListener(callback);
    },
    
    removeListener(callback) {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    },
    
    notifyListeners() {
      this.listeners.forEach(callback => callback({
        isMiniplayer: this.isMiniplayer,
        currentTrack: this.currentTrack
      }));
    }
  };
  
  export default playerState;