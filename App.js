import {StyleSheet,View} from "react-native";
import React from "react";
import Attendance from "./attendace/attendace";

export default function App() {
  return (
    <View style={styles.container}>
      <Attendance />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  }
});
