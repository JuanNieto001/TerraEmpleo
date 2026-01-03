import { useCallback, useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "../config";
import { AuthContext } from "../auth";

export default function HomeScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const [farms, setFarms] = useState([]);
  const [containerWidth, setContainerWidth] = useState(0);

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "owner";

  /* =============================
     HELPERS: navegar al Stack padre
  ============================== */
  function goToFarmForm(params) {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate("FarmForm", params);
    } else {
      // fallback por si alguna vez cambia estructura
      navigation.navigate("FarmForm", params);
    }
  }

  function goToFarmDetail(params) {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate("FarmDetail", params);
    } else {
      navigation.navigate("FarmDetail", params);
    }
  }

  /* =============================
     CARGAR FINCAS
  ============================== */
  async function loadFarms() {
    try {
      const res = await fetch(`${API_URL}/farms`);
      const data = await res.json();
      setFarms(data.farms || []);
    } catch (e) {
      console.error("Error cargando fincas:", e);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadFarms();
    }, [])
  );

  /* =============================
     PERMISOS
  ============================== */
  function canEditOrDelete(farm) {
    if (!user || !token) return false;
    if (isAdmin) return true;
    if (!isOwner) return false;
    return farm?.owner_user_id != null && Number(farm.owner_user_id) === Number(user.id);
  }

  /* =============================
     ELIMINAR
  ============================== */
  async function handleDelete(id) {
    try {
      const res = await fetch(`${API_URL}/farms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        Alert.alert("Error", data?.error || "No se pudo eliminar.");
        return;
      }

      loadFarms();
    } catch (e) {
      console.error("Error eliminando:", e);
    }
  }

  function confirmDelete(id) {
    if (Platform.OS === "web") {
      const ok = window.confirm("¿Seguro que deseas eliminar esta finca?");
      if (ok) handleDelete(id);
      return;
    }

    Alert.alert("Eliminar finca", "¿Seguro que deseas eliminar esta finca?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => handleDelete(id) },
    ]);
  }

  /* =============================
     GRID: 2 COLUMNAS FIJAS
  ============================== */
  const GAP = 10;
  const MAX_WIDTH = 720;
  const columns = 2;

  const cardWidth = useMemo(() => {
    if (!containerWidth) return 280;
    const totalGaps = GAP * (columns - 1);
    return Math.floor((containerWidth - totalGaps) / columns);
  }, [containerWidth]);

  /* =============================
     HEADER
  ============================== */
  const ListHeader = (
    <View style={styles.header}>
      <View style={styles.headerCenter}>
        <Text style={styles.title}>TerraEmpleo 🌱</Text>
        <Text style={styles.subtitle}>Fincas registradas</Text>

        {!!user?.name && (
          <Text style={styles.userLine}>
            Sesión: {user.name} {isAdmin ? "(admin)" : isOwner ? "(dueño)" : "(usuario)"}
          </Text>
        )}
      </View>

      {(isAdmin || isOwner) && (
        <Pressable
          style={styles.addButton}
          onPress={() => goToFarmForm(undefined)} // ✅ Stack padre
        >
          <Text style={styles.addButtonText}>+ Nueva finca</Text>
        </Pressable>
      )}
    </View>
  );

  /* =============================
     RENDER
  ============================== */
  return (
    <View style={styles.root}>
      <View
        style={[styles.page, { maxWidth: MAX_WIDTH }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w !== containerWidth) setContainerWidth(w);
        }}
      >
        <FlatList
          data={farms}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<Text style={styles.emptyText}>Aún no hay fincas.</Text>}
          showsVerticalScrollIndicator={false}
          numColumns={columns}
          key={columns}
          columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const allowed = canEditOrDelete(item);

            return (
              <Pressable
                style={[styles.card, { width: cardWidth }]}
                onPress={() => goToFarmDetail({ farm: item })} // ✅ Stack padre
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.image} />
                ) : (
                  <View style={styles.noImage}>
                    <Text style={styles.noImageText}>Sin imagen</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>

                  {!!item.location && (
                    <Text style={styles.cardText} numberOfLines={1}>
                      📍 {item.location}
                    </Text>
                  )}

                  {item.area_ha != null && (
                    <Text style={styles.cardText} numberOfLines={1}>
                      🌾 {item.area_ha} ha
                    </Text>
                  )}

                  {allowed ? (
                    <View style={styles.actions}>
                      <Pressable
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => goToFarmForm({ farm: item })} // ✅ Stack padre + params
                      >
                        <Text style={styles.actionText}>Editar</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => confirmDelete(item.id)}
                      >
                        <Text style={[styles.actionText, { color: "#fff" }]}>Eliminar</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.viewOnlyHint}>
                      <Text style={styles.viewOnlyText}>Ver detalles</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

/* =============================
   ESTILOS
============================= */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F6EF",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  page: {
    width: "100%",
    flex: 1,
  },

  // ✅ espacio extra para que no tape la tab bar
  listContent: {
    paddingBottom: 140,
  },

  header: {
    alignItems: "center",
    marginBottom: 14,
  },

  headerCenter: {
    alignItems: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1B5E20",
    textAlign: "center",
  },
  subtitle: {
    color: "#4E6E4F",
    marginTop: 4,
    textAlign: "center",
  },
  userLine: {
    color: "#4E6E4F",
    marginTop: 6,
    fontWeight: "700",
    textAlign: "center",
  },

  addButton: {
    backgroundColor: "#1B5E20",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "800" },

  emptyText: {
    textAlign: "center",
    color: "#4E6E4F",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D7E3D2",
    elevation: 2,
  },

  image: { width: "100%", height: 105 },
  noImage: {
    height: 105,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2E6",
  },
  noImageText: { color: "#4E6E4F", fontWeight: "700" },

  cardContent: { padding: 9 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B5E20",
  },
  cardText: {
    color: "#4E6E4F",
    marginTop: 3,
    fontSize: 12.5,
  },

  actions: {
    flexDirection: "row",
    marginTop: 9,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: "center",
  },
  editBtn: { backgroundColor: "#E8F2E6" },
  deleteBtn: { backgroundColor: "#B71C1C" },
  actionText: {
    fontWeight: "800",
    color: "#1B5E20",
    fontSize: 12.5,
  },

  viewOnlyHint: {
    marginTop: 9,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F3F6EF",
    borderWidth: 1,
    borderColor: "#D7E3D2",
  },
  viewOnlyText: {
    color: "#4E6E4F",
    fontWeight: "800",
    fontSize: 12.5,
  },
});

