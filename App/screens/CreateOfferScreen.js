// App/screens/CreateOfferScreen.js
import { useContext, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  Platform,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import { AuthContext } from "../auth";
import { API_URL } from "../config";

export default function CreateOfferScreen({ navigation, route }) {
  const { user, token } = useContext(AuthContext);

  const farmId = route?.params?.farmId;
  const farm = route?.params?.farm ?? null;

  const editingOffer = route?.params?.offer ?? null;
  const isEditing = !!editingOffer?.id;

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "owner";
  const allowed = isAdmin || isOwner;

  // 🔥 IMPORTANTE: si tu ruta se llama distinto, cambia SOLO esto
  const FARM_DETAIL_ROUTE = "FarmDetail";

  const WORK_TYPES = useMemo(
    () => [
      { label: "Recolectar café", value: "recolectar_cafe" },
      { label: "Deshierbar", value: "deshierbar" },
      { label: "Técnico", value: "tecnico" },
      { label: "Otro", value: "otro" },
    ],
    []
  );

  const PAY_PERIODS = useMemo(
    () => [
      { label: "Por hora", value: "por_hora" },
      { label: "Por día", value: "por_dia" },
      { label: "Por semana", value: "por_semana" },
      { label: "Por mes", value: "por_mes" },
      { label: "Por contrato", value: "por_contrato" },
    ],
    []
  );

  const [title, setTitle] = useState(editingOffer?.title ?? "");
  const [workType, setWorkType] = useState(
    editingOffer?.work_type ?? "recolectar_cafe"
  );
  const [peopleNeeded, setPeopleNeeded] = useState(
    editingOffer?.people_needed != null ? String(editingOffer.people_needed) : ""
  );

  const [startDate, setStartDate] = useState(
    editingOffer?.start_date ? String(editingOffer.start_date).slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    editingOffer?.end_date ? String(editingOffer.end_date).slice(0, 10) : ""
  );

  const [city, setCity] = useState(editingOffer?.city ?? "");
  const [municipality, setMunicipality] = useState(editingOffer?.municipality ?? "");
  const [village, setVillage] = useState(editingOffer?.village ?? "");

  const [hoursPerDay, setHoursPerDay] = useState(
    editingOffer?.hours_per_day != null ? String(editingOffer.hours_per_day) : ""
  );
  const [scheduleNote, setScheduleNote] = useState(editingOffer?.schedule_note ?? "");

  const [payAmount, setPayAmount] = useState(
    editingOffer?.pay_amount != null ? String(editingOffer.pay_amount) : ""
  );
  const [payPeriod, setPayPeriod] = useState(editingOffer?.pay_period ?? "por_dia");

  const [accommodation, setAccommodation] = useState(!!editingOffer?.accommodation_included);
  const [transport, setTransport] = useState(!!editingOffer?.transport_included);

  const [foodIncluded, setFoodIncluded] = useState(!!editingOffer?.food_included);
  const [foodCost, setFoodCost] = useState(
    editingOffer?.food_cost != null ? String(editingOffer.food_cost) : ""
  );

  const [extraInfo, setExtraInfo] = useState(editingOffer?.extra_info ?? "");
  const [loading, setLoading] = useState(false);

  function resetToHome() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
      })
    );
  }

  // ✅ Navegación fuerte: deja Home abajo + FarmDetail encima (sales SI O SI del form)
  function goToFarmDetail() {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: "MainTabs", params: { screen: "HomeTab" } },
          { name: FARM_DETAIL_ROUTE, params: { farmId, farm: farm || null } },
        ],
      })
    );
  }

  function normalizeDate(input) {
    const raw = String(input || "").trim();
    const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;

    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);

    if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
    if (mo < 1 || mo > 12) return null;
    if (d < 1 || d > 31) return null;

    const mm = String(mo).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const normalized = `${y}-${mm}-${dd}`;

    const dt = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return null;

    const yy = dt.getFullYear();
    const dtm = String(dt.getMonth() + 1).padStart(2, "0");
    const dtd = String(dt.getDate()).padStart(2, "0");
    const roundTrip = `${yy}-${dtm}-${dtd}`;
    if (roundTrip !== normalized) return null;

    return normalized;
  }

  function compareDates(a, b) {
    return new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime();
  }

  async function onSubmit() {
    if (loading) return;

    if (!user || !token) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
      return;
    }

    if (!allowed) {
      Alert.alert("Sin permisos", "Solo owner o admin puede crear/editar ofertas.");
      resetToHome();
      return;
    }

    if (!farmId) {
      Alert.alert("Error", "No llegó el farmId. Vuelve a crear la finca.");
      resetToHome();
      return;
    }

    if (!title.trim()) {
      Alert.alert("Falta el título", "Ej: Recolectores de café");
      return;
    }

    const pn = Number(peopleNeeded);
    if (!Number.isInteger(pn) || pn <= 0) {
      Alert.alert("Cupos inválidos", "Ingresa cupos como número entero.");
      return;
    }

    const sNorm = normalizeDate(startDate);
    const eNorm = normalizeDate(endDate);

    if (!sNorm || !eNorm) {
      Alert.alert(
        "Fechas inválidas",
        "Usa formato YYYY-MM-DD (ej: 2026-01-15). Tip: también sirve 2026-2-3 y yo lo acomodo."
      );
      return;
    }

    if (sNorm !== startDate) setStartDate(sNorm);
    if (eNorm !== endDate) setEndDate(eNorm);

    if (compareDates(sNorm, eNorm) > 0) {
      Alert.alert("Fechas inválidas", "La fecha de fin no puede ser menor que la de inicio.");
      return;
    }

    const h = Number(hoursPerDay);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      Alert.alert("Horas inválidas", "Las horas por día deben estar entre 1 y 24.");
      return;
    }

    const pay = Number(payAmount);
    if (!Number.isFinite(pay) || pay <= 0) {
      Alert.alert("Pago inválido", "Ingresa el pago (solo número, sin puntos ni letras).");
      return;
    }

    let fc = null;
    if (foodIncluded) {
      if (foodCost === "" || foodCost == null) fc = 0;
      else {
        const tmp = Number(foodCost);
        if (!Number.isFinite(tmp) || tmp < 0) {
          Alert.alert("Costo comida inválido", "Debe ser 0 (gratis) o un número mayor.");
          return;
        }
        fc = tmp;
      }
    }

    const payload = {
      title: title.trim(),
      work_type: workType,
      people_needed: pn,
      start_date: sNorm,
      end_date: eNorm,

      city: city.trim() || null,
      municipality: municipality.trim() || null,
      village: village.trim() || null,

      hours_per_day: h,
      schedule_note: scheduleNote.trim() || null,

      pay_amount: pay,
      pay_period: payPeriod,

      accommodation_included: accommodation,
      transport_included: transport,

      food_included: foodIncluded,
      food_cost: fc,

      extra_info: extraInfo.trim() || null,
      status: editingOffer?.status ? String(editingOffer.status) : "open",
    };

    const endpoint = isEditing
      ? `${API_URL}/farms/${farmId}/offers/${editingOffer.id}`
      : `${API_URL}/farms/${farmId}/offers`;

    const method = isEditing ? "PUT" : "POST";

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error || data?.message || `No se pudo guardar (${res.status}).`;
        Alert.alert("Error", msg);
        return;
      }

      // ✅ CLAVE: navegamos primero (sales del form sí o sí)
      goToFarmDetail();

      // ✅ y luego mostramos el mensaje (para no chocar con el reset)
      setTimeout(() => {
        Alert.alert("Listo ✅", isEditing ? "Oferta actualizada." : "Oferta creada.");
      }, 200);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", `No se pudo guardar.\n\n${String(e.message || e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{isEditing ? "Editar oferta" : "Crear oferta"}</Text>
      {farm?.name ? <Text style={styles.sub}>Para: {farm.name}</Text> : null}
      {farmId ? <Text style={styles.subMuted}>Finca ID: {farmId}</Text> : null}

      <Text style={styles.label}>Título *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ej: Recolectores de café"
      />

      <Text style={styles.label}>Tipo de trabajo *</Text>
      <View style={styles.chipsRow}>
        {WORK_TYPES.map((it) => {
          const active = it.value === workType;
          return (
            <Pressable
              key={it.value}
              onPress={() => setWorkType(it.value)}
              style={[styles.chip, active && styles.chipActive]}
              disabled={loading}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>¿Cuántas personas necesita? *</Text>
      <TextInput
        style={styles.input}
        value={peopleNeeded}
        onChangeText={setPeopleNeeded}
        keyboardType="numeric"
        placeholder="Ej: 8"
      />

      <Text style={styles.label}>Fechas del trabajo *</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.mini}>Inicio (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="Ej: 2026-01-15"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={{ width: 12 }} />

        <View style={{ flex: 1 }}>
          <Text style={styles.mini}>Fin (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="Ej: 2026-02-15"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <Text style={styles.section}>Ubicación del trabajo</Text>

      <Text style={styles.label}>Ciudad (opcional)</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ej: Manizales" />

      <Text style={styles.label}>Municipio (opcional)</Text>
      <TextInput
        style={styles.input}
        value={municipality}
        onChangeText={setMunicipality}
        placeholder="Ej: Villamaría"
      />

      <Text style={styles.label}>Vereda (opcional)</Text>
      <TextInput style={styles.input} value={village} onChangeText={setVillage} placeholder="Ej: La Pradera" />

      <Text style={styles.label}>¿Cuántas horas por día? *</Text>
      <TextInput
        style={styles.input}
        value={hoursPerDay}
        onChangeText={setHoursPerDay}
        keyboardType="numeric"
        placeholder="Ej: 8"
      />

      <Text style={styles.label}>Horario (opcional)</Text>
      <TextInput
        style={styles.input}
        value={scheduleNote}
        onChangeText={setScheduleNote}
        placeholder="Ej: 6am a 2pm"
      />

      <Text style={styles.label}>Pago *</Text>
      <TextInput
        style={styles.input}
        value={payAmount}
        onChangeText={setPayAmount}
        keyboardType="numeric"
        placeholder="Ej: 70000"
      />

      <Text style={styles.label}>Frecuencia de pago *</Text>
      <View style={styles.chipsRow}>
        {PAY_PERIODS.map((it) => {
          const active = it.value === payPeriod;
          return (
            <Pressable
              key={it.value}
              onPress={() => setPayPeriod(it.value)}
              style={[styles.chip, active && styles.chipActive]}
              disabled={loading}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Beneficios</Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>¿Incluye alojamiento?</Text>
        <Switch value={accommodation} onValueChange={setAccommodation} disabled={loading} />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>¿Incluye transporte?</Text>
        <Switch value={transport} onValueChange={setTransport} disabled={loading} />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>¿Incluye comida?</Text>
        <Switch value={foodIncluded} onValueChange={setFoodIncluded} disabled={loading} />
      </View>

      {foodIncluded ? (
        <>
          <Text style={styles.label}>Costo de comida (0 = gratis)</Text>
          <TextInput
            style={styles.input}
            value={foodCost}
            onChangeText={setFoodCost}
            keyboardType="numeric"
            placeholder="Ej: 0"
          />
        </>
      ) : null}

      <Text style={styles.section}>Información extra (opcional)</Text>
      <TextInput
        style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
        value={extraInfo}
        onChangeText={setExtraInfo}
        placeholder="Ej: Llevar botas. Pago puntual. Buen ambiente. Etc."
        multiline
      />

      <Pressable style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={onSubmit} disabled={loading}>
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={styles.primaryBtnText}>{isEditing ? "Guardando..." : "Publicando..."}</Text>
          </View>
        ) : (
          <Text style={styles.primaryBtnText}>{isEditing ? "Guardar cambios" : "Publicar oferta"}</Text>
        )}
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={resetToHome} disabled={loading}>
        <Text style={styles.secondaryBtnText}>Cancelar</Text>
      </Pressable>

      {Platform.OS === "web" ? (
        <Text style={{ marginTop: 14, color: "#4E6E4F", fontWeight: "700" }}>
          Tip: si pones 2026-02-3, yo lo convierto a 2026-02-03 automáticamente.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#F3F6EF", flexGrow: 1 },

  h1: { fontSize: 20, fontWeight: "900", color: "#1B5E20" },
  sub: { marginTop: 4, fontWeight: "800", color: "#2E5E34" },
  subMuted: { marginTop: 2, color: "#4E6E4F" },

  label: { fontWeight: "800", color: "#1B5E20", marginTop: 12, marginBottom: 6 },
  mini: { fontWeight: "700", color: "#2E5E34", marginBottom: 6, marginTop: 6 },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D7E3D2",
  },

  row: { flexDirection: "row", alignItems: "center" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: "#E8F2E6",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3D2",
  },
  chipActive: { backgroundColor: "#1B5E20", borderColor: "#1B5E20" },
  chipText: { fontWeight: "800", color: "#1B5E20" },
  chipTextActive: { color: "#fff" },

  section: { marginTop: 18, fontWeight: "900", color: "#1B5E20", fontSize: 16 },

  switchRow: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D7E3D2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { fontWeight: "800", color: "#1B5E20" },

  primaryBtn: {
    backgroundColor: "#1B5E20",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    backgroundColor: "#E8F2E6",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryBtnText: { fontWeight: "900", color: "#1B5E20" },
});
