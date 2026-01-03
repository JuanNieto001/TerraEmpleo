import { useContext, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_URL } from '../config';
import { AuthContext } from '../auth';

export default function LoginScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);

  const [identifier, setIdentifier] = useState(''); // celular o correo
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onLogin = async () => {
    const id = identifier.trim();
    const p = password.trim();

    if (!id || !p) {
      setError('Ingresa tu celular o correo y tu contraseña');
      return;
    }

    const isPhone = /^[0-9]{7,12}$/.test(id);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
    if (!isPhone && !isEmail) {
      setError('Ingresa un celular o correo válido');
      return;
    }

    try {
      setError('');

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, password: p }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'USER_NOT_FOUND') {
          setError('No estás registrado. Crea tu cuenta.');
          navigation.replace('Register');
          return;
        }
        setError(data.message || 'Error al iniciar sesión');
        return;
      }

      // ✅ Guardar sesión en memoria (token + user)
      // backend devuelve { user, token }
      signIn({ user: data.user, token: data.token });
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    }
  };

  const goRegister = () => navigation.navigate('Register');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.header}>
            <Image source={require('../assets/LOGO.jpg')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>TerraEmpleo</Text>
            <Text style={styles.subtitle}>Conectando talento y campo 🌱</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Celular o correo</Text>
            <TextInput
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (error) setError('');
              }}
              placeholder="Ingrese numero de celular o correo"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              placeholder="********"
              placeholderTextColor="#7A7A7A"
              secureTextEntry
              style={styles.input}
            />

            <Pressable style={styles.primaryButton} onPress={onLogin}>
              <Text style={styles.primaryButtonText}>Entrar</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.divider} />
            </View>

            <Pressable style={styles.secondaryButton} onPress={goRegister}>
              <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>© TerraEmpleo · Tecnología para el agro 🌾</Text>
          <StatusBar style="auto" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 20, backgroundColor: '#F3F6EF', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 80, height: 80, marginBottom: 8, borderRadius: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#1B5E20' },
  subtitle: { color: '#4E6E4F', textAlign: 'center', marginTop: 4 },

  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE6D2',
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#2E7D32', marginBottom: 12 },

  errorBox: {
    backgroundColor: '#FDECEA',
    borderColor: '#F5C2C0',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { color: '#B00020', fontWeight: '600', textAlign: 'center' },

  label: { marginTop: 10, marginBottom: 6, color: '#385A39', fontWeight: '500' },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CFE0C5',
    backgroundColor: '#FAFCF8',
    color: '#1F2D1F',
  },

  primaryButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  dividerRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  divider: { flex: 1, height: 1, backgroundColor: '#E1E8DA' },
  dividerText: { marginHorizontal: 8, color: '#6B7A6A' },

  secondaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#E8D7B8',
  },
  secondaryButtonText: { color: '#6D4C41', fontWeight: '700', fontSize: 16 },

  footer: { marginTop: 18, textAlign: 'center', color: '#6B7A6A' },
});


