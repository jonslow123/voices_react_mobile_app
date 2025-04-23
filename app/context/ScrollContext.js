import React, { createContext, useContext, useState } from 'react';

const ScrollContext = createContext();

export function ScrollProvider({ children }) {
  const [scrollPositions, setScrollPositions] = useState({
    artists: 0,
    home: 0,
    membership: 0
  });

  const updateScrollPosition = (screen, position) => {
    setScrollPositions(prev => ({
      ...prev,
      [screen]: position
    }));
  };

  const getScrollPosition = (screen) => {
    return scrollPositions[screen] || 0;
  };

  return (
    <ScrollContext.Provider value={{ updateScrollPosition, getScrollPosition }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll() {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
}

export default { ScrollProvider, useScroll };