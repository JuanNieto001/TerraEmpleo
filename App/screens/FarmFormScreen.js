import { useContext, useEffect, useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  View,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config';
import { AuthContext } from '../auth';

export default function FarmFormScreen({ navigation, route }) {
  const { user, token } = useContext(AuthContext);
  const editingFarm = route?.params?.farm ?? null;

  const [name, setName] = useState(editingFarm?.name ?? '');
  const [location, setLocation] = useState(editingFarm?.location ?? '');
  const [areaHa, setAreaHa] = useState((editingFarm?.area_ha ?? '')?.toString?.() ?? '');
  const [imageUri, setImageUri] = useState(editingFarm?.image_url ?? null);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isOwner = user?.role === 'owner';

  const allowedToCreate = isAdmin || isOwner;
  const allowedToEdit =
    isAdmin ||
    (isOwner &&
      editingFarm?.owner_user_id != null &&
      Number(editingFarm.owner_user_id) === Number(user?.id));

  // ✅ helper: volver a HomeTab dentro de MainTabs (Stack)
  function resetToHome() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'HomeTab' } }],
      })
    );
  }

  useEffect(() => {
    // Sin sesión -> Login
    if (!user || !token) {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
      );
      return;
    }

    // Si intenta crear sin permisos -> Home (tabs)
    if (!editingFarm && !allowedToCreate) {
      resetToHome();
      return;
    }

    // Si intenta editar sin permisos -> Home (tabs)
    if (editingFarm && !allowedToEdit) {
      resetToHome();
      return;
    }
  }, [user, token, editingFarm, allowedToCreate, allowedToEdit, navigation]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso requerido',
        'Necesitas permitir acceso a fotos para seleccionar una imagen.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function uploadImageIfNeeded(uri) {
    if (!uri) return null;
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

    const form = new FormData();

    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      form.append('image', blob, `farm_${Date.now()}.jpg`);
    } else {
      form.append('image', {
        uri,
        name: `farm_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
    }

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: form,
      headers: { Accept: 'application/json' },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) throw new Error(data?.error || `UPLOAD_FAILED (${res.status})`);
    if (!data?.url) throw new Error('UPLOAD_NO_URL');

    return data.url;
  }

  async function onSave() {
    if (loading) return;

    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'El nombre de la finca es obligatorio.');
      return;
    }

    const areaNumber = areaHa === '' ? null : Number(areaHa);
    if (areaNumber !== null && Number.isNaN(areaNumber)) {
      Alert.alert('Área inválida', 'El área debe ser un número.');
      return;
    }

    setLoading(true);

    try {
      const uploadedUrl = await uploadImageIfNeeded(imageUri);

      const payload = {
        name: name.trim(),
        location: location.trim() || null,
        areaHa: areaNumber,
        imageUrl: uploadedUrl || null,
      };

      const endpoint = editingFarm?.id
        ? `${API_URL}/farms/${editingFarm.id}`
        : `${API_URL}/farms`;

      const method = editingFarm?.id ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        Alert.alert('Error', data?.error || `No se pudo guardar (${res.status}).`);
        return;
      }

      // ✅ Antes era { name: 'Home' }. Ahora debe volver a Tabs -> HomeTab
      resetToHome();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', `No se pudo subir/guardar.\n\n${String(e.message || e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Nombre *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ej: Finca La Esperanza"
      />

      <Text style={styles.label}>Ubicación</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Ej: Manizales, Caldas"
      />

      <Text style={styles.label}>Área (ha)</Text>
      <TextInput
        style={styles.input}
        value={areaHa}
        onChangeText={setAreaHa}
        keyboardType="numeric"
        placeholder="Ej: 12.5"
      />

      <Text style={styles.label}>Imagen</Text>
      <Pressable style={styles.secondaryBtn} onPress={pickImage} disabled={loading}>
        <Text style={styles.secondaryBtnText}>
          {imageUri ? 'Cambiar imagen' : 'Seleccionar imagen'}
        </Text>
      </Pressable>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <Text style={styles.helper}>Sin imagen</Text>
      )}

      <Pressable
        style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
        onPress={onSave}
        disabled={loading}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator />
            <Text style={styles.primaryBtnText}>Guardando...</Text>
          </View>
        ) : (
          <Text style={styles.primaryBtnText}>
            {editingFarm ? 'Guardar cambios' : 'Crear finca'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F3F6EF', flexGrow: 1 },
  label: { fontWeight: '800', color: '#1B5E20', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D7E3D2',
  },
  secondaryBtn: {
    backgroundColor: '#E8F2E6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryBtnText: { fontWeight: '800', color: '#1B5E20' },
  preview: { width: '100%', height: 220, borderRadius: 12, marginTop: 12 },
  helper: { color: '#4E6E4F', marginTop: 10 },
  primaryBtn: {
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
});
