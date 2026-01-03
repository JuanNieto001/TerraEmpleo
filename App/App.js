import "react-native-gesture-handler";
import { useContext, useMemo } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import FarmFormScreen from "./screens/FarmFormScreen";
import FarmDetailScreen from "./screens/FarmDetailScreen";
import CreateOfferScreen from "./screens/CreateOfferScreen";

import TabsNavigator from "./navigation/TabsNavigator";
import { AuthProvider, AuthContext } from "./auth";

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user } = useContext(AuthContext);

  const isLoggedIn = !!user;

  // ✅ esto fuerza a React Navigation a reconstruir la navegación al cambiar login/logout
  const navKey = useMemo(() => (isLoggedIn ? "APP_STACK" : "AUTH_STACK"), [isLoggedIn]);

  return (
    <NavigationContainer>
      <Stack.Navigator key={navKey} screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="MainTabs" component={TabsNavigator} />
            <Stack.Screen name="FarmForm" component={FarmFormScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="CreateOffer" component={CreateOfferScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

