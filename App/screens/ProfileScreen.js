import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { AuthContext } from "../auth";
import { API_URL } from "../config";

export default function ProfileScreen({ navigation }) {
  const { user, token, signIn, signOut } = useContext(AuthContext);

  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const canSave = useMemo(() => {
    const nameChanged = name.trim() && name.trim() !== (user?.name ?? "");
    const wantsPass = currentPassword || newPassword || confirmNewPassword;
    return !!token && (nameChanged || wantsPass);
  }, [name, currentPassword, newPassword, confirmNewPassword, token, user?.name]);

  async function saveChanges() {
    try {
      if (!token) {
        Platform.OS === "web"
          ? window.alert("Sesión no válida")
          : Alert.alert("Sesión", "No hay token de sesión.");
        return;
      }

      const wantsPass = currentPassword || newPassword || confirmNewPassword;
      if (wantsPass) {
        if (!currentPassword) {
          Platform.OS === "web"
            ? window.alert("Escribe tu contraseña actual.")
            : Alert.alert("Falta", "Escribe tu contraseña actual.");
          return;
        }
        if (!newPassword) {
          Platform.OS === "web"
            ? window.alert("Escribe tu nueva contraseña.")
            : Alert.alert("Falta", "Escribe tu nueva contraseña.");
          return;
        }
        if (newPassword.length < 6) {
          Platform.OS === "web"
            ? window.alert("La nueva contraseña debe tener al menos 6 caracteres.")
            : Alert.alert("Débil", "La nueva contraseña debe tener al menos 6 caracteres.");
          return;
        }
        if (newPassword !== confirmNewPassword) {
          Platform.OS === "web"
            ? window.alert("La confirmación no coincide.")
            : Alert.alert("No coincide", "La confirmación no coincide.");
          return;
        }
      }

      const payload = {};
      if (name.trim() && name.trim() !== user?.name) payload.name = name.trim();
      if (wantsPass) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) return;

      const res = await fetch(`${API_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        Platform.OS === "web"
          ? window.alert(data?.message || "No se pudo actualizar.")
          : Alert.alert("Error", data?.message || "No se pudo actualizar.");
        return;
      }

      const updatedUser =
        data.user || { ...user, ...(payload.name ? { name: payload.name } : {}) };

      signIn({ user: updatedUser, token });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      const goHome = () => {
        try {
          navigation.navigate("HomeTab");
        } catch (e) {}
        const parent = navigation.getParent?.();
        if (parent) parent.navigate("MainTabs", { screen: "HomeTab" });
      };

      if (Platform.OS === "web") {
        window.alert("Perfil actualizado correctamente ✅");
        goHome();
      } else {
        Alert.alert("Listo", "Perfil actualizado correctamente ✅", [
          { text: "OK", onPress: goHome },
        ]);
      }
    } catch (e) {
      Platform.OS === "web"
        ? window.alert("Error guardando cambios.")
        : Alert.alert("Error", "Error guardando cambios.");
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Usuario</Text>

        <View style={styles.card}>
          <Text style={styles.meta}>
            Rol: {user?.role ?? "-"} • Tel: {user?.phone ?? "-"}
          </Text>

          <Text style={styles.sectionTitle}>Editar perfil</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            style={styles.input}
          />

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            Cambiar contraseña
          </Text>

          <Text style={styles.label}>Contraseña actual</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.label}>Nueva contraseña</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.label}>Confirmar nueva contraseña</Text>
          <TextInput
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            onPress={saveChanges}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canSave && styles.disabledBtn,
              pressed && canSave && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Guardar cambios</Text>
          </Pressable>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        {/* ✅ espacio extra por si acaso en pantallas pequeñas */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F6EF",
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === "web" ? 20 : 16,
    paddingBottom: 160, // ✅ asegura que no lo tape la tab bar
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1B5E20",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D7E3D2",
  },
  meta: { fontSize: 12, opacity: 0.75, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#1B5E20", marginTop: 2 },
  label: { marginTop: 10, marginBottom: 6, fontSize: 13, opacity: 0.85 },
  input: {
    borderWidth: 1,
    borderColor: "#CFE0C5",
    backgroundColor: "#FAFCF8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1F2D1F",
  },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  disabledBtn: { opacity: 0.5 },
  logoutBtn: {
    marginTop: 10,
    backgroundColor: "#B71C1C",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
