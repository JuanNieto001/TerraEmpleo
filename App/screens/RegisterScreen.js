import { useContext, useState } from 'react';
import { API_URL } from '../config';
import { AuthContext } from '../auth';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function RegisterScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // opcional
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (loading) return;

    const n = name.trim();
    const ph = phone.trim();
    const eRaw = email.trim();
    const p = password.trim();
    const c = confirm.trim();

    if (!n || !ph || !p || !c) return setError('Nombre, celular y contraseña son obligatorios');
    if (n.length < 3) return setError('El nombre debe tener al menos 3 caracteres');

    const phoneOk = /^[0-9]{7,12}$/.test(ph);
    if (!phoneOk) return setError('Ingresa un número de celular válido');

    if (eRaw) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eRaw);
      if (!emailOk) return setError('Ingresa un correo válido');
    }

    if (p.length < 6) return setError('La contraseña debe tener mínimo 6 caracteres');
    if (p !== c) return setError('Las contraseñas no coinciden');

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: n,
          phone: ph,
          email: eRaw ? eRaw : null,
          password: p,
        }),
      });

      const data = await res.json().catch(() => null);

      // ✅ si no guardó, aquí verás el mensaje real del backend
      if (!res.ok) {
        setError(data?.message || `Error al registrar (${res.status})`);
        return;
      }

      if (!data?.user || !data?.token) {
        setError('Respuesta inválida del servidor (faltan user/token)');
        return;
      }

      // ✅ esto “activa” el stack autenticado -> entra a Home
      signIn({ user: data.user, token: data.token });
    } catch (err) {
      console.error('REGISTER error:', err);
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Completa los datos para registrarte 🌱</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Nombre completo</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Nombre completo" style={styles.input} />

          <Text style={styles.label}>Celular</Text>
          <TextInput
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
            placeholder="Ingrese numero de celular"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Correo (opcional)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry style={styles.input} />

          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput value={confirm} onChangeText={setConfirm} placeholder="Confirma tu contraseña" secureTextEntry style={styles.input} />

          <Pressable style={[styles.primaryButton, loading && { opacity: 0.7 }]} onPress={onRegister}>
            <Text style={styles.primaryButtonText}>{loading ? 'Creando...' : 'Crear cuenta'}</Text>
          </Pressable>

          <Pressable style={styles.linkRow} onPress={() => navigation.replace('Login')}>
            <Text style={styles.linkText}>Volver al inicio de sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 20, backgroundColor: '#F3F6EF', justifyContent: 'center' },

  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', textAlign: 'center', marginBottom: 4 },
  subtitle: { textAlign: 'center', color: '#4E6E4F', marginBottom: 16 },

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
    marginTop: 18,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  linkRow: { marginTop: 14, alignItems: 'center' },
  linkText: { color: '#6D4C41', fontWeight: '600' },
});
