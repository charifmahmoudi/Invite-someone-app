import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  haptic?: boolean;
}

export function PressableScale({
  children,
  style,
  pressedScale = 0.98,
  haptic = false,
  onPress,
  disabled,
  ...props
}: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 38,
      bounciness: 3,
    }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={() => animate(pressedScale)}
      onPressOut={() => animate(1)}
      onPress={(event) => {
        if (haptic) void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(event);
      }}
      style={[style, disabled && { opacity: 0.55 }, { transform: [{ scale }] }]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
