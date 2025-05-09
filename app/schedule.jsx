import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import { format, addDays, subDays } from 'date-fns';
import { BRAND_COLORS } from './styles/brandColors';
const { width, height } = Dimensions.get('window');

function decodeHTMLEntities(text) {
  if (!text) return '';
  
  // Force conversion to string if not already a string
  const textStr = String(text);
  
  return textStr
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'");
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timezone, setTimezone] = useState('Europe/London');
  const flatListRef = useRef(null);
  const liveShowIndex = useRef(-1);
  const hasScrolledToLive = useRef(false);
  
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  useEffect(() => {
    fetchSchedule();
    
    // Reset the scroll flag when selected date changes
    hasScrolledToLive.current = false;
  }, [selectedDate]);
  
  // Separate effect to attempt scrolling once data is loaded
  useEffect(() => {
    if (!loading && liveShowIndex.current !== -1 && !hasScrolledToLive.current) {
      // We'll use a longer delay and multiple attempts to ensure FlatList is ready
      const scrollToLiveShow = () => {
        if (flatListRef.current) {
          try {
            flatListRef.current.scrollToIndex({
              index: liveShowIndex.current,
              animated: true,
              viewPosition: 0.3 // Position item about 1/3 from the top
            });
            hasScrolledToLive.current = true;
          } catch (error) {
            console.log('Scroll error (will retry):', error);
          }
        }
      };
      
      // Try multiple times with increasing delays to ensure FlatList is ready
      setTimeout(scrollToLiveShow, 500);
      setTimeout(scrollToLiveShow, 1000);
      setTimeout(scrollToLiveShow, 2000);
    }
  }, [loading]);
  
  const fetchSchedule = async () => {
    try {
      setLoading(true);
      
      // Get the timezone from the device or use the default
      const tz = encodeURIComponent(timezone);
      
      const response = await axios.get(
        `https://voicesradio.airtime.pro/api/week-info?timezone=${tz}`
      );
      
      if (response.data) {
        processScheduleData(response.data);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const processScheduleData = (weekInfo) => {
    // Process similar to your server code
    const weekInfoValues = Object.values(weekInfo).flat();
    
    // Filter objects (shows)
    const shows = weekInfoValues.filter(item => typeof item === 'object' && item !== null);
    
    // Group by day
    const processedData = {};
    
    // Reset the live show index
    liveShowIndex.current = -1;
    
    // This is a simplified version - you might need to adjust based on the exact structure
    shows.forEach(show => {
      const showDate = new Date(show.starts);
      const dateKey = showDate.toISOString().split('T')[0];
      
      if (!processedData[dateKey]) {
        processedData[dateKey] = [];
      }
      
      const isLive = new Date(show.starts) < new Date() && new Date(show.ends) > new Date();
      
      processedData[dateKey].push({
        id: show.id,
        name: decodeHTMLEntities(show.name),
        start_timestamp: show.start_timestamp,
        end_timestamp: show.end_timestamp,
        show_start_hour: format(new Date(show.starts), 'HH:mm'),
        show_end_hour: format(new Date(show.ends), 'HH:mm'),
        is_past: new Date(show.ends) < new Date(),
        is_live: isLive,
      });
    });
    
    setScheduleData(processedData);
    
    // Find the index of the live show in today's schedule
    const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
    const todayShows = processedData[selectedDateKey] || [];
    
    // Find the live show index
    const liveIndex = todayShows.findIndex(show => show.is_live);
    if (liveIndex !== -1) {
      liveShowIndex.current = liveIndex;
    }
  };
  
  const goToPreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };
  
  const goToNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };
  
  const renderShow = ({ item }) => (
    <View style={[
      styles.showItem,
      item.is_live && styles.liveShow,
      item.is_past && styles.pastShow
    ]}>
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{item.show_start_hour}</Text>
        <Text style={styles.timeText}>{item.show_end_hour}</Text>
      </View>
      <View style={styles.showInfo}>
        <Text style={styles.showName}>{decodeHTMLEntities(item.name)}</Text>
        {item.is_live && (
          <View style={styles.liveIndicator}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
    </View>
  );
  
  const handleScrollToIndexFailed = (info) => {
    // Handle the error when scrollToIndex fails
    console.log('Failed to scroll to index:', info);
    
    // Try a safer method - just scroll to offset with a best guess
    if (flatListRef.current) {
      const estimatedItemHeight = 88; // Adjust based on your item height
      const offset = estimatedItemHeight * liveShowIndex.current;
      
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToOffset({ 
            offset: offset, 
            animated: true 
          });
        } catch (e) {
          console.log('Scroll to offset also failed:', e);
        }
      }, 500);
    }
  };
  
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const showsForSelectedDate = scheduleData[selectedDateKey] || [];
  
  // Add a function to manually scroll to live show
  const scrollToLiveShow = () => {
    if (flatListRef.current && liveShowIndex.current !== -1) {
      try {
        flatListRef.current.scrollToIndex({
          index: liveShowIndex.current,
          animated: true,
          viewPosition: 0.3
        });
      } catch (error) {
        console.log('Manual scroll failed:', error);
        // Fallback to offset scroll
        const estimatedItemHeight = 88;
        flatListRef.current.scrollToOffset({
          offset: estimatedItemHeight * liveShowIndex.current,
          animated: true
        });
      }
    }
  };
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={{
        backgroundColor: 'black',
        paddingTop: Platform.OS === 'ios' ? statusBarHeight : 0,
      }}>
      </SafeAreaView>
      
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
          </TouchableOpacity>
          <Text style={styles.title}>Schedule</Text>
          <View style={{ width: 24 }} /> {/* Placeholder for symmetry */}
        </View>
        <View style={styles.dateSelector}>
          <TouchableOpacity 
            style={styles.dateNavButton} 
            onPress={goToPreviousDay}
          >
            <Ionicons name="chevron-back" size={24} color={BRAND_COLORS.accent} />
          </TouchableOpacity>
          <Text style={styles.dateText}>
            {format(selectedDate, 'EEEE dd/MM')}
          </Text>
          <TouchableOpacity 
            style={styles.dateNavButton} 
            onPress={goToNextDay}
          >
            <Ionicons name="chevron-forward" size={24} color={BRAND_COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      ) : showsForSelectedDate.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="gray" />
          <Text style={styles.emptyText}>No shows scheduled for this day</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={showsForSelectedDate}
          renderItem={renderShow}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          initialNumToRender={20} // Render more items initially
          maxToRenderPerBatch={20} // Increase batch size
          windowSize={10} // Increase window size
          removeClippedSubviews={false} // Keep components mounted
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
    marginTop: 5,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
  },
  liveShowButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 5,
  },
  dateNavButton: {
    padding: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: BRAND_COLORS.secondaryText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: BRAND_COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  showItem: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.card,
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  liveShow: {
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.live,
  },
  pastShow: {
    opacity: 0.6,
  },
  timeContainer: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 14,
    color: BRAND_COLORS.secondaryText,
  },
  showInfo: {
    flex: 1,
  },
  showName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
  },
  liveIndicator: {
    backgroundColor: BRAND_COLORS.live,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  liveText: {
    color: BRAND_COLORS.primaryText,
    fontSize: 12,
    fontWeight: 'bold',
  },
});