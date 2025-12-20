import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomAlertModal from "../../../components/CustomAlertModal";
import PinEntryModal from "../../../components/PinEntryModal";
import { useAuth } from "../../../context/auth-context";

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Previously used theme state, kept if needed later
  const [selectedTheme, setSelectedTheme] = useState("light");
  
  const router = useRouter();
  const { logout, user, setPin, removePin } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState("verify"); // 'set' or 'verify'
  const [removePinModalVisible, setRemovePinModalVisible] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, message: "" });

  // Helper function to get user-specific storage key
  const getStorageKey = useCallback((userId) => {
    return `@ediary:alarm_settings:${userId}`;
  }, []);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;
      
      try {
        const stored = await AsyncStorage.getItem(getStorageKey(user.id));
        if (stored) {
          const { enabled, time } = JSON.parse(stored);
          setNotificationsEnabled(enabled);
          setNotificationTime(new Date(time));
        } else {
            // Default: 9 PM, notifications DISABLED for new users
            const defaultTime = new Date();
            defaultTime.setHours(21, 0, 0, 0);
            setNotificationTime(defaultTime);
            setNotificationsEnabled(false);
        }
      } catch (e) {
        console.warn("Failed to load alarm settings", e);
      }
    };
    loadSettings();
  }, [user?.id, getStorageKey]);

  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Permission needed', 'Please enable notifications in your system settings.');
      return false;
    }
    
    return true;
  };

  const scheduleNotification = async (date) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: date.getHours(),
        minute: date.getMinutes(),
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "How was your day? 🌙",
        body: "Take a moment to write in your diary.",
        sound: true,
      },
      trigger,
    });
  };

  const toggleSwitch = async (value) => {
    if (value) {
      // Turning ON
      const hasPermission = await registerForPushNotificationsAsync();
      if (hasPermission) {
        await scheduleNotification(notificationTime);
        setNotificationsEnabled(true);
        saveSettings(true, notificationTime);
      } else {
        setNotificationsEnabled(false);
      }
    } else {
      // Turning OFF
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotificationsEnabled(false);
      saveSettings(false, notificationTime);
    }
  };

  const onTimeChange = async (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setNotificationTime(selectedDate);
      if (notificationsEnabled) {
          await scheduleNotification(selectedDate);
      }
      saveSettings(notificationsEnabled, selectedDate);
    }
  };

  const saveSettings = async (enabled, time) => {
    if (!user?.id) return;
    
    try {
      await AsyncStorage.setItem(getStorageKey(user.id), JSON.stringify({
        enabled,
        time: time.toISOString(),
      }));
    } catch (e) {
      console.warn("Failed to save settings", e);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };

  const handlePinToggle = () => {
    if (user?.hasPin) {
      setRemovePinModalVisible(true);
    } else {
      setPinMode("set");
      setPinModalVisible(true);
    }
  };

  const confirmRemovePin = async () => {
    try {
      await removePin();
      setRemovePinModalVisible(false);
      setSuccessModal({ visible: true, message: "Security PIN removed successfully" });
    } catch (e) {
      setRemovePinModalVisible(false);
      Alert.alert("Error", e.message);
    }
  };

  const handlePinSuccess = async (pin) => {
    try {
      if (pinMode === "set") {
        await setPin(pin);
        setPinModalVisible(false);
        setSuccessModal({ visible: true, message: "Security PIN set successfully" });
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Account</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/settings/personal-details")}
              style={[styles.row, styles.choiceRow]}
            >
              <Ionicons name="person" size={20} color="#FFA36C" />
              <Text style={styles.cardPrimary}>Personal Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Permission</Text>
            <View style={styles.row}>
              <Ionicons
                name="notifications"
                size={20}
                color="#FFA36C"
                style={styles.leadingIcon}
              />
              <TouchableOpacity
                style={styles.textGroup}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardPrimary}>Notifications</Text>
                <Text style={styles.cardSecondary}>
                  {notificationsEnabled 
                    ? `Daily reminder at ${formatTime(notificationTime)}`
                    : "Daily reminders off"}
                </Text>
              </TouchableOpacity>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleSwitch}
                trackColor={{ false: "#D7CBC2", true: "#FFE0CC" }}
                thumbColor={notificationsEnabled ? "#FFA36C" : "#F4F3F4"}
              />
            </View>
          </View>
        </View>

        {(showTimePicker || (Platform.OS === 'ios' && showTimePicker)) && (
            <DateTimePicker
                value={notificationTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={onTimeChange}
            />
        )}

        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Security</Text>
            <TouchableOpacity 
              style={styles.row} 
              activeOpacity={0.7}
              onPress={handlePinToggle}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FFA36C" />
              <Text style={styles.cardPrimary}>Security PIN</Text>
              <Text style={[styles.statusText, user?.hasPin && styles.statusActive]}>
                {user?.hasPin ? "Enabled" : "Not enrolled"}
              </Text>
              <Ionicons 
                name={user?.hasPin ? "checkmark-circle" : "chevron-forward"} 
                size={18} 
                color={user?.hasPin ? "#4CAF50" : "#B6ABA2"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Others</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/settings/trash")}
              style={[styles.row, styles.choiceRow]}
            >
              <Ionicons name="trash" size={18} color="#FFA36C" />
              <Text style={styles.cardPrimary}>Trash</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.row, styles.choiceRow]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <Ionicons name="log-out" size={18} color="#FFA36C" />
              <Text style={styles.cardPrimary}>
                {isLoggingOut ? "Logging out..." : "Log out"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <CustomAlertModal
        visible={logoutModalVisible}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        isDelete={false}
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={confirmLogout}
      />

      <CustomAlertModal
        visible={removePinModalVisible}
        title="Remove PIN"
        message="Are you sure you want to remove your security PIN?"
        confirmText="Remove"
        isDelete={true}
        onCancel={() => setRemovePinModalVisible(false)}
        onConfirm={confirmRemovePin}
      />

      <CustomAlertModal
        visible={successModal.visible}
        title="Success"
        message={successModal.message}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setSuccessModal({ ...successModal, visible: false })}
        onCancel={() => setSuccessModal({ ...successModal, visible: false })}
      />

      <PinEntryModal
        visible={pinModalVisible}
        mode={pinMode}
        onClose={() => setPinModalVisible(false)}
        onSuccess={handlePinSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F4F1",
  },
  content: {
    paddingTop: 30,
    paddingBottom: 64,
    paddingHorizontal: 28,
    gap: 18,
    alignItems: "stretch",
  },
  title: {
    fontSize: 26,
    color: "#3C3148",
    fontWeight: "700",
    textAlign: "center",
    alignSelf: "center",
    paddingBottom: 12,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#7E7874",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#FEFEFC",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E6DAD1",
    gap: 15,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardPrimary: {
    fontSize: 16,
    color: "#3C3148",
    fontWeight: "600",
    flex: 1,
  },
  cardSecondary: {
    fontSize: 13,
    color: "#B6ABA2",
    marginTop: 4,
  },
  leadingIcon: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  textGroup: {
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    color: "#B6ABA2",
    fontWeight: "500",
  },
  statusActive: {
    color: "#4CAF50",
  },
  choiceRow: {
    paddingRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0E6DC",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3C3148",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3C3148",
  },
});
