import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PinEntryModal({
  visible,
  onClose,
  onSuccess,
  title = "Enter PIN",
  mode = "verify", // 'verify', 'set', 'confirm'
  pinLength = 4,
}) {
  const [pin, setPin] = useState("");
  const [tempPin, setTempPin] = useState("");
  const [currentStep, setCurrentStep] = useState(mode); // 'set' -> 'confirm'
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setPin("");
      setTempPin("");
      setCurrentStep(mode);
      setError("");
    }
  }, [visible, mode]);

  const handlePress = (num) => {
    if (pin.length < pinLength) {
      const newPin = pin + num;
      setPin(newPin);
      setError("");

      if (newPin.length === pinLength) {
        handleComplete(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const handleComplete = (completedPin) => {
    if (currentStep === "set") {
      setTempPin(completedPin);
      setPin("");
      setCurrentStep("confirm");
    } else if (currentStep === "confirm") {
      if (completedPin === tempPin) {
        onSuccess(completedPin);
      } else {
        setError("PINs do not match");
        Vibration.vibrate(500);
        setPin("");
        setCurrentStep("set");
      }
    } else {
        // Mode 'verify'
        onSuccess(completedPin);
    }
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < pinLength; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            pin.length > i && styles.dotFilled,
            error && pin.length === 0 && styles.dotError,
          ]}
        />
      );
    }
    return dots;
  };

  const getTitle = () => {
    if (error) return error;
    if (currentStep === "set") return "Create a PIN";
    if (currentStep === "confirm") return "Confirm your PIN";
    return title;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#3C3148" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Ionicons name="lock-closed" size={48} color="#FFA36C" style={styles.icon} />
          <Text style={[styles.title, error && styles.titleError]}>{getTitle()}</Text>
          <View style={styles.dotsContainer}>{renderDots()}</View>
        </View>

        <View style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.key}
              onPress={() => handlePress(num.toString())}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.keyEmpty} />
          <TouchableOpacity
            style={styles.key}
            onPress={() => handlePress("0")}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={handleBackspace}>
            <Ionicons name="backspace-outline" size={28} color="#3C3148" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F4F1",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "flex-end",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3C3148",
    marginBottom: 32,
  },
  titleError: {
    color: "#E2725B",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
    paddingBottom: 40,
    paddingHorizontal: 30,
  },
  key: {
    width: "33.33%",
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  keyEmpty: {
    width: "33.33%",
    height: 80,
  },
  keyText: {
    fontSize: 28,
    color: "#3C3148",
    fontWeight: "600",
  },
});
