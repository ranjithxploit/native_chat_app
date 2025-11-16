/**
 * Text Input Component
 * Reusable text input with validation and error states
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  Image,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@theme/theme';

interface TextInputProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  editable?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: ViewStyle;
}

export const CustomTextInput: React.FC<TextInputProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  editable = true,
  maxLength,
  autoCapitalize = 'none',
  autoCorrect = false,
  label,
  error,
  icon,
  onFocus,
  onBlur,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          editable={editable}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Image
              source={
                showPassword
                  ? require('../icons/password_show.png')
                  : require('../icons/password_hide.png')
              }
              style={styles.eyeIconImage}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 54,
    gap: spacing.sm,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    padding: spacing.sm,
  },
  eyeIconImage: {
    width: 24,
    height: 24,
    tintColor: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});
