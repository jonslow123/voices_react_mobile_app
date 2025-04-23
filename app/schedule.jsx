import React, { useState, useEffect } from 'react';
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
import TopBanner from '../components/TopBanner';
import { format, addDays, subDays } from 'date-fns';
import { BRAND_COLORS } from './styles/brandColors';
const { width, height } = Dimensions.get('window');

export default function ScheduleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timezone, setTimezone] = useState('Europe/London');
  
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);
  
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
    
    // This is a simplified version - you might need to adjust based on the exact structure
    shows.forEach(show => {
      const showDate = new Date(show.starts);
      const dateKey = showDate.toISOString().split('T')[0];
      
      if (!processedData[dateKey]) {
        processedData[dateKey] = [];
      }
      
      processedData[dateKey].push({
        id: show.id,
        name: show.name.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        start_timestamp: show.start_timestamp,
        end_timestamp: show.end_timestamp,
        show_start_hour: format(new Date(show.starts), 'HH:mm'),
        show_end_hour: format(new Date(show.ends), 'HH:mm'),
        is_past: new Date(show.ends) < new Date(),
        is_live: new Date(show.starts) < new Date() && new Date(show.ends) > new Date(),
      });
    });
    
    setScheduleData(processedData);
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
        <Text style={styles.showName}>{item.name}</Text>
        {item.is_live && (
          <View style={styles.liveIndicator}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
    </View>
  );
  
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const showsForSelectedDate = scheduleData[selectedDateKey] || [];
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={{
        backgroundColor: 'black',
        paddingTop: Platform.OS === 'ios' ? statusBarHeight : 0,
      }}>
        <TopBanner />
      </SafeAreaView>
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
        </TouchableOpacity>
        <Text style={styles.title}>Schedule</Text>
        <View style={styles.placeholder} />
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
          data={showsForSelectedDate}
          renderItem={renderShow}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.divider,
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.accent,
  },
  placeholder: {
    width: 32,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: BRAND_COLORS.surface,
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