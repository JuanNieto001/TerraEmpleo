// App/screens/FarmDetailScreen.js
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, CommonActions } from "@react-navigation/native";
import { API_URL } from "../config";
import { AuthContext } from "../auth";

export default function FarmDetailScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);

  const paramFarm = route?.params?.farm ?? null;
  const paramFarmId = route?.params?.farmId ?? paramFarm?.id ?? null;

  const [farm, setFarm] = useState(paramFarm);
  const [offers, setOffers] = useState([]);

  const [loadingFarm, setLoadingFarm] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "owner";

  // ✅ Permiso real (admin siempre / owner solo si owner_user_id coincide)
  const canManageOffers = useMemo(() => {
    if (isAdmin) return true;
    if (!isOwner) return false;
    const ownerId = farm?.owner_user_id;
    return ownerId != null && Number(ownerId) === Number(user?.id);
  }, [isAdmin, isOwner, farm?.owner_user_id, user?.id]);

  // ✅ Home real (según tu app: MainTabs + HomeTab)
  function goHome() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
      })
    );
  }

  useEffect(() => {
    if (!paramFarmId) return;
    if (!farm) fetchFarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramFarmId]);

  // ✅ refresca al volver a esta pantalla (soluciona “no se ve el cambio”)
  useFocusEffect(
    useCallback(() => {
      if (!paramFarmId) return;
      fetchFarm();
      fetchOffers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramFarmId])
  );

  async function fetchFarm() {
    try {
      setLoadingFarm(true);
      const res = await fetch(`${API_URL}/farms/${paramFarmId}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.log("fetchFarm error:", data);
        setFarm(null);
        return;
      }

      // ⚠️ backend debe incluir owner_user_id en data.farm
      setFarm(data?.farm ?? null);
    } catch (e) {
      console.error(e);
      setFarm(null);
    } finally {
      setLoadingFarm(false);
    }
  }

  async function fetchOffers() {
    try {
      setLoadingOffers(true);
      const res = await fetch(`${API_URL}/farms/${paramFarmId}/offers`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.log("fetchOffers error:", data);
        setOffers([]);
        return;
      }

      setOffers(Array.isArray(data?.offers) ? data.offers : []);
    } catch (e) {
      console.error(e);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }

  function formatPay(offer) {
    const amount = offer?.pay_amount;
    const period = offer?.pay_period;

    const periodLabel =
      {
        por_hora: "Por hora",
        por_dia: "Por día",
        por_semana: "Por semana",
        por_mes: "Por mes",
        por_contrato: "Por contrato",
      }[period] || period || "";

    const money =
      amount != null ? `$${Number(amount).toLocaleString("es-CO")}` : "";

    return [money, periodLabel].filter(Boolean).join(" · ");
  }

  function formatDates(offer) {
    const s = offer?.start_date ? String(offer.start_date).slice(0, 10) : "";
    const e = offer?.end_date ? String(offer.end_date).slice(0, 10) : "";
    if (!s && !e) return "";
    if (s && e) return `${s} → ${e}`;
    return s || e;
  }

  function formatLocation(offer) {
    const parts = [offer?.city, offer?.municipality, offer?.village]
      .map((x) => (x ? String(x).trim() : ""))
      .filter(Boolean);
    if (!parts.length) return "";
    return parts.join(" · ");
  }

  if (!paramFarmId && !paramFarm) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No hay datos de la finca</Text>
        <Pressable style={styles.btn} onPress={goHome}>
          <Text style={styles.btnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header finca */}
      {loadingFarm && !farm ? (
        <View style={{ marginTop: 10 }}>
          <ActivityIndicator />
          <Text style={styles.helper}>Cargando finca...</Text>
        </View>
      ) : farm ? (
        <>
          <Text style={styles.title}>{farm.name}</Text>

          {farm.image_url ? (
            <Image source={{ uri: farm.image_url }} style={styles.image} />
          ) : null}

          {farm.location ? (
            <Text style={styles.text}>📍 {farm.location}</Text>
          ) : null}
          {farm.area_ha != null ? (
            <Text style={styles.text}>🌾 {farm.area_ha} ha</Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={styles.title}>Finca no encontrada</Text>
          <Text style={styles.helper}>
            Puede que haya sido eliminada o el ID sea inválido.
          </Text>
        </>
      )}

      {/* ✅ Acciones solo si realmente puede administrar */}
      {paramFarmId && canManageOffers ? (
        <Pressable
          style={styles.btnSecondary}
          onPress={() =>
            navigation.navigate("CreateOffer", {
              farmId: paramFarmId,
              farm: farm || paramFarm || null,
            })
          }
        >
          <Text style={styles.btnSecondaryText}>➕ Crear oferta</Text>
        </Pressable>
      ) : null}

      {/* Ofertas */}
      <Text style={styles.section}>Ofertas laborales</Text>

      {loadingOffers ? (
        <View style={{ marginTop: 10 }}>
          <ActivityIndicator />
          <Text style={styles.helper}>Cargando ofertas...</Text>
        </View>
      ) : offers.length === 0 ? (
        <Text style={styles.helper}>Aún no hay ofertas creadas para esta finca.</Text>
      ) : (
        <View style={{ marginTop: 10, gap: 10 }}>
          {offers.map((o) => (
            <View key={o.id} style={styles.card}>
              <Text style={styles.cardTitle}>{o.title}</Text>

              <Text style={styles.cardLine}>
                👥 {o.people_needed} cupos · ⏱️ {o.hours_per_day}h/día
              </Text>

              {formatDates(o) ? (
                <Text style={styles.cardLine}>📅 {formatDates(o)}</Text>
              ) : null}

              {formatPay(o) ? (
                <Text style={styles.cardLine}>💰 {formatPay(o)}</Text>
              ) : null}

              {formatLocation(o) ? (
                <Text style={styles.cardLine}>📌 {formatLocation(o)}</Text>
              ) : null}

              <View style={styles.badgesRow}>
                {o.accommodation_included ? (
                  <Text style={styles.badge}>🏠 Alojamiento</Text>
                ) : null}
                {o.transport_included ? (
                  <Text style={styles.badge}>🚌 Transporte</Text>
                ) : null}
                {o.food_included ? (
                  <Text style={styles.badge}>
                    🍲 Comida{" "}
                    {o.food_cost != null
                      ? `( $${Number(o.food_cost).toLocaleString("es-CO")} )`
                      : ""}
                  </Text>
                ) : null}
              </View>

              {o.extra_info ? <Text style={styles.extra}>{o.extra_info}</Text> : null}

              {/* ✅ Editar solo si puede administrar */}
              {canManageOffers ? (
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.smallBtn, styles.editBtn]}
                    onPress={() =>
                      navigation.navigate("CreateOffer", {
                        farmId: paramFarmId,
                        farm: farm || paramFarm || null,
                        offer: o,
                      })
                    }
                  >
                    <Text style={[styles.smallBtnText, { color: "#1B5E20" }]}>
                      Editar
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <Pressable style={styles.btn} onPress={goHome}>
        <Text style={styles.btnText}>Volver</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: "#F3F6EF" },
  title: { fontSize: 22, fontWeight: "900", color: "#1B5E20", marginBottom: 12 },
  text: { color: "#4E6E4F", marginTop: 8, fontWeight: "700" },
  image: { width: "100%", height: 240, borderRadius: 12, marginBottom: 12 },

  section: { marginTop: 18, fontSize: 16, fontWeight: "900", color: "#1B5E20" },
  helper: { color: "#4E6E4F", marginTop: 8, fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D7E3D2",
  },
  cardTitle: { fontWeight: "900", color: "#1B5E20", fontSize: 16 },
  cardLine: { marginTop: 6, color: "#4E6E4F", fontWeight: "700" },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  badge: {
    backgroundColor: "#E8F2E6",
    color: "#1B5E20",
    fontWeight: "900",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  extra: { marginTop: 10, color: "#2E5E34", fontWeight: "700" },

  btn: {
    marginTop: 18,
    backgroundColor: "#1B5E20",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "900" },

  btnSecondary: {
    marginTop: 10,
    backgroundColor: "#E8F2E6",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D7E3D2",
  },
  btnSecondaryText: { color: "#1B5E20", fontWeight: "900" },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  smallBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D7E3D2",
  },
  editBtn: { backgroundColor: "#E8F2E6" },
  smallBtnText: { fontWeight: "900" },
});
