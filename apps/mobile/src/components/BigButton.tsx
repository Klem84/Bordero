import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, TOUCH } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'danger';

const BG: Record<Variant, string> = {
  primary: colors.brand,
  secondary: colors.surface,
  danger: colors.danger,
};
const FG: Record<Variant, string> = {
  primary: colors.onBrand,
  secondary: colors.ink,
  danger: colors.onBrand,
};

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: BG[variant],
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <Text style={[styles.label, { color: FG[variant] }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
  },
});
