import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Application from 'expo-application';

import { Text } from '../../src/components/ui/Text';
import { SectionLabel } from '../../src/components/ui/Card';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { ConfirmSheet } from '../../src/components/ui/Sheet';
import { NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { LOCALE_LABELS, systemLocale, useI18n, useT } from '../../src/i18n';
import { useSettings } from '../../src/store/settings';
import { useSession } from '../../src/store/session';
import { useNotifications } from '../../src/store/notifications';
import { useToast } from '../../src/components/ui/Toast';
import { createSupportTicket } from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';

/**
 * Settings.
 *
 * Grouped the way iOS groups them: what the app looks like, how it talks to
 * you, what it protects, and what it knows about you — each group small enough
 * to read without scrolling past the thing you came for.
 */
export default function SettingsScreen() {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const { settings, update, reset } = useSettings();
  const { signOut } = useSession();
  const { clear, resetForNewSession } = useNotifications();

  const [biometricsAvailable, setBiometricsAvailable] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void (async () => {
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync().catch(() => false),
        LocalAuthentication.isEnrolledAsync().catch(() => false),
      ]);
      setBiometricsAvailable(hardware && enrolled);
    })();
  }, []);

  const themeLabel = {
    system: t('settings.themeSystem'),
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
  }[settings.themeMode];

  const localeLabel =
    settings.locale === 'system'
      ? `${t('settings.languageSystem')} · ${LOCALE_LABELS[systemLocale()].label}`
      : LOCALE_LABELS[settings.locale].label;

  const notificationsLabel = settings.notifications.enabled
    ? t('app.enabled')
    : t('app.disabled');

  /**
   * Account deletion.
   *
   * There is no delete endpoint — payouts and KYC records have retention
   * obligations — so this opens a support ticket, which is the route an
   * operator can actually action, and says so plainly.
   */
  const requestDeletion = async () => {
    setDeleting(true);
    try {
      await createSupportTicket(t('settings.deleteSubject'), t('settings.deleteBody'));
      toast.success(t('settings.deleteSent'));
      setConfirmDelete(false);
      router.push('/support');
    } catch (err) {
      toast.error(errorMessage(err, t('app.offline')));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen sunken>
      <NavBar title={t('settings.title')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
      >
        <View>
          <SectionLabel>{t('settings.appearance')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="color-palette-outline"
              tone="brand"
              title={t('settings.theme')}
              value={themeLabel}
              onPress={() => router.push('/settings/appearance')}
            />
            <ListRow
              icon="language-outline"
              title={t('settings.language')}
              value={localeLabel}
              onPress={() => router.push('/settings/language')}
            />
          </ListGroup>
        </View>

        <View>
          <SectionLabel>{t('notify.title')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="notifications-outline"
              tone="brand"
              title={t('notify.settingsTitle')}
              value={notificationsLabel}
              onPress={() => router.push('/settings/notifications')}
            />
          </ListGroup>
        </View>

        <View>
          <SectionLabel>{t('settings.feedback')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="pulse-outline"
              title={t('settings.haptics')}
              subtitle={t('settings.hapticsBody')}
              toggle={{
                value: settings.haptics,
                onChange: (haptics) => update({ haptics }),
              }}
            />
            <ListRow
              icon="volume-medium-outline"
              title={t('settings.sounds')}
              subtitle={t('settings.soundsBody')}
              toggle={{
                value: settings.sounds,
                onChange: (sounds) => update({ sounds }),
              }}
            />
            <ListRow
              icon="flash-outline"
              tone="warning"
              title={t('settings.quickMine')}
              subtitle={t('settings.quickMineBody')}
              toggle={{
                value: settings.quickMine,
                onChange: (quickMine) => update({ quickMine }),
              }}
            />
          </ListGroup>
        </View>

        <View>
          <SectionLabel>{t('settings.privacy')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="finger-print-outline"
              tone="success"
              title={t('settings.appLock')}
              subtitle={
                biometricsAvailable
                  ? t('settings.appLockBody')
                  : t('settings.appLockUnavailable')
              }
              toggle={{
                value: settings.appLock,
                disabled: !biometricsAvailable,
                onChange: (appLock) => update({ appLock }),
              }}
            />
            <ListRow
              icon="eye-off-outline"
              title={t('settings.privateBalance')}
              subtitle={t('settings.privateBalanceBody')}
              toggle={{
                value: settings.privateBalance,
                onChange: (privateBalance) => update({ privateBalance }),
              }}
            />
            <ListRow
              icon="shield-outline"
              title={t('settings.legal')}
              onPress={() => router.push('/legal/privacy')}
            />
          </ListGroup>
        </View>

        <View>
          <SectionLabel>{t('settings.account')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="key-outline"
              title={t('settings.changePassword')}
              subtitle={t('settings.changePasswordBody')}
              onPress={async () => {
                // Password changes run through the same recovery flow the web
                // app uses: email a code, then set the new password.
                await signOut();
                router.replace('/(auth)/forgot');
              }}
            />
            <ListRow
              icon="trash-outline"
              tone="danger"
              title={t('settings.deleteAccount')}
              subtitle={t('settings.deleteAccountBody')}
              onPress={() => setConfirmDelete(true)}
            />
          </ListGroup>
        </View>

        <View>
          <SectionLabel>{t('settings.data')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="refresh-outline"
              title={t('settings.clearCache')}
              subtitle={t('settings.clearCacheBody')}
              onPress={async () => {
                clear();
                await resetForNewSession();
                toast.success(t('settings.clearCacheDone'));
              }}
            />
            <ListRow
              icon="settings-outline"
              tone="warning"
              title={t('settings.resetSettings')}
              onPress={() => setConfirmReset(true)}
            />
          </ListGroup>
        </View>

        <View>
          <SectionLabel>{t('settings.about')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="information-circle-outline"
              title={t('settings.about')}
              value={Application.nativeApplicationVersion ?? '1.0.0'}
              onPress={() => router.push('/settings/about')}
            />
          </ListGroup>
        </View>

        <Text variant="caption" tone="tertiary" center>
          {t('landing.footer.copyright')}
        </Text>
      </ScrollView>

      <ConfirmSheet
        visible={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setConfirmReset(false);
          toast.success(t('app.done'));
        }}
        icon="refresh-outline"
        title={t('settings.resetConfirm')}
        confirmLabel={t('settings.resetSettings')}
        cancelLabel={t('app.cancel')}
        destructive
      />

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void requestDeletion()}
        loading={deleting}
        icon="trash-outline"
        title={t('settings.deleteAccount')}
        body={t('settings.deleteConfirm')}
        confirmLabel={t('app.confirm')}
        cancelLabel={t('app.cancel')}
        destructive
      />
    </Screen>
  );
}
