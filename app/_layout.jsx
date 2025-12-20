import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { LogBox, Platform, StyleSheet, View } from "react-native";

LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go",
]);

import { AuthProvider, useAuth } from "../context/auth-context";

import { DiaryProvider } from "../context/diary-context";
import PinLockScreen from "./pin-lock";

// Keep splash screen visible while we fetch auth state
if (SplashScreen && typeof SplashScreen.preventAutoHideAsync === 'function') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutContent() {
  const { user, initializing, sessionUnlocked, unlockSession } = useAuth();
  
  if (initializing) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="diary-view" />
        <Stack.Screen name="pin-lock" />
      </Stack>
      {user?.hasPin && !sessionUnlocked && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 99999 }]}>
          <PinLockScreen onUnlocked={unlockSession} />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <DiaryProvider>
        <RootLayoutContent />
      </DiaryProvider>
    </AuthProvider>
  );
}
