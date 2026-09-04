import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function SettingsLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bgSunken },
        animation: 'slide_from_right',
      }}
    />
  );
}
