'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  getKyc,
  getToken,
  submitKyc,
  type KycImage,
  type KycStatusDto,
} from '../../../lib/api';
import { CountrySelect } from '../../../components/CountrySelect';
import { AppHeader } from '../../../components/AppHeader';
import { countryFlag, countryName } from '../../../lib/countries';

const DOC_TYPES = ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE'] as const;

/** Longest edge, in px, an uploaded photo is scaled down to before encoding. */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

/**
 * Downscale and re-encode a photo in the browser.
 *
 * A modern phone camera file is several MB, which is both slow to upload and
 * far more resolution than a human reviewer needs. Re-encoding here keeps the
 * request comfortably inside the API's size cap.
 */
async function toScaledImage(file: File): Promise<KycImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return { mimeType: 'image/jpeg', data: dataUrl.split(',')[1] };
}

export default function KycClient() {
  const t = useTranslations('kyc');
  const router = useRouter();
  const params = useParams<{ locale: string }>();

  const [state, setState] = useState<KycStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await getKyc());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace(`/${params.locale}/login`);
        return;
      }
      setError(err instanceof ApiError ? err.message : t('offline'));
    }
  }, [router, params.locale, t]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${params.locale}/login`);
      return;
    }
    load();
  }, [load, router, params.locale]);

  return (
    <div className="app-shell min-h-dvh">
      <AppHeader locale={params.locale} backLabel={t('backToDashboard')} maxWidth="max-w-3xl" />

      <main
        className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6"
        style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-slate-400">{t('why')}</p>

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!state ? (
          <div className="panel mt-6 space-y-3 p-6">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : (
          <>
            <StatusCard state={state} locale={params.locale} />
            {state.canSubmit && <SubmitForm onDone={load} locale={params.locale} />}
          </>
        )}
      </main>
    </div>
  );
}

function StatusCard({ state, locale }: { state: KycStatusDto; locale: string }) {
  const t = useTranslations('kyc');
  const tone =
    state.status === 'APPROVED'
      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
      : state.status === 'PENDING'
        ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
        : state.status === 'REJECTED'
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-white/10 bg-white/[0.04] text-slate-300';

  return (
    <section className={`mt-6 rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-center gap-2 font-semibold">
        <span aria-hidden>
          {state.status === 'APPROVED'
            ? '✓'
            : state.status === 'PENDING'
              ? '⏳'
              : state.status === 'REJECTED'
                ? '✕'
                : 'ⓘ'}
        </span>
        {t(`status.${state.status}`)}
      </div>

      {state.status === 'PENDING' && (
        <p className="mt-1 text-sm opacity-90">{t('pendingBody')}</p>
      )}
      {state.status === 'APPROVED' && (
        <p className="mt-1 text-sm opacity-90">{t('approvedBody')}</p>
      )}
      {state.status === 'REJECTED' && state.reviewerNote && (
        <p className="mt-1 text-sm opacity-90">
          {t('reason')}: {state.reviewerNote}
        </p>
      )}

      {state.fullName && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label={t('fullName')} value={state.fullName} />
          {state.documentType && (
            <Field label={t('documentType')} value={t(`docType.${state.documentType}`)} />
          )}
          {state.countryCode && (
            <Field
              label={t('country')}
              value={`${countryFlag(state.countryCode)} ${countryName(state.countryCode, locale)}`}
            />
          )}
        </dl>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function SubmitForm({ onDone, locale }: { onDone: () => void; locale: string }) {
  const t = useTranslations('kyc');
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] =
    useState<(typeof DOC_TYPES)[number]>('PASSPORT');
  const [documentNumber, setDocumentNumber] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [front, setFront] = useState<KycImage | null>(null);
  const [back, setBack] = useState<KycImage | null>(null);
  const [selfie, setSelfie] = useState<KycImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!front || !selfie) {
      setError(t('needImages'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitKyc({
        fullName,
        documentType,
        documentNumber,
        countryCode,
        front,
        back: back ?? undefined,
        selfie,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel mt-4 p-6">
      <h2 className="font-semibold">{t('formTitle')}</h2>
      <p className="mt-1 text-sm text-slate-400">{t('formHint')}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="field-label">
            {t('fullName')}
          </span>
          <input
            className="input-field mt-1.5"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className="field-label">
            {t('documentType')}
          </span>
          <select
            className="input-field mt-1.5"
            value={documentType}
            onChange={(e) =>
              setDocumentType(e.target.value as (typeof DOC_TYPES)[number])
            }
          >
            {DOC_TYPES.map((d) => (
              <option key={d} value={d}>
                {t(`docType.${d}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="field-label">
            {t('documentNumber')}
          </span>
          <input
            className="input-field mt-1.5"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            required
            minLength={3}
            maxLength={60}
            autoCapitalize="characters"
          />
        </label>

        <CountrySelect
          id="kyc-country"
          locale={locale}
          value={countryCode}
          onChange={setCountryCode}
          label={t('country')}
          placeholder={t('countryPlaceholder')}
          required
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ImagePicker label={t('front')} value={front} onChange={setFront} required />
        <ImagePicker label={t('back')} value={back} onChange={setBack} />
        <ImagePicker label={t('selfie')} value={selfie} onChange={setSelfie} required />
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs text-slate-500">{t('privacy')}</p>

      <button type="submit" disabled={busy} className="btn-primary mt-4 w-full py-3">
        {busy ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}

function ImagePicker({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: KycImage | null;
  onChange: (v: KycImage | null) => void;
  required?: boolean;
}) {
  const t = useTranslations('kyc');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      onChange(await toScaledImage(file));
    } catch {
      setError(true);
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="block cursor-pointer">
      <span className="field-label">
        {label}
        {!required && <span className="ml-1 normal-case text-slate-500">({t('optional')})</span>}
      </span>
      <div
        className={`mt-1.5 grid h-28 place-items-center overflow-hidden rounded-xl border-2 border-dashed text-center text-xs ${
          value
            ? 'border-indigo-400/40 bg-indigo-500/10'
            : 'border-white/15 bg-white/[0.03] text-slate-500'
        }`}
      >
        {busy ? (
          <span className="text-slate-500">…</span>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:${value.mimeType};base64,${value.data}`}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{error ? t('imageError') : t('tapToUpload')}</span>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </label>
  );
}
