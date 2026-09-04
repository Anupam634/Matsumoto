import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui/Text';
import { Input } from '../ui/Input';
import { Sheet } from '../ui/Sheet';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n, useT } from '../../i18n';
import { COUNTRY_CODES } from '../../data/countries';
import { countryFlag, countryName } from '../../lib/format';

/**
 * Country selector.
 *
 * Names come from `Intl.DisplayNames`, so all 255 territories render in the
 * user's own language without shipping three translated lists — the same
 * approach the web app takes.
 */
export function CountryPicker({
  value,
  onChange,
  label,
  placeholder,
  error,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  placeholder: string;
  error?: string | null;
}) {
  const { c, spacing, radius } = useTheme();
  const { locale } = useI18n();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const collator = new Intl.Collator(locale);
    return COUNTRY_CODES.map((code) => ({
      code,
      name: countryName(code, locale),
      flag: countryFlag(code),
    })).sort((a, b) => collator.compare(a.name, b.name));
  }, [locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q),
    );
  }, [options, query]);

  const selected = options.find((o) => o.code === value.toUpperCase());

  return (
    <>
      <View>
        <Text
          variant="footnote"
          tone="secondary"
          weight="600"
          style={{ marginBottom: 6 }}
        >
          {label}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selected ? selected.name : placeholder}
          onPress={() => setOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            height: 50,
            paddingHorizontal: spacing.md,
            backgroundColor: c.surfaceAlt,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: error ? c.danger : c.border,
          }}
        >
          <Text variant="title3">{selected?.flag ?? '🌐'}</Text>
          <Text
            variant="body"
            tone={selected ? 'primary' : 'tertiary'}
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {selected?.name ?? placeholder}
          </Text>
          <Ionicons name="chevron-down" size={17} color={c.textTertiary} />
        </Pressable>
        {error ? (
          <Text variant="caption" tone="danger" style={{ marginTop: 6 }}>
            {error}
          </Text>
        ) : null}
      </View>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        scrollable={false}
        maxHeight={0.88}
      >
        <Input
          icon="search"
          placeholder={t('app.search')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          style={{ height: 420 }}
          initialNumToRender={20}
          renderItem={({ item }) => {
            const active = item.code === value.toUpperCase();
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onChange(item.code);
                  setQuery('');
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: 12,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: pressed ? c.surfaceAlt : 'transparent',
                })}
              >
                <Text variant="title3">{item.flag}</Text>
                <Text variant="body" style={{ flex: 1 }}>
                  {item.name}
                </Text>
                <Text variant="caption" tone="tertiary" mono>
                  {item.code}
                </Text>
                {active ? (
                  <Ionicons name="checkmark" size={18} color={c.primary} />
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text
              variant="footnote"
              tone="tertiary"
              center
              style={{ paddingVertical: spacing.xl }}
            >
              {t('app.somethingWrong')}
            </Text>
          }
        />
      </Sheet>
    </>
  );
}
