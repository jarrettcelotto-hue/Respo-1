import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { channelsApi } from "../api/client";
import { colors } from "../theme";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import DashboardScreen from "../screens/DashboardScreen";
import VideoDetailScreen from "../screens/VideoDetailScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  Dashboard: undefined;
  VideoDetail: { videoId: string };
  Settings: { channelId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "800" },
  },
};

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  const channelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: () => channelsApi.list(),
    enabled: Boolean(user),
  });

  if (loading || (user && channelsQuery.isLoading)) {
    return <LoadingScreen />;
  }

  const hasChannel = (channelsQuery.data?.channels.length ?? 0) > 0;
  const screenOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerShadowVisible: false,
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Create account" }} />
          </>
        ) : !hasChannel ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: "Set up your channel" }} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Your channel" }} />
            <Stack.Screen name="VideoDetail" component={VideoDetailScreen} options={{ title: "Video" }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
