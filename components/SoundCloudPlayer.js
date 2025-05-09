import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { BRAND_COLORS } from '../app/styles/brandColors';

const SoundCloudPlayer = ({ trackId, onReady, onPlay, onPause, onEnded }) => {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  
  // SoundCloud player widget HTML
  const widgetHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: transparent;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <script src="https://w.soundcloud.com/player/api.js"></script>
      <script>
        var widget = SC.Widget(
          document.createElement('iframe')
        );
        
        document.getElementById('player').appendChild(widget.iframe);
        
        widget.load('https://api.soundcloud.com/tracks/${trackId}', {
          auto_play: false,
          show_artwork: true,
          visual: false,
          hide_related: true,
          show_comments: false,
          show_user: false,
          show_reposts: false,
          show_teaser: false,
          color: '${BRAND_COLORS.accent.replace('#', '')}'
        });
        
        widget.bind(SC.Widget.Events.READY, function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ready'
          }));
        });
        
        widget.bind(SC.Widget.Events.PLAY, function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'play'
          }));
        });
        
        widget.bind(SC.Widget.Events.PAUSE, function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pause'
          }));
        });
        
        widget.bind(SC.Widget.Events.FINISH, function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ended'
          }));
        });
        
        // Expose methods to control playback
        window.togglePlay = function() {
          widget.toggle();
        };
        
        window.pauseTrack = function() {
          widget.pause();
        };
        
        window.playTrack = function() {
          widget.play();
        };
      </script>
    </body>
    </html>
  `;
  
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          setLoading(false);
          onReady && onReady();
          break;
        case 'play':
          onPlay && onPlay();
          break;
        case 'pause':
          onPause && onPause();
          break;
        case 'ended':
          onEnded && onEnded();
          break;
      }
    } catch (error) {
      console.error('Error handling SoundCloud player message:', error);
    }
  };
  
  // Methods to control playback
  const play = () => {
    webViewRef.current?.injectJavaScript('playTrack(); true;');
  };
  
  const pause = () => {
    webViewRef.current?.injectJavaScript('pauseTrack(); true;');
  };
  
  const toggle = () => {
    webViewRef.current?.injectJavaScript('togglePlay(); true;');
  };
  
  // Expose methods via ref
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.play = play;
      webViewRef.current.pause = pause;
      webViewRef.current.toggle = toggle;
    }
  }, [webViewRef.current]);
  
  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: widgetHTML }}
        style={styles.webView}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        scrollEnabled={false}
        bounces={false}
      />
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  webView: {
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});

export default SoundCloudPlayer;