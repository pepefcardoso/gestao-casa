import * as LucideIcons from "lucide-react-native";
import type * as React from "react";
import type { StyleProp, ViewStyle } from "react-native";

interface LucideIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Lucide({
  name,
  size = 24,
  color = "black",
  style,
}: LucideIconProps): React.JSX.Element {
  // Convert kebab-case (e.g. "chevron-right") to PascalCase (e.g. "ChevronRight")
  const pascalName = name
    .split("-")
    .map((part: string): string => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  // Get the component from lucide-react-native
  const IconComponent = (LucideIcons as Record<string, unknown>)[pascalName] as
    | React.ComponentType<{
        size?: number;
        color?: string;
        style?: StyleProp<ViewStyle>;
      }>
    | undefined;

  if (!IconComponent) {
    console.warn(`Icon ${name} (resolved as ${pascalName}) not found in lucide-react-native`);
    // Return a fallback icon
    return <LucideIcons.HelpCircle size={size} color={color} style={style} />;
  }

  return <IconComponent size={size} color={color} style={style} />;
}
