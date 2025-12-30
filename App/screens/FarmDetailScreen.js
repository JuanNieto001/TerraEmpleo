import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';

export default function FarmDetailScreen({ route, navigation }) {
  const farm = route?.params?.farm;

  if (!farm) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No hay datos de la finca</Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{farm.name}</Text>

      {farm.image_url ? <Image source={{ uri: farm.image_url }} style={styles.image} /> : null}
      {farm.location ? <Text style={styles.text}>📍 {farm.location}</Text> : null}
      {farm.area_ha != null ? <Text style={styles.text}>🌾 {farm.area_ha} ha</Text> : null}

      <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Volver</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: '#F3F6EF' },
  title: { fontSize: 22, fontWeight: '900', color: '#1B5E20', marginBottom: 12 },
  text: { color: '#4E6E4F', marginTop: 8, fontWeight: '700' },
  image: { width: '100%', height: 240, borderRadius: 12, marginBottom: 12 },
  btn: { marginTop: 18, backgroundColor: '#1B5E20', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
});
