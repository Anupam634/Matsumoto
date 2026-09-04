import React, { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
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
/** A tighter second pass, for the rare photo that is still too dense. */
const FALLBACK_EDGE = 960;
const FALLBACK_QUALITY = 0.7;
/** Mirrors `MAX_BASE64_CHARS` in backend/src/kyc/dto.ts. */
const MAX_BASE64_CHARS = 2_800_000;

type PickedAsset = Pick<ImagePicker.ImagePickerAsset, 'uri' | 'width' | 'height'>;

/**
 * Renders `asset` at most `edge` px on its longer side and encodes it.
 *
 * Images already within the limit are only re-encoded, never upscaled, and
 * the native image objects are released as soon as the base64 is in hand —
 * a phone photo is tens of megabytes decoded, and the GC does not see it.
 */
async function encodeScaled(
  asset: PickedAsset,
  edge: number,
  quality: number,
): Promise<string | null> {
  const { uri, width, height } = asset;
  const context = ImageManipulator.manipulate(uri);
  try {
    if (Math.max(width, height) > edge) {
      context.resize(width >= height ? { width: edge } : { height: edge });
    }
    const rendered = await context.renderAsync();
    try {
      const result = await rendered.saveAsync({
        compress: quality,
        format: SaveFormat.JPEG,
        base64: true,
      });
      return result.base64 ?? null;
    } finally {
      rendered.release();
    }
  } finally {
    context.release();
  }
}

/**
 * A phone photo is several megabytes and far more resolution than a reviewer
 * needs, so each capture is downscaled and re-encoded before it is base64'd —
 * the same treatment the web app gives a file input, and what keeps the
 * request inside the API's size cap.
 */
async function toScaledImage(asset: PickedAsset): Promise<KycImage> {
  let data = await encodeScaled(asset, MAX_EDGE, JPEG_QUALITY);
  if (data && data.length > MAX_BASE64_CHARS) {
    data = await encodeScaled(asset, FALLBACK_EDGE, FALLBACK_QUALITY);
  }
  if (!data) throw new Error('encode failed');
  if (data.length > MAX_BASE64_CHARS) throw new Error('image too large');
  return { mimeType: 'image/jpeg', data };
}

export default function KycScreen() {
  const { c, spacing, radius, alpha } = useTheme();
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

  // The hook already fetches on mount; refresh on every *return* to the
  // screen so a review that landed meanwhile is reflected.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload({ silent: true });
    }, [reload]),
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
      toast.success(t('kyc.pendingBody'));
      await Promise.all([reload({ silent: true }), refresh()]);
    } catch (err) {
      feedback.error();
      setFormError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  // The web's StatusCard tones: emerald / amber / red / slate.
  const statusTint =
    state?.status === 'APPROVED'
      ? c.success
      : state?.status === 'PENDING'
        ? c.gold
        : state?.status === 'REJECTED'
          ? c.danger
          : c.textSecondary;
  const statusIcon: keyof typeof Ionicons.glyphMap =
    state?.status === 'APPROVED'
      ? 'shield-checkmark'
      : state?.status === 'PENDING'
        ? 'hourglass-outline'
        : state?.status === 'REJECTED'
          ? 'close-circle-outline'
          : 'shield-outline';

  return (
    <Screen>
      <NavBar title={t('kyc.title')} subtitle={t('kyc.why')} large transparent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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
          <Animated.View entering={FadeInDown.duration(260)}>
            <Card
              glow={state.status === 'APPROVED' || state.status === 'PENDING'}
              accent={alpha(statusTint, c.dark ? 0.3 : 0.5)}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: radius.xl - 1,
                  backgroundColor: alpha(statusTint, c.dark ? 0.08 : 0.06),
                }}
              />
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
                    backgroundColor: alpha(statusTint, 0.15),
                    borderWidth: 1,
                    borderColor: alpha(statusTint, 0.3),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={statusIcon} size={22} color={statusTint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="overline" uppercase style={{ color: statusTint }}>
                    {t(`kyc.status.${state.status}`)}
                  </Text>
                  <Text variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
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
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.md,
                    marginTop: spacing.md,
                    paddingTop: spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: c.border,
                  }}
                >
                  <Detail label={t('kyc.fullName')} value={state.fullName} />
                  {state.documentType ? (
                    <Detail
                      label={t('kyc.documentType')}
                      value={t(`kyc.docType.${state.documentType}`)}
                    />
                  ) : null}
                  {state.countryCode ? (
                    <Detail
                      label={t('kyc.country')}
                      value={`${countryFlag(state.countryCode)} ${countryName(state.countryCode, locale)}`}
                    />
                  ) : null}
                </View>
              ) : null}
              {state.submittedAt ? (
                <Text variant="caption" mono tone="tertiary" style={{ marginTop: spacing.sm, fontSize: 10 }}>
                  {t('kycScreen.submittedOn', { date: formatDate(state.submittedAt, locale) })}
                </Text>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {state?.canSubmit ? (
          <>
            {/* Photo guidance up front — most rejections are bad photos. */}
            <Animated.View entering={FadeInDown.delay(40).duration(260)}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <IconTile icon="bulb-outline" />
                  <Text variant="headline" style={{ flex: 1 }}>
                    {t('kycScreen.photoTipsTitle')}
                  </Text>
                </View>
                <View style={{ marginTop: spacing.sm }}>
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
                      <Ionicons name="checkmark-circle" size={15} color={c.success} />
                      <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                        {tip}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(260)}>
              <Card>
                <Text variant="overline" tone="tertiary" uppercase>
                  {t('kycScreen.stepDetails')}
                </Text>
                <Text variant="headline" style={{ marginTop: 2 }}>
                  {t('kyc.formTitle')}
                </Text>
                <Text variant="caption" tone="tertiary" style={{ marginBottom: spacing.md }}>
                  {t('kyc.formHint')}
                </Text>

                <Input
                  label={t('kyc.fullName')}
                  icon="person-outline"
                  value={fullName}
                  onChangeText={setFullName}
                  autoComplete="name"
                  placeholder={t('kycScreen.fullNamePlaceholder')}
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
                  <DocTypeList value={documentType} onChange={setDocumentType} />
                </View>

                <Input
                  label={t('kyc.documentNumber')}
                  icon="card-outline"
                  value={documentNumber}
                  onChangeText={setDocumentNumber}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  mono
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
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(260)}>
              <Card>
                <Text variant="overline" tone="tertiary" uppercase style={{ marginBottom: spacing.md }}>
                  {t('kycScreen.stepDocument')}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <PhotoSlot
                    label={t('kyc.front')}
                    value={front}
                    onChange={setFront}
                    required
                  />
                  <PhotoSlot label={t('kyc.back')} value={back} onChange={setBack} />
                </View>

                <Text
                  variant="overline"
                  tone="tertiary"
                  uppercase
                  style={{ marginTop: spacing.lg, marginBottom: spacing.md }}
                >
                  {t('kycScreen.stepSelfie')}
                </Text>
                <PhotoSlot
                  label={t('kyc.selfie')}
                  hint={t('kycScreen.selfieHint')}
                  value={selfie}
                  onChange={setSelfie}
                  front
                  required
                  wide
                />

                {formError ? (
                  <View style={{ marginTop: spacing.md }}>
                    <ErrorNote message={formError} />
                  </View>
                ) : null}

                <Text variant="caption" tone="tertiary" style={{ marginTop: spacing.md }}>
                  {t('kyc.privacy')}
                </Text>

                <Button
                  label={busy ? t('kyc.submitting') : t('kyc.submit')}
                  icon="shield-checkmark-outline"
                  onPress={() => void submit()}
                  loading={busy}
                  disabled={!complete}
                  fullWidth
                  size="lg"
                  style={{ marginTop: spacing.md }}
                />
              </Card>
            </Animated.View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/* ───────────────────────────── Pieces ───────────────────────────── */

/** Blue-tinted icon tile — the site's icon chip. */
function IconTile({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  const { c, radius, alpha } = useTheme();
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        backgroundColor: alpha(c.primary, 0.15),
        borderWidth: 1,
        borderColor: alpha(c.primary, 0.3),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={16} color={c.primary} />
    </View>
  );
}

/** One <dt>/<dd> pair of the web's status card. */
function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={{ minWidth: '45%', flexGrow: 1 }}>
      <Text variant="overline" tone="tertiary" uppercase style={{ fontSize: 9 }}>
        {label}
      </Text>
      <Text variant="footnote" weight="600" mono={mono} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Document type as a short radio list.
 *
 * Three labels as long as "Driver's licence" do not fit a segmented control
 * at 375pt without truncating, and a truncated label is the one you tap by
 * mistake.
 */
function DocTypeList({
  value,
  onChange,
}: {
  value: DocType;
  onChange: (next: DocType) => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  return (
    <View
      style={{
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        overflow: 'hidden',
        backgroundColor: c.surfaceAlt,
      }}
    >
      {DOC_TYPES.map((type, i) => {
        const selected = type === value;
        return (
          <Pressable
            key={type}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            onPress={() => {
              if (selected) return;
              feedback.select();
              onChange(type);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              minHeight: 44,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: c.border,
              backgroundColor: selected
                ? alpha(c.primary, 0.15)
                : pressed
                  ? alpha(c.primary, 0.06)
                  : 'transparent',
            })}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selected ? c.primary : c.textTertiary}
            />
            <Text
              variant="callout"
              weight={selected ? '700' : '500'}
              style={{ flex: 1, color: selected ? c.primary : c.textPrimary }}
            >
              {t(`kyc.docType.${type}`)}
            </Text>
            {selected ? <Ionicons name="checkmark" size={16} color={c.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type PhotoSource = 'camera' | 'library';

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
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const feedback = useFeedback();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);

  // The picker cannot be presented while the sheet's modal is still on
  // screen (iOS silently drops it), so the choice is parked here and acted
  // on from `onDismiss`, once the sheet is fully gone.
  const pendingSource = useRef<PhotoSource | null>(null);

  const choose = (source: PhotoSource) => {
    pendingSource.current = source;
    setPicking(false);
  };

  const onSheetDismissed = () => {
    const source = pendingSource.current;
    pendingSource.current = null;
    if (source) void capture(source);
  };

  const capture = async (source: PhotoSource) => {
    setError(null);
    setNeedsSettings(false);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError(t('kycScreen.permissionCamera'));
          setNeedsSettings(!permission.canAskAgain);
          return;
        }
      }

      // The system library picker needs no permission of its own on
      // iOS 14+ / Android 13+, so it is launched straight away.
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
      onChange(await toScaledImage(result.assets[0]));
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

      {/* The web's dashed blue upload tile; solid once a photo is in. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? t('app.photoAdded') : t('app.noPhoto') }}
        onPress={() => setPicking(true)}
        style={({ pressed }) => ({
          height: wide ? 190 : 128,
          borderRadius: radius.lg,
          borderWidth: 2,
          borderStyle: value ? 'solid' : 'dashed',
          borderColor: value ? alpha(c.primary, 0.6) : alpha(c.primary, 0.4),
          backgroundColor: value ? alpha(c.primary, 0.1) : alpha(c.primary, 0.06),
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {busy ? (
          <Text variant="caption" tone="tertiary">
            {t('app.loading')}
          </Text>
        ) : value ? (
          <>
            <Image
              source={{ uri: `data:${value.mimeType};base64,${value.data}` }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: c.success,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: 8, padding: spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: alpha(c.primary, 0.15),
                borderWidth: 1,
                borderColor: alpha(c.primary, 0.3),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={front ? 'happy-outline' : 'camera-outline'}
                size={20}
                color={c.primary}
              />
            </View>
            <Text variant="caption" tone="brand" weight="600" center>
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
      {needsSettings ? (
        <Button
          label={t('app.openSettings')}
          icon="settings-outline"
          variant="secondary"
          size="sm"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}

      <Sheet
        visible={picking}
        onClose={() => setPicking(false)}
        onDismiss={onSheetDismissed}
        title={label}
        scrollable={false}
      >
        <Button
          label={value ? t('kycScreen.retake') : t('kycScreen.takePhoto')}
          icon="camera-outline"
          onPress={() => choose('camera')}
          fullWidth
          size="lg"
        />
        <Button
          label={t('kycScreen.chooseFromLibrary')}
          icon="images-outline"
          variant="secondary"
          onPress={() => choose('library')}
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
