import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/auth-context";

export default function PinLockScreen({ onUnlocked }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { getAuthToken } = useAuth();

  const handlePress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError("");

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (completedPin) => {
    try {
      setIsVerifying(true);
      const token = await getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: completedPin }),
      });

      const data = await response.json();

      if (response.ok) {
        onUnlocked();
      } else {
        setError("Incorrect PIN");
        Vibration.vibrate(500);
        setPin("");
      }
    } catch (e) {
      setError("Verification failed");
      setPin("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            pin.length > i && styles.dotFilled,
            error && styles.dotError,
          ]}
        />
      );
    }
    return dots;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="lock-closed" size={64} color="#FFA36C" style={styles.icon} />
        <Text style={styles.logoText}>EDIARY</Text>
        <Text style={[styles.title, error && styles.titleError]}>
          {error || "Enter Security PIN"}
        </Text>
        <View style={styles.dotsContainer}>{renderDots()}</View>
      </View>

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.key}
            onPress={() => handlePress(num.toString())}
            disabled={isVerifying}
          >
            <Text style={styles.keyText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.keyEmpty} />
        <TouchableOpacity
          style={styles.key}
          onPress={() => handlePress("0")}
          disabled={isVerifying}
        >
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.key} 
          onPress={handleBackspace}
          disabled={isVerifying}
        >
          <Ionicons name="backspace-outline" size={28} color="#3C3148" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F4F1",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    marginBottom: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#3C3148",
    letterSpacing: 2,
    marginBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#7E7874",
    marginBottom: 32,
  },
  titleError: {
    color: "#E2725B",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 24,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D7CBC2",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: "#FFA36C",
    borderColor: "#FFA36C",
  },
  dotError: {
    borderColor: "#E2725B",
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  key: {
    width: "33.33%",
    height: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  keyEmpty: {
    width: "33.33%",
    height: 90,
  },
  keyText: {
    fontSize: 32,
    color: "#3C3148",
    fontWeight: "600",
  },
});
