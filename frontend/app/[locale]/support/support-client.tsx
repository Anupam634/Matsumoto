'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  createSupportTicket,
  getSupportTickets,
  getToken,
  replyToSupportTicket,
  SUPPORT_MAX_OPEN,
  type SupportTicketDto,
} from '../../../lib/api';
import { AppHeader } from '../../../components/AppHeader';

export default function SupportClient() {
  const t = useTranslations('support');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;

  const [tickets, setTickets] = useState<SupportTicketDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTickets(await getSupportTickets());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace(`/${locale}/login`);
        return;
      }
      setError(err instanceof ApiError ? err.message : t('offline'));
    }
  }, [router, locale, t]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${locale}/login`);
      return;
    }
    load();
  }, [load, router, locale]);

  const openCount =
    tickets?.filter((x) => x.status !== 'CLOSED').length ?? 0;
  const atCap = openCount >= SUPPORT_MAX_OPEN;

  return (
    <div className="app-shell min-h-dvh">
      <AppHeader locale={locale} backLabel={t('backToDashboard')} maxWidth="max-w-3xl" />

      <main
        className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6"
        style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-slate-400">{t('subtitle')}</p>

        {/* Most questions are already answered; send people there first. */}
        <Link
          href={`/${locale}/faq`}
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm text-slate-300 transition hover:border-indigo-400/40"
        >
          <span>{t('tryFaq')}</span>
          <span className="shrink-0 font-bold text-indigo-300">
            {t('readFaq')} →
          </span>
        </Link>

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!tickets ? (
          <div className="panel mt-6 space-y-3 p-6">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : (
          <>
            {composing ? (
              <NewTicket
                onCancel={() => setComposing(false)}
                onDone={async () => {
                  setComposing(false);
                  await load();
                }}
              />
            ) : (
              <div className="mt-6">
                <button
                  onClick={() => setComposing(true)}
                  disabled={atCap}
                  className="btn-primary w-full py-3"
                >
                  {t('newTicket')}
                </button>
                {atCap && (
                  <p className="mt-2 text-center text-xs text-slate-500">
                    {t('atCap', { max: SUPPORT_MAX_OPEN })}
                  </p>
                )}
              </div>
            )}

            {tickets.length === 0 ? (
              <p className="panel mt-4 p-6 text-center text-sm text-slate-400">
                {t('empty')}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {tickets.map((ticket) => (
                  <Thread key={ticket.id} ticket={ticket} onReplied={load} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ──────────────────────────── New ticket ─────────────────────────── */

function NewTicket({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('support');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Matches the server's DTO, so the button disables rather than round-trips.
  const valid = subject.trim().length >= 3 && body.trim().length >= 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createSupportTicket(subject.trim(), body.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel mt-6 p-5 sm:p-6">
      <h2 className="font-semibold">{t('newTicket')}</h2>

      <label className="mt-4 block">
        <span className="field-label">{t('subject')}</span>
        <input
          className="input-field mt-1.5"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          placeholder={t('subjectPlaceholder')}
          autoFocus
        />
      </label>

      <label className="mt-4 block">
        <span className="field-label">{t('message')}</span>
        <textarea
          className="input-field mt-1.5 min-h-[8rem] resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          placeholder={t('messagePlaceholder')}
        />
        <span className="mt-1 block text-right text-xs text-slate-500">
          {body.length}/4000
        </span>
      </label>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-outline-brand flex-1 py-2.5 text-sm"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={busy || !valid}
          className="btn-primary flex-1 py-2.5 text-sm"
        >
          {busy ? t('sending') : t('send')}
        </button>
      </div>
    </form>
  );
}

/* ───────────────────────────── Thread ────────────────────────────── */

function Thread({
  ticket,
  onReplied,
}: {
  ticket: SupportTicketDto;
  onReplied: () => void;
}) {
  const t = useTranslations('support');
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await replyToSupportTicket(ticket.id, body.trim());
      setBody('');
      onReplied();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="panel overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">{ticket.subject}</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {t('messageCount', { n: ticket.messages.length })} ·{' '}
            {new Date(ticket.updatedAt).toLocaleDateString()}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <StatusBadge status={ticket.status} />
          <span
            className={`text-slate-500 transition ${open ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▾
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-white/5 p-4">
          <ol className="space-y-3">
            {ticket.messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-xl p-3 text-sm ${
                  m.fromAdmin
                    ? 'border border-indigo-400/20 bg-indigo-500/10'
                    : 'bg-white/[0.04]'
                }`}
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {m.fromAdmin ? t('fromSupport') : t('fromYou')} ·{' '}
                  {new Date(m.createdAt).toLocaleString()}
                </div>
                <p className="whitespace-pre-wrap break-words text-slate-200">
                  {m.body}
                </p>
              </li>
            ))}
          </ol>

          {ticket.status === 'CLOSED' ? (
            <p className="mt-3 text-xs text-slate-500">{t('closedNote')}</p>
          ) : (
            <form onSubmit={reply} className="mt-3">
              <textarea
                className="input-field min-h-[4.5rem] resize-y"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={4000}
                placeholder={t('replyPlaceholder')}
              />
              {error && (
                <p className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || body.trim().length === 0}
                className="btn-primary mt-2 w-full py-2.5 text-sm"
              >
                {busy ? t('sending') : t('reply')}
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: SupportTicketDto['status'] }) {
  const t = useTranslations('support');
  const tone =
    status === 'ANSWERED'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'OPEN'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-white/10 text-slate-400';
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {t(`status.${status}`)}
    </span>
  );
}
