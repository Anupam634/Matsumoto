import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../src/components/ui/Text';
import { Card, SectionLabel } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Segmented } from '../src/components/ui/Segmented';
import { Sheet } from '../src/components/ui/Sheet';
import { CountryPicker } from '../src/components/common/CountryPicker';
import { ErrorNote, NavBar, Screen, Skeleton } from '../src/components/ui/Chrome';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useSession } from '../src/store/session';
import { useToast } from '../src/components/ui/Toast';
import { useFeedback } from '../src/lib/feedback';
import { useAsyncData } from '../src/lib/hooks';
import {
  getKyc,
  submitKyc,
  type KycImage,
  type KycStatusDto,
} from '../src/api/endpoints';
import { errorMessage } from '../src/api/client';
import { countryFlag, countryName, formatDate } from '../src/lib/format';

const DOC_TYPES = ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE'] as const;
type DocType = (typeof DOC_TYPES)[number];

/** Longest edge, in px, a photo is scaled to before encoding. */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.8;

/**
 * Identity verification.
 *
 * A phone photo is several megabytes and far more resolution than a reviewer
 * needs, so each capture is downscaled and re-encoded before it is base64'd —
 * the same treatment the web app gives a file input, and what keeps the
 * request inside the API's size cap.
 */
async function toScaledImage(uri: string): Promise<KycImage> {
  const context = ImageManipulator.manipulate(uri).resize({ width: MAX_EDGE });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('encode failed');
  return { mimeType: 'image/jpeg', data: result.base64 };
}

export default function KycScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const feedback = useFeedback();
  const { refresh } = useSession();

  const load = useCallback(() => getKyc(), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data: state, error, loading, reload } = useAsyncData<KycStatusDto>(
    load,
    toMessage,
  );

  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<DocType>('PASSPORT');
  const [documentNumber, setDocumentNumber] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [front, setFront] = useState<KycImage | null>(null);
  const [back, setBack] = useState<KycImage | null>(null);
  const [selfie, setSelfie] = useState<KycImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const complete =
    fullName.trim().length >= 2 &&
    documentNumber.trim().length >= 3 &&
    countryCode &&
    front &&
    selfie;

  const submit = async () => {
    if (!front || !selfie) return setFormError(t('kyc.needImages'));
    setBusy(true);
    setFormError(null);
    try {
      await submitKyc({
        fullName: fullName.trim(),
        documentType,
        documentNumber: documentNumber.trim(),
        countryCode,
        front,
        back: back ?? undefined,
        selfie,
      });
      feedback.success();
      toast.success(t('kyc.status.PENDING'));
      await Promise.all([reload({ silent: true }), refresh()]);
    } catch (err) {
      feedback.error();
      setFormError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  const statusTone =
    state?.status === 'APPROVED'
      ? 'success'
      : state?.status === 'PENDING'
        ? 'warning'
        : state?.status === 'REJECTED'
          ? 'danger'
          : 'neutral';

  return (
    <Screen sunken>
      <NavBar title={t('kyc.title')} subtitle={t('kyc.why')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}

        {loading ? (
          <Skeleton height={120} radius={radius.xl} />
        ) : state ? (
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor:
                    statusTone === 'success'
                      ? c.successMuted
                      : statusTone === 'warning'
                        ? c.warningMuted
                        : statusTone === 'danger'
                          ? c.dangerMuted
                          : c.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={
                    state.status === 'APPROVED'
                      ? 'shield-checkmark'
                      : state.status === 'PENDING'
                        ? 'hourglass-outline'
                        : state.status === 'REJECTED'
                          ? 'close-circle-outline'
                          : 'shield-outline'
                  }
                  size={22}
                  color={
                    statusTone === 'success'
                      ? c.success
                      : statusTone === 'warning'
                        ? c.warning
                        : statusTone === 'danger'
                          ? c.danger
                          : c.textSecondary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{t(`kyc.status.${state.status}`)}</Text>
                <Text variant="caption" tone="secondary">
                  {state.status === 'PENDING'
                    ? t('kyc.pendingBody')
                    : state.status === 'APPROVED'
                      ? t('kyc.approvedBody')
                      : state.status === 'REJECTED' && state.reviewerNote
                        ? `${t('kyc.reason')}: ${state.reviewerNote}`
                        : t('kyc.formHint')}
                </Text>
              </View>
            </View>

            {state.fullName ? (
              <View
                style={{
                  marginTop: spacing.md,
                  paddingTop: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  gap: 4,
                }}
              >
                <Text variant="footnote" tone="secondary">
                  {state.fullName}
                  {state.documentType ? ` · ${t(`kyc.docType.${state.documentType}`)}` : ''}
                </Text>
                {state.countryCode ? (
                  <Text variant="caption" tone="tertiary">
                    {countryFlag(state.countryCode)}{' '}
                    {countryName(state.countryCode, locale)}
                    {state.submittedAt
                      ? ` · ${formatDate(state.submittedAt, locale)}`
                      : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Card>
        ) : null}

        {state?.canSubmit ? (
          <>
            {/* Photo guidance up front — most rejections are bad photos. */}
            <Card>
              <Text variant="headline" style={{ marginBottom: spacing.sm }}>
                {t('kycScreen.photoTipsTitle')}
              </Text>
              {[
                t('kycScreen.photoTip1'),
                t('kycScreen.photoTip2'),
                t('kycScreen.photoTip3'),
              ].map((tip) => (
                <View
                  key={tip}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: 5,
                  }}
                >
                  <Ionicons name="ellipse" size={5} color={c.textTertiary} />
                  <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                    {tip}
                  </Text>
                </View>
              ))}
            </Card>

            <SectionLabel>{t('kycScreen.stepDetails')}</SectionLabel>
            <Card>
              <Input
                label={t('kyc.fullName')}
                icon="person-outline"
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
                placeholder="As printed on the document"
              />

              <View style={{ marginTop: spacing.lg }}>
                <Text
                  variant="footnote"
                  tone="secondary"
                  weight="600"
                  style={{ marginBottom: 6 }}
                >
                  {t('kyc.documentType')}
                </Text>
                <Segmented
                  options={DOC_TYPES.map((d) => ({
                    value: d,
                    label: t(`kyc.docType.${d}`),
                  }))}
                  value={documentType}
                  onChange={setDocumentType}
                />
              </View>

              <Input
                label={t('kyc.documentNumber')}
                icon="card-outline"
                value={documentNumber}
                onChangeText={setDocumentNumber}
                autoCapitalize="characters"
                autoCorrect={false}
                containerStyle={{ marginTop: spacing.lg }}
              />

              <View style={{ marginTop: spacing.lg }}>
                <CountryPicker
                  value={countryCode}
                  onChange={setCountryCode}
                  label={t('kyc.country')}
                  placeholder={t('kyc.countryPlaceholder')}
                />
              </View>
            </Card>

            <SectionLabel>{t('kycScreen.stepDocument')}</SectionLabel>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <PhotoSlot
                label={t('kyc.front')}
                value={front}
                onChange={setFront}
                required
              />
              <PhotoSlot label={t('kyc.back')} value={back} onChange={setBack} />
            </View>

            <SectionLabel>{t('kycScreen.stepSelfie')}</SectionLabel>
            <PhotoSlot
              label={t('kyc.selfie')}
              hint={t('kycScreen.selfieHint')}
              value={selfie}
              onChange={setSelfie}
              front
              required
              wide
            />

            {formError ? <ErrorNote message={formError} /> : null}

            <Text variant="caption" tone="tertiary">
              {t('kyc.privacy')}
            </Text>

            <Button
              label={busy ? t('kyc.submitting') : t('kyc.submit')}
              onPress={() => void submit()}
              loading={busy}
              disabled={!complete}
              fullWidth
              size="lg"
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/**
 * One document photo.
 *
 * Offers camera or library, asks for the permission it needs at the moment it
 * needs it, and shows the captured frame so a blurry shot is caught before
 * submission rather than by a reviewer a day later.
 */
function PhotoSlot({
  label,
  hint,
  value,
  onChange,
  required,
  front,
  wide,
}: {
  label: string;
  hint?: string;
  value: KycImage | null;
  onChange: (next: KycImage | null) => void;
  required?: boolean;
  /** Opens the selfie camera. */
  front?: boolean;
  wide?: boolean;
}) {
  const { c, spacing, radius } = useTheme();
  const t = useT();
  const feedback = useFeedback();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async (source: 'camera' | 'library') => {
    setPicking(false);
    setError(null);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError(
          source === 'camera'
            ? t('kycScreen.permissionCamera')
            : t('kycScreen.permissionLibrary'),
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.9,
              cameraType: front
                ? ImagePicker.CameraType.front
                : ImagePicker.CameraType.back,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.9,
            });

      if (result.canceled || !result.assets[0]) return;

      setBusy(true);
      onChange(await toScaledImage(result.assets[0].uri));
      feedback.success();
    } catch {
      setError(t('kyc.imageError'));
      onChange(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: wide ? undefined : 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text variant="footnote" tone="secondary" weight="600">
          {label}
        </Text>
        {!required ? (
          <Badge label={t('kyc.optional')} tone="neutral" />
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setPicking(true)}
        style={{
          height: wide ? 190 : 128,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderStyle: value ? 'solid' : 'dashed',
          borderColor: value ? c.primary : c.borderStrong,
          backgroundColor: c.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {busy ? (
          <Text variant="caption" tone="tertiary">
            {t('app.loading')}
          </Text>
        ) : value ? (
          <Image
            source={{ uri: `data:${value.mimeType};base64,${value.data}` }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <View style={{ alignItems: 'center', gap: 6, padding: spacing.md }}>
            <Ionicons
              name={front ? 'happy-outline' : 'camera-outline'}
              size={24}
              color={c.textTertiary}
            />
            <Text variant="caption" tone="tertiary" center>
              {t('kyc.tapToUpload')}
            </Text>
          </View>
        )}
      </Pressable>

      {hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}

      <Sheet
        visible={picking}
        onClose={() => setPicking(false)}
        title={label}
        scrollable={false}
      >
        <Button
          label={t('kycScreen.takePhoto')}
          icon="camera-outline"
          onPress={() => void capture('camera')}
          fullWidth
          size="lg"
        />
        <Button
          label={t('kycScreen.chooseFromLibrary')}
          icon="images-outline"
          variant="secondary"
          onPress={() => void capture('library')}
          fullWidth
        />
        {value ? (
          <Button
            label={t('app.remove')}
            variant="danger"
            onPress={() => {
              onChange(null);
              setPicking(false);
            }}
            fullWidth
          />
        ) : null}
      </Sheet>
    </View>
  );
}
