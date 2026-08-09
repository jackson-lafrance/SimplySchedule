import type { TextStyle } from "react-native";

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 18,
    fontWeight: "900",
  },
  body: {
    fontSize: 15,
    fontWeight: "700",
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  caption: {
    fontSize: 12,
    fontWeight: "700",
  },
};
