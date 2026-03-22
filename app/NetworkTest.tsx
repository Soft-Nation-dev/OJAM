import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";

export default function NetworkTest() {
  const [status, setStatus] = useState<string>("Not tested yet");

  const testNetwork = async () => {
    try {
      const response = await fetch("https://www.google.com");
      if (response.ok) {
        setStatus("✅ Network is working!");
      } else {
        setStatus(`⚠️ Network reachable but returned status ${response.status}`);
      }
    } catch (err: any) {
      setStatus(`❌ Network error: ${err.message}`);
    }
  };

  useEffect(() => {
    // Optionally auto-test on mount
    testNetwork();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Test</Text>
      <Text style={styles.status}>{status}</Text>
      <Button title="Test Network Again" onPress={testNetwork} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "center", justifyContent: "center", flex: 1 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  status: { fontSize: 16, marginVertical: 10 },
});
