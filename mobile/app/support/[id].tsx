import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Badge, type BadgeTone } from '../../src/components/ui/Badge';
import { Input, InputAction } from '../../src/components/ui/Input';
import {
  EmptyState,
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useFeedback } from '../../src/lib/feedback';
import { useAsyncData } from '../../src/lib/hooks';
import {
  getSupportTickets,
  replyToSupportTicket,
  type SupportTicketDto,
  type TicketStatus,
} from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { formatDateTime } from '../../src/lib/format';

/** The site's chips: OPEN blue, ANSWERED emerald, CLOSED slate. */
const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  OPEN: 'brand',
  ANSWERED: 'success',
  CLOSED: 'neutral',
};

/**
 * One support thread, as a conversation.
 *
 * The API returns tickets as a list rather than by id, so the thread is picked
 * out of that list — one request either way, and it keeps the inbox and the
 * thread from disagreeing about status.
 */
export default function TicketScreen() {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const feedback = useFeedback();

  const load = useCallback(() => getSupportTickets(), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data: tickets, error, loading, refreshing, reload } =
    useAsyncData<SupportTicketDto[]>(load, toMessage);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);

  const ticket = tickets?.find((x) => x.id === id) ?? null;
  const hasDraft = draft.trim().length > 0;

  useEffect(() => {
    // Land on the newest message, the way a chat should open.
    if (ticket) {
      setTimeout(() => scroller.current?.scrollToEnd({ animated: false }), 60);
    }
  }, [ticket?.messages.length, ticket]);

  const send = async () => {
    if (sending || !ticket || !hasDraft) return;
    setSending(true);
    setReplyError(null);
    try {
      await replyToSupportTicket(ticket.id, draft.trim());
      setDraft('');
      feedback.success();
      await reload({ silent: true });
      scroller.current?.scrollToEnd({ animated: true });
    } catch (err) {
      feedback.error();
      setReplyError(errorMessage(err, t('app.offline')));
    } finally {
      setSending(false);
    }
  };

  const closed = ticket?.status === 'CLOSED';

  return (
    <Screen>
      <NavBar
        title={ticket?.subject ?? t('supportScreen.threadTitle')}
        right={
          ticket ? (
            <Badge
              label={t(`support.status.${ticket.status}`)}
              tone={STATUS_TONE[ticket.status]}
              dot
            />
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
      >
        <ScrollView
          ref={scroller}
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
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          {error ? (
            <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
          ) : null}

          {loading ? (
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={72} radius={radius.lg} />
              ))}
            </View>
          ) : !ticket ? (
            <Card>
              <EmptyState icon="chatbubbles-outline" title={t('supportScreen.notFound')} />
            </Card>
          ) : (
            ticket.messages.map((message, i) => {
              const mine = !message.fromAdmin;
              return (
                <Animated.View
                  key={message.id}
                  entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(240)}
                  style={{
                    maxWidth: '86%',
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    borderRadius: radius.lg,
                    borderBottomLeftRadius: mine ? radius.lg : 4,
                    borderBottomRightRadius: mine ? 4 : radius.lg,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: mine ? 'transparent' : c.border,
                    backgroundColor: mine ? c.primary : c.surface,
                    ...(mine && c.dark ? glow(c.primaryGlow, 1) : null),
                  }}
                >
                  {mine ? (
                    // You: the site's blue gradient bubble.
                    <LinearGradient
                      pointerEvents="none"
                      colors={[...c.primaryGradient] as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                  ) : (
                    // Operator: glass slate.
                    <LinearGradient
                      pointerEvents="none"
                      colors={[c.surfaceGradient[0], c.surfaceGradient[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                  )}
                  <View style={{ padding: spacing.md, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {!mine ? (
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            backgroundColor: alpha(c.primary, 0.15),
                            borderWidth: 1,
                            borderColor: alpha(c.primary, 0.3),
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="headset-outline" size={10} color={c.primary} />
                        </View>
                      ) : null}
                      <Text
                        variant="overline"
                        uppercase
                        style={{
                          fontSize: 9,
                          color: mine ? alpha(c.onPrimary, 0.75) : c.primary,
                        }}
                      >
                        {mine ? t('support.fromYou') : t('support.fromSupport')}
                      </Text>
                    </View>
                    <Text
                      variant="body"
                      style={{ color: mine ? c.onPrimary : c.textPrimary }}
                    >
                      {message.body}
                    </Text>
                    <Text
                      variant="caption"
                      mono
                      style={{
                        fontSize: 10,
                        color: mine ? alpha(c.onPrimary, 0.6) : c.textTertiary,
                      }}
                    >
                      {formatDateTime(message.createdAt, locale)}
                    </Text>
                  </View>
                </Animated.View>
              );
            })
          )}

          {replyError ? <ErrorNote message={replyError} /> : null}
        </ScrollView>

        {/* Composer */}
        <View
          style={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: c.chrome,
            borderTopWidth: 1,
            borderTopColor: c.border,
          }}
        >
          {closed ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                justifyContent: 'center',
                minHeight: 44,
              }}
            >
              <Ionicons name="lock-closed-outline" size={15} color={c.textTertiary} />
              <Text variant="footnote" tone="tertiary">
                {t('support.closedNote')}
              </Text>
            </View>
          ) : (
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder={t('supportScreen.typeMessage')}
              multiline
              maxLength={4000}
              trailing={
                <InputAction
                  icon={sending ? 'hourglass-outline' : 'send'}
                  accessibilityLabel={t('support.send')}
                  disabled={sending || !hasDraft}
                  tint={hasDraft && !sending ? c.primary : undefined}
                  onPress={() => void send()}
                />
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
