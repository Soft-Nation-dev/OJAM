import { CustomAlert } from "@/components/custom-alert";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setAlert({ visible: true, title, message, type });
  };

  const hideAlert = () => {
    setAlert({ ...alert, visible: false });
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showAlert("Error", "Please fill in all fields", "error");
      return;
    }

    if (!isLogin && !fullName) {
      showAlert("Error", "Please enter your name", "error");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          showAlert("Sign In Error", error, "error");
        } else {
          router.back();
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          showAlert("Sign Up Error", error, "error");
        } else {
          showAlert(
            "Success!",
            "Account created successfully! Welcome to Ojam.",
            "success",
          );
          // Close modal after a short delay
          setTimeout(() => {
            hideAlert();
            router.back();
          }, 3000);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
      edges={["top"]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <MaterialIcons
              name="close"
              size={28}
              color={Colors[colorScheme ?? "light"].text}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <View style={styles.logoRow}>
              <View
                style={[
                  styles.logoCircle,
                  { backgroundColor: Colors[colorScheme ?? "light"].tint },
                ]}
              >
                <Image
                  source={require("@/assets/images/icon.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <ThemedText type="title" style={styles.appName}>
                Ojam
              </ThemedText>
            </View>
            <ThemedText type="default" style={styles.tagline}>
              Oluchi Jephat Aniagu Ministry
            </ThemedText>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  isLogin && [
                    styles.activeTab,
                    { borderBottomColor: Colors[colorScheme ?? "light"].tint },
                  ],
                ]}
                onPress={() => setIsLogin(true)}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.tabText,
                    isLogin && [
                      styles.activeTabText,
                      { color: Colors[colorScheme ?? "light"].tint },
                    ],
                  ]}
                >
                  Login
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  !isLogin && [
                    styles.activeTab,
                    { borderBottomColor: Colors[colorScheme ?? "light"].tint },
                  ],
                ]}
                onPress={() => setIsLogin(false)}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.tabText,
                    !isLogin && [
                      styles.activeTabText,
                      { color: Colors[colorScheme ?? "light"].tint },
                    ],
                  ]}
                >
                  Sign Up
                </ThemedText>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
              >
                <MaterialIcons
                  name="person"
                  size={20}
                  color={Colors[colorScheme ?? "light"].tabIconDefault}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: Colors[colorScheme ?? "light"].text },
                  ]}
                  placeholder="Full Name"
                  placeholderTextColor={
                    Colors[colorScheme ?? "light"].tabIconDefault
                  }
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View
              style={[
                styles.inputContainer,
                { borderColor: Colors[colorScheme ?? "light"].border },
              ]}
            >
              <MaterialIcons
                name="email"
                size={20}
                color={Colors[colorScheme ?? "light"].tabIconDefault}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
                placeholder="Email"
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].tabIconDefault
                }
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View
              style={[
                styles.inputContainer,
                { borderColor: Colors[colorScheme ?? "light"].border },
              ]}
            >
              <MaterialIcons
                name="lock"
                size={20}
                color={Colors[colorScheme ?? "light"].tabIconDefault}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: Colors[colorScheme ?? "light"].text },
                ]}
                placeholder="Password"
                placeholderTextColor={
                  Colors[colorScheme ?? "light"].tabIconDefault
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color={Colors[colorScheme ?? "light"].tabIconDefault}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.authButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
                loading && styles.disabledButton,
              ]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator
                  color={colorScheme === "dark" ? "#000" : "#fff"}
                />
              ) : (
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.authButtonText,
                    {
                      color: colorScheme === "dark" ? "#000" : "#fff",
                    },
                  ]}
                >
                  {isLogin ? "Login" : "Create Account"}
                </ThemedText>
              )}
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity style={styles.forgotPassword}>
                <ThemedText
                  type="default"
                  style={[
                    styles.forgotPasswordText,
                    { color: Colors[colorScheme ?? "light"].tint },
                  ]}
                >
                  Forgot Password?
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
  },
  tagline: {
    opacity: 0.7,
    fontSize: 14,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 32,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 15,
    opacity: 0.6,
  },
  activeTabText: {
    opacity: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  authButton: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: 16,
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
});
