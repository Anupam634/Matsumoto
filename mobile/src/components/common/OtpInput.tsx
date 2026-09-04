import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

const LENGTH = 6;

/**
 * Six-box verification code field.
 *
 * A single hidden input holds the value — six real inputs would fight the
 * keyboard and break SMS/email autofill — while the boxes are drawn from its
 * characters and the caret is a highlighted empty box.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  autoFocus = true,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
}) {
  const { c, spacing, radius, monoFont } = useTheme();
  const feedback = useFeedback();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(autoFocus);

  useEffect(() => {
    if (value.length === LENGTH) onComplete?.(value);
  }, [value, onComplete]);

  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');
  const caretIndex = Math.min(value.length, LENGTH - 1);

  return (
    <Pressable
      accessibilityRole="none"
      onPress={() => input.current?.focus()}
      style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}
    >
      {digits.map((digit, i) => {
        const active = focused && i === caretIndex && value.length < LENGTH;
        const filled = digit !== '';
        return (
          <View
            key={i}
            style={{
              width: 48,
              height: 58,
              borderRadius: radius.md,
              backgroundColor: c.surfaceAlt,
              borderWidth: 1.5,
              borderColor: active ? c.primary : filled ? c.borderStrong : c.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: monoFont,
                fontSize: 24,
                fontWeight: '700',
                color: c.textPrimary,
              }}
            >
              {digit}
            </Text>
          </View>
        );
      })}

      <TextInput
        ref={input}
        value={value}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={(text) => {
          const next = text.replace(/\D/g, '').slice(0, LENGTH);
          if (next.length > value.length) feedback.select();
          onChange(next);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        accessibilityLabel="Verification code"
        style={{
          position: 'absolute',
          opacity: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </Pressable>
  );
}
