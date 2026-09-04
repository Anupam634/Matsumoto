import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';

/** Visible height of the tab bar above the home indicator / nav bar. */
export const TAB_BAR_HEIGHT = 54;

/**
 * Bottom padding a tab screen's scroll view needs so its last card clears the
 * translucent tab bar. Works outside a tab navigator too (falls back to the
 * safe-area inset), so shared list components can call it unconditionally.
 */
export function useTabContentInset(extra: number = spacing.xl): number {
  const insets = useSafeAreaInsets();
  const barHeight = useContext(BottomTabBarHeightContext);
  return (barHeight ?? insets.bottom) + extra;
}
