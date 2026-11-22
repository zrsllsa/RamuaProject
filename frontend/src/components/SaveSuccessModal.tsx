import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const GREEN = '#8FCB4C';

type SaveSuccessModalProps = {
  visible: boolean;
  onClose: () => void;
  onViewSaved: () => void;
};

export function SaveSuccessModal({ visible, onClose, onViewSaved }: SaveSuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Resep Berhasil Disimpan!</Text>
          <Text style={styles.subtitle}>
            Resep ini sudah masuk ke daftar simpananmu dan siap dimasak kapan saja.
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.outlineBtn} onPress={onClose}>
              <Text style={styles.outlineText}>OK</Text>
            </Pressable>
            <Pressable style={styles.solidBtn} onPress={onViewSaved}>
              <Text style={styles.solidText}>Lihat Resep</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#161616',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#6E6E6E',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  outlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    fontSize: 14,
    fontWeight: '800',
    color: GREEN,
  },
  solidBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
