import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
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

export const STATUS_TONE: Record<TicketStatus, 'warning' | 'success' | 'neutral'> = {
  OPEN: 'warning',
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
  const { c, spacing, radius } = useTheme();
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
      toast.success(t('supportScreen.send'));
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
    <Screen sunken>
      <NavBar title={t('support.title')} subtitle={t('support.subtitle')} />

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
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/legal/faq')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: c.infoMuted,
          }}
        >
          <Ionicons name="help-circle-outline" size={19} color={c.info} />
          <Text variant="footnote" style={{ color: c.info, flex: 1 }}>
            {t('support.tryFaq')}
          </Text>
          <Text variant="footnote" weight="700" style={{ color: c.info }}>
            {t('support.readFaq')}
          </Text>
        </Pressable>

        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}

        <Button
          label={t('supportScreen.newTicket')}
          icon="create-outline"
          onPress={() => setComposing(true)}
          disabled={atCap}
          fullWidth
        />
        {atCap ? (
          <Text variant="caption" tone="tertiary" center>
            {t('support.atCap', { max: SUPPORT_MAX_OPEN })}
          </Text>
        ) : null}

        {loading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} height={82} radius={radius.xl} />
            ))}
          </View>
        ) : (tickets ?? []).length === 0 ? (
          <EmptyState icon="chatbubbles-outline" title={t('support.empty')} />
        ) : (
          <>
            {openTickets.length > 0 ? (
              <>
                <SectionLabel>{t('supportScreen.openTickets')}</SectionLabel>
                {openTickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onPress={() => router.push(`/support/${ticket.id}`)}
                    relative={relativeTime(ticket.updatedAt, t, locale)}
                  />
                ))}
              </>
            ) : null}

            {closedTickets.length > 0 ? (
              <>
                <SectionLabel>{t('supportScreen.closedTickets')}</SectionLabel>
                {closedTickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onPress={() => router.push(`/support/${ticket.id}`)}
                    relative={relativeTime(ticket.updatedAt, t, locale)}
                  />
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
          maxLength={120}
        />
        <Input
          label={t('support.message')}
          value={body}
          onChangeText={setBody}
          placeholder={t('support.messagePlaceholder')}
          multiline
          maxLength={4000}
          hint={`${body.length}/4000`}
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
  const { c, spacing } = useTheme();
  const t = useT();

  const lastMessage = ticket.messages[ticket.messages.length - 1];

  return (
    <Card onPress={onPress} accessibilityLabel={ticket.subject}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: 4,
        }}
      >
        <Text variant="headline" style={{ flex: 1 }} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <Badge label={t(`support.status.${ticket.status}`)} tone={STATUS_TONE[ticket.status]} />
      </View>

      {lastMessage ? (
        <Text variant="footnote" tone="secondary" numberOfLines={2}>
          {lastMessage.fromAdmin ? `${t('support.fromSupport')}: ` : ''}
          {lastMessage.body}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginTop: spacing.sm,
        }}
      >
        <Ionicons name="chatbubble-outline" size={13} color={c.textTertiary} />
        <Text variant="caption" tone="tertiary">
          {t('support.messageCount', { n: ticket.messages.length })} · {relative}
        </Text>
      </View>
    </Card>
  );
}
