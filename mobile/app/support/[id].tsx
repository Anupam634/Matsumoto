import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { Badge } from '../../src/components/ui/Badge';
import { Input, InputAction } from '../../src/components/ui/Input';
import {
  EmptyState,
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../../src/components/ui/Chrome';
import { STATUS_TONE } from './index';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useFeedback } from '../../src/lib/feedback';
import { useAsyncData } from '../../src/lib/hooks';
import {
  getSupportTickets,
  replyToSupportTicket,
  type SupportTicketDto,
} from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { formatDateTime } from '../../src/lib/format';

/**
 * One support thread, as a conversation.
 *
 * The API returns tickets as a list rather than by id, so the thread is picked
 * out of that list — one request either way, and it keeps the inbox and the
 * thread from disagreeing about status.
 */
export default function TicketScreen() {
  const { c, spacing, radius } = useTheme();
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
  const { data: tickets, error, loading, reload } =
    useAsyncData<SupportTicketDto[]>(load, toMessage);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);

  const ticket = tickets?.find((x) => x.id === id) ?? null;

  useEffect(() => {
    // Land on the newest message, the way a chat should open.
    if (ticket) {
      setTimeout(() => scroller.current?.scrollToEnd({ animated: false }), 60);
    }
  }, [ticket?.messages.length, ticket]);

  const send = async () => {
    if (!ticket || !draft.trim()) return;
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
    <Screen sunken>
      <NavBar
        title={ticket?.subject ?? t('supportScreen.threadTitle')}
        right={
          ticket ? (
            <Badge
              label={t(`support.status.${ticket.status}`)}
              tone={STATUS_TONE[ticket.status]}
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
            <EmptyState icon="chatbubbles-outline" title={t('support.empty')} />
          ) : (
            ticket.messages.map((message) => (
              <View
                key={message.id}
                style={{
                  maxWidth: '86%',
                  alignSelf: message.fromAdmin ? 'flex-start' : 'flex-end',
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  borderBottomLeftRadius: message.fromAdmin ? 4 : radius.lg,
                  borderBottomRightRadius: message.fromAdmin ? radius.lg : 4,
                  backgroundColor: message.fromAdmin ? c.surface : c.primary,
                  borderWidth: message.fromAdmin ? 1 : 0,
                  borderColor: c.border,
                  gap: 4,
                }}
              >
                <Text
                  variant="caption"
                  weight="700"
                  style={{
                    color: message.fromAdmin ? c.textTertiary : `${c.onPrimary}B3`,
                  }}
                >
                  {message.fromAdmin ? t('support.fromSupport') : t('support.fromYou')}
                </Text>
                <Text
                  variant="body"
                  style={{ color: message.fromAdmin ? c.textPrimary : c.onPrimary }}
                >
                  {message.body}
                </Text>
                <Text
                  variant="caption"
                  style={{
                    color: message.fromAdmin ? c.textTertiary : `${c.onPrimary}99`,
                  }}
                >
                  {formatDateTime(message.createdAt, locale)}
                </Text>
              </View>
            ))
          )}

          {replyError ? <ErrorNote message={replyError} /> : null}
        </ScrollView>

        {/* Composer */}
        <View
          style={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: c.surface,
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
