import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/theme";

export default function SegmentedControl<Option extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly { value: Option; label: string }[];
  value: Option;
  onChange: (value: Option) => void;
  accessibilityLabel: string;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={styles.container}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.3}
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[styles.label, selected && styles.selectedLabel]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.control,
    overflow: "hidden",
    flexDirection: "row",
  },
  option: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  selected: {
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.65,
  },
  label: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
  },
  selectedLabel: {
    color: colors.inverse,
  },
});
