import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  const insets = useSafeAreaInsets();

  // ✅ Más alto para que el texto nunca se corte
  const BASE_HEIGHT = 72;
  const bottomPad = Math.max(insets.bottom, 10);
  const tabBarHeight = BASE_HEIGHT + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: "#1B5E20",
        tabBarInactiveTintColor: "#6B7A6A",

        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomPad,
          borderTopWidth: 1,
          borderTopColor: "#D7E3D2",
          backgroundColor: "#FFFFFF",
          overflow: "visible",
          ...(Platform.OS === "web" ? { zIndex: 1000 } : null),
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "900",
          marginTop: 2,
          paddingBottom: 0,
        },

        tabBarIconStyle: {
          marginTop: 2,
        },

        tabBarIcon: ({ color, size, focused }) => {
          let iconName = "home-outline";
          if (route.name === "HomeTab") iconName = focused ? "home" : "home-outline";
          if (route.name === "ProfileTab")
            iconName = focused ? "person" : "person-outline";
          return <Ionicons name={iconName} size={size ?? 24} color={color} />;
        },

        sceneContainerStyle: { backgroundColor: "#F3F6EF" },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: "Inicio" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: "Usuario" }}
      />
    </Tab.Navigator>
  );
}


