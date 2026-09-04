import React, { useCallback, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { Badge, type BadgeTone } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Sheet } from '../../src/components/ui/Sheet';
import {
  EmptyState,
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import { useAsyncData } from '../../src/lib/hooks';
import {
  createSupportTicket,
  getSupportTickets,
  SUPPORT_MAX_OPEN,
  type SupportTicketDto,
  type TicketStatus,
} from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { relativeTime } from '../../src/lib/format';

/** The site's chips: OPEN blue, ANSWERED emerald, CLOSED slate. */
const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  OPEN: 'brand',
  ANSWERED: 'success',
  CLOSED: 'neutral',
};

/**
 * Support inbox.
 *
 * The FAQ is offered first because most questions are already answered there,
 * and the open-ticket cap is shown before the compose button rather than as a
 * server error after writing a message.
 */
export default function SupportScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const feedback = useFeedback();

  const load = useCallback(() => getSupportTickets(), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data: tickets, error, loading, refreshing, reload } =
    useAsyncData<SupportTicketDto[]>(load, toMessage);

  // The hook fetches on mount; refresh on every *return* so a reply that
  // arrived while a thread was open shows in the inbox straight away.
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

  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openTickets = (tickets ?? []).filter((x) => x.status !== 'CLOSED');
  const closedTickets = (tickets ?? []).filter((x) => x.status === 'CLOSED');
  const atCap = openTickets.length >= SUPPORT_MAX_OPEN;

  // Matches the server's DTO, so the button disables rather than round-trips.
  const valid = subject.trim().length >= 3 && body.trim().length >= 10;

  const send = async () => {
    setBusy(true);
    setFormError(null);
    try {
      const ticket = await createSupportTicket(subject.trim(), body.trim());
      feedback.success();
      toast.success(t('supportScreen.sent'));
      setSubject('');
      setBody('');
      setComposing(false);
      await reload({ silent: true });
      router.push(`/support/${ticket.id}`);
    } catch (err) {
      feedback.error();
      setFormError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <NavBar title={t('support.title')} subtitle={t('support.subtitle')} transparent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void reload()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        {/* The web's indigo-tinted FAQ strip */}
        <Animated.View entering={FadeInDown.duration(260)}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              feedback.select();
              router.push('/legal/faq');
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              minHeight: 56,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: alpha(c.primary, 0.25),
              backgroundColor: alpha(c.primary, 0.1),
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: alpha(c.primary, 0.15),
                borderWidth: 1,
                borderColor: alpha(c.primary, 0.3),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="help-circle-outline" size={19} color={c.primary} />
            </View>
            <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
              {t('support.tryFaq')}
            </Text>
            <Text variant="footnote" weight="700" tone="brand">
              {t('support.readFaq')} →
            </Text>
          </Pressable>
        </Animated.View>

        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}

        <Animated.View entering={FadeInDown.delay(40).duration(260)}>
          <Button
            label={t('supportScreen.newTicket')}
            icon="create-outline"
            onPress={() => setComposing(true)}
            disabled={atCap}
            fullWidth
          />
          {atCap ? (
            <Text variant="caption" tone="tertiary" center style={{ marginTop: spacing.sm }}>
              {t('support.atCap', { max: SUPPORT_MAX_OPEN })}
            </Text>
          ) : null}
        </Animated.View>

        {loading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} height={82} radius={radius.xl} />
            ))}
          </View>
        ) : (tickets ?? []).length === 0 ? (
          <Card>
            <EmptyState icon="chatbubbles-outline" title={t('support.empty')} />
          </Card>
        ) : (
          <>
            {openTickets.length > 0 ? (
              <>
                <SectionLabel>{t('supportScreen.openTickets')}</SectionLabel>
                {openTickets.map((ticket, i) => (
                  <Animated.View
                    key={ticket.id}
                    entering={FadeInDown.delay(80 + i * 40).duration(260)}
                  >
                    <TicketRow
                      ticket={ticket}
                      onPress={() => router.push(`/support/${ticket.id}`)}
                      relative={relativeTime(ticket.updatedAt, t, locale)}
                    />
                  </Animated.View>
                ))}
              </>
            ) : null}

            {closedTickets.length > 0 ? (
              <>
                <SectionLabel>{t('supportScreen.closedTickets')}</SectionLabel>
                {closedTickets.map((ticket, i) => (
                  <Animated.View
                    key={ticket.id}
                    entering={FadeInDown.delay(120 + i * 40).duration(260)}
                  >
                    <TicketRow
                      ticket={ticket}
                      onPress={() => router.push(`/support/${ticket.id}`)}
                      relative={relativeTime(ticket.updatedAt, t, locale)}
                    />
                  </Animated.View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Sheet
        visible={composing}
        onClose={() => setComposing(false)}
        title={t('supportScreen.newTicket')}
      >
        <Input
          label={t('support.subject')}
          value={subject}
          onChangeText={setSubject}
          placeholder={t('support.subjectPlaceholder')}
          hint={t('supportScreen.subjectHint')}
          maxLength={120}
          autoFocus
        />
        <Input
          label={t('support.message')}
          value={body}
          onChangeText={setBody}
          placeholder={t('support.messagePlaceholder')}
          multiline
          maxLength={4000}
          hint={`${t('supportScreen.messageHint')} · ${body.length}/4000`}
        />
        {formError ? <ErrorNote message={formError} /> : null}
        <Button
          label={busy ? t('support.sending') : t('support.send')}
          onPress={() => void send()}
          loading={busy}
          disabled={!valid}
          fullWidth
          size="lg"
        />
      </Sheet>
    </Screen>
  );
}

function TicketRow({
  ticket,
  onPress,
  relative,
}: {
  ticket: SupportTicketDto;
  onPress: () => void;
  relative: string;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();

  const lastMessage = ticket.messages[ticket.messages.length - 1];
  const tint =
    ticket.status === 'ANSWERED'
      ? c.success
      : ticket.status === 'OPEN'
        ? c.primary
        : c.textTertiary;

  return (
    <Card onPress={onPress} accessibilityLabel={ticket.subject}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: alpha(tint, 0.15),
            borderWidth: 1,
            borderColor: alpha(tint, 0.3),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={
              ticket.status === 'ANSWERED'
                ? 'chatbubble-ellipses'
                : ticket.status === 'OPEN'
                  ? 'chatbubble-outline'
                  : 'checkmark-done-outline'
            }
            size={17}
            color={tint}
          />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Text variant="headline" style={{ flex: 1 }} numberOfLines={1}>
              {ticket.subject}
            </Text>
            <Badge label={t(`support.status.${ticket.status}`)} tone={STATUS_TONE[ticket.status]} dot />
          </View>

          {lastMessage ? (
            <Text variant="footnote" tone="secondary" numberOfLines={2}>
              {lastMessage.fromAdmin ? (
                <Text variant="footnote" tone="brand" weight="700">
                  {t('support.fromSupport')}:{' '}
                </Text>
              ) : null}
              {lastMessage.body}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 2,
            }}
          >
            <Ionicons name="chatbubble-outline" size={12} color={c.textTertiary} />
            <Text variant="caption" tone="tertiary" mono style={{ fontSize: 11 }}>
              {t('support.messageCount', { n: ticket.messages.length })} · {relative}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={c.textTertiary} style={{ marginTop: 10 }} />
      </View>
    </Card>
  );
}
