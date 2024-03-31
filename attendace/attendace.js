import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Alert,
  Button,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import * as LocalAuthentication from "expo-local-authentication";
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Font from "expo-font";
const screenWidth = Dimensions.get("window").width;

const CDS_LOCATION = {
  latitude: 9.0716717,
  longitude: 7.3593017,
  radius: 6371000, // Specify the radius in meters
};

const userDetails = {
  date: "20 February 2024",
  stateCode: "NYSC123456",
  name: "John Doe",
  callupNumber: "ABCD123456",
  cdsName: "Community Development Service",
  totalAttendance: 30,
};

export default function App() {
  const [location, setLocation] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [disableFingerprintScan, setDisableFingerprintScan] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userDetailsSent, setUserDetailsSent] = useState(false);
  const [isFontLoaded, setIsFontLoaded] = useState(false);
  const [distance, setDistance] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  useEffect(() => {
    const loadFont = async () => {
      await Font.loadAsync({
        Poppins: require("./../assets/Poppins/Poppins-Regular.ttf"),
        "Poppins-Bold": require("./../assets/Poppins/Poppins-Bold.ttf"),
      });
      setIsFontLoaded(true);
    };

    loadFont();
  }, []);

  useEffect(() => {
    getLocation();
  }, []);
  const earthRadiusInMeters = 6371000; // Earth's radius in meters
  const calculateDistance = (userCoords, cdsCoords) => {
    const lat1 = userCoords.latitude * (Math.PI / 180);
    const lon1 = userCoords.longitude * (Math.PI / 180);
    const lat2 = cdsCoords.latitude * (Math.PI / 180);
    const lon2 = cdsCoords.longitude * (Math.PI / 180);

    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;

    const a =
      Math.sin(dlat / 2) * Math.sin(dlat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = earthRadiusInMeters * c;

    setDistance(distance);

    return distance;
  };
  // Function to check if coordinates are within a specified radius
  const isWithinRadius = (userCoords, cdsCoords, radius) => {
    const R = earthRadiusInMeters; // Earth radius in meters
    const lat1 = userCoords.latitude * (Math.PI / 180);
    const lon1 = userCoords.longitude * (Math.PI / 180);
    const lat2 = cdsCoords.latitude * (Math.PI / 180);
    const lon2 = cdsCoords.longitude * (Math.PI / 180);
    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;
    const a =
      Math.sin(dlat / 2) * Math.sin(dlat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radius;
  };
  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission denied");
        throw new Error("Location permission not granted");
      }

      let { coords } = await Location.getCurrentPositionAsync();

      if (
        !coords ||
        typeof coords.latitude !== "number" ||
        typeof coords.longitude !== "number"
      ) {
        console.error(
          "Invalid coordinates received from location services:",
          coords
        );
        throw new Error("Invalid coordinates received from location services");
      }

      const distance = calculateDistance(coords, CDS_LOCATION);

      if (distance > CDS_LOCATION.radius) {
        Alert.alert("Warning", "You are outside the specified radius.");
      }

      console.log("Latitude:", coords.latitude);
      console.log("Longitude:", coords.longitude);

      setLocation(coords);
      setLoadingLocation(false);

      // Return latitude and longitude directly
      return { latitude: coords.latitude, longitude: coords.longitude };
    } catch (error) {
      console.error("Error in getLocation:", error);

      // Handle different error scenarios and show appropriate alerts
      if (error.message === "Location permission not granted") {
        Alert.alert(
          "Location Error",
          "Location permission not granted. Please enable location services."
        );
      } else {
        Alert.alert(
          "Location Error",
          "An error occurred while fetching location. Please try again later."
        );
      }

      setLoadingLocation(false);
      return { latitude: null, longitude: null, distance: null };
    }
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const locationResult = await getLocation();
        setLocation(locationResult);
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    };

    fetchLocation();
  }, []);
  const handleFingerprintScan = async () => {
    try {
      if (loadingLocation) {
        console.log("Location is still loading...");
        return;
      }

      if (
        !location ||
        typeof location.latitude !== "number" ||
        typeof location.longitude !== "number"
      ) {
        // Check if location or its latitude/longitude properties are undefined or not numbers
        setFailedAttempts(failedAttempts + 1);
        if (failedAttempts >= 4) {
          setDisableFingerprintScan(true);
          Alert.alert(
            "Warning",
            "You have been reported for multiple failed attempts. Further attempts are disabled. Please ensure you are at CDS location.",
            [{ text: "OK", onPress: () => reportUser() }]
          );
          return;
        }
        Alert.alert(
          "Location Error",
          "Location information is unavailable. Please make sure location services are enabled and try again.",
          [
            {
              text: "OK",
              onPress: () => console.log("Location alert dismissed"),
            },
          ]
        );
        return;
      }

      const userCoords = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      const cdsCoords = {
        latitude: CDS_LOCATION.latitude,
        longitude: CDS_LOCATION.longitude,
      };
      const radius = 400;

      if (!isWithinRadius(userCoords, cdsCoords, radius)) {
        Alert.alert(
          "Location Error",
          "You must be within CDS location to proceed with the fingerprint scan.",
          [
            {
              text: "OK",
              onPress: () => console.log("Location alert dismissed"),
            },
          ]
        );
        return;
      }

      setFailedAttempts(0);
      let results = await LocalAuthentication.authenticateAsync({
        promptMessage: "Scan your fingerprint", // Set a custom prompt message
        cancelLabel: "Use Password", // Change the label for using the password
        disableDeviceFallback: true, // Prevent fallback to password
      });
      if (results.success) {
        setAuthenticated(true);
        sendAttendanceConfirmation();
      } else {
        Alert.alert(
          "Fingerprint Scan Failed",
          "We were unable to verify your identity using the fingerprint scan. Please make sure your fingerprint is properly placed on the sensor and try again. If the issue persists, consider using an alternative authentication method or contact support for assistance.",
          [
            {
              text: "OK",
              onPress: () =>
                console.log("Fingerprint scan failed: Alert dismissed"),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error in handleFingerprintScan:", error);
    }
  };
  const reportUser = () => {
    Alert.alert(
      "Reported",
      "You have been reported for fraudulent attempts. Disciplinary action may be taken.",
      [{ text: "OK", onPress: () => console.log("User reported") }]
    );
  };
  const sendAttendanceConfirmation = () => {
    if (!userDetailsSent) {
      console.log("User Details on Successful Attendance:", userDetails);
      setUserDetailsSent(true); // Set userDetailsSent to true to indicate that details have been sent
    }
    setShowUserDetails(true);
  };
  const handleConfirm = () => {
    setShowUserDetails(false);
    // Additional logic for handling confirmation, e.g., navigating to a new screen
  };

  // Alert.alert(
  //   "Warning: Unauthorized Access",
  //   `You are currently ${distance} meters away from the CDS location.`
  // );
  return (
    <View style={styles.container}>
      {location && authenticated ? (
        showUserDetails ? (
          <UserDetailsComponent
            userDetails={userDetails}
            onConfirm={handleConfirm}
          />
        ) : (
          <Button
            title="Confirm Attendance"
            onPress={sendAttendanceConfirmation}
          />
        )
      ) : (
        <Button
          title="Scan Fingerprint"
          onPress={handleFingerprintScan}
          disabled={disableFingerprintScan}
        />
      )}
   <Text style={{ color: "#555", fontWeight: "bold" }}>{distance}</Text>
    </View>
  );
}

const getAttendanceColor = () => {
  const attendance = userDetails.totalAttendance;
  if (attendance >= 0 && attendance <= 40) return "red";
  if (attendance >= 41 && attendance <= 50) return "yellow";
  if (attendance >= 51 && attendance <= 69) return "orange";
  if (attendance >= 70 && attendance <= 100) return "green";
  return "black"; // Default color if attendance is not in any specified range
};

const UserDetailsComponent = ({ userDetails, onConfirm }) => {
  const getAttendanceColor = () => {
    const attendance = userDetails.totalAttendance;
    if (attendance >= 0 && attendance <= 40) return "red";
    if (attendance >= 41 && attendance <= 50) return "yellow";
    if (attendance >= 51 && attendance <= 69) return "orange";
    if (attendance >= 70 && attendance <= 100) return "green";
    return "black"; // Default color if attendance is not in any specified range
  };

  return (
    <Animated.View style={{ ...styles.userDetailsContainer }}>
      <Text style={{ ...styles.successMessage }}>Attendance Confirmed!</Text>
      <Text style={{ ...styles.userDetailsText }}>
        Date: {userDetails.date}
      </Text>
      <Text style={{ ...styles.userDetailsText }}>
        State Code: {userDetails.stateCode}
      </Text>
      <Text style={{ ...styles.userDetailsText }}>
        Name: {userDetails.name}
      </Text>
      <Text style={{ ...styles.userDetailsText }}>
        Callup Number: {userDetails.callupNumber}
      </Text>
      <Text style={{ ...styles.userDetailsText }}>
        CDS Name: {userDetails.cdsName}
      </Text>
      <Text
        style={{
          ...styles.userDetailsText,
          color: getAttendanceColor(),
        }}
      >
        Total Attendance: {userDetails.totalAttendance}%
      </Text>
      <Button title="Done" onPress={onConfirm} style={{ width: "100%" }} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  userDetailsContainer: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 1,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  userDetailsText: {
    fontSize: 14,
    marginVertical: 5,
    textAlign: "left",
    color: "#555",
    fontFamily: "Poppins",
  },
  successMessage: {
    fontSize: 20,
    fontWeight: "bold",
    color: "green",
    marginBottom: 10,
    fontFamily: "Poppins-Bold",
  },
  confirmButton: {
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    width: "100%",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Poppins",
  },
});
