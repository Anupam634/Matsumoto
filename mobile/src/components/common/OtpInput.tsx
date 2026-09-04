import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

const LENGTH = 6;

/**
 * Six-box verification code field — the login page's amber mono OTP input,
 * split into boxes.
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
  const { c, spacing, radius, monoFont, alpha } = useTheme();
  const feedback = useFeedback();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(autoFocus);

  // Fire once per distinct complete code. Callers pass inline arrows, so
  // depending on `onComplete` would re-submit on every parent render — and a
  // wrong code (setError → render → submit → …) would loop forever.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedFor = useRef('');
  useEffect(() => {
    if (value.length === LENGTH && firedFor.current !== value) {
      firedFor.current = value;
      onCompleteRef.current?.(value);
    }
    if (value.length < LENGTH) firedFor.current = '';
  }, [value]);

  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');
  const caretIndex = Math.min(value.length, LENGTH - 1);

  // The site's OTP field sits on `bg-slate-950/80` inside the card.
  const ground = c.dark ? alpha(c.bg, 0.8) : c.surfaceAlt;

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
              width: 46,
              height: 56,
              borderRadius: radius.md,
              backgroundColor: ground,
              borderWidth: 1.5,
              borderColor: active ? c.gold : filled ? c.borderStrong : c.border,
              alignItems: 'center',
              justifyContent: 'center',
              // No shadow/elevation here: toggling elevation makes Android rebuild the
              // view, and this box changes on every digit typed.
              ...(active ? { backgroundColor: alpha(c.gold, c.dark ? 0.12 : 0.08) } : null),
            }}
          >
            <Text
              tone="gold"
              style={{
                fontFamily: monoFont,
                fontSize: 24,
                lineHeight: 30,
                fontWeight: '900',
                letterSpacing: 1,
              }}
            >
              {digit}
            </Text>
            {active && !filled ? (
              <View
                style={{
                  position: 'absolute',
                  bottom: 12,
                  width: 14,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: c.gold,
                }}
              />
            ) : null}
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
