/**
 * Button Component
 * Reusable button with different variants and sizes
 */

import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '@theme/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
      gap: spacing.sm,
    };

    const sizeStyles = {
      sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
      md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
      lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
    };

    const variantStyles = {
      primary: {
        backgroundColor: colors.primary,
      },
      secondary: {
        backgroundColor: colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    const disabledStyle = isDisabled && {
      opacity: 0.5,
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...disabledStyle,
      width: fullWidth ? '100%' : 'auto',
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...typography.button,
      textAlign: 'center',
    };

    const variantTextStyles = {
      primary: { color: colors.background },
      secondary: { color: colors.text },
      outline: { color: colors.primary },
      ghost: { color: colors.primary },
    };

    return {
      ...baseStyle,
      ...variantTextStyles[variant],
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.primary} />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({});
