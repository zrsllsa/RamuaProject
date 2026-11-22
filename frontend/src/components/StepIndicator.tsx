import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

const STEPS = [
  { id: 1, label: 'Bahan' },
  { id: 2, label: 'Preferensi' },
  { id: 3, label: 'Alat' },
  { id: 4, label: 'Hasil' },
] as const;

const GREEN = '#8FCB4C';
const YELLOW = '#F6C445';

export function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#B7E38A', '#F6C445', '#EEF6D8']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.track}
      />
      <View style={styles.row}>
        {STEPS.map((step) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          return (
            <View key={step.id} style={styles.item}>
              <View
                style={[
                  styles.circle,
                  done && { backgroundColor: GREEN, borderColor: GREEN },
                  active && { backgroundColor: YELLOW, borderColor: YELLOW },
                ]}>
                <Text style={[styles.num, (done || active) && styles.numOn]}>{step.id}</Text>
              </View>
              <Text style={[styles.label, (done || active) && styles.labelOn]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginTop: 6, marginBottom: 8 },
  track: {
    position: 'absolute',
    top: 13,
    left: 22,
    right: 22,
    height: 7,
    borderRadius: 999,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { width: 72, alignItems: 'center' },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7F8F3',
    borderWidth: 2,
    borderColor: '#E4E8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontSize: 13, fontWeight: '800', color: '#B0B6A6' },
  numOn: { color: '#243000' },
  label: { marginTop: 6, fontSize: 11, color: '#B0B6A6', textAlign: 'center' },
  labelOn: { color: '#243000', fontWeight: '700' },
});
