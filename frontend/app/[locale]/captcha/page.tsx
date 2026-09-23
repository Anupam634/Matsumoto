'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Turnstile, turnstileConfigured } from '../../../components/Turnstile';

/**
 * The captcha, on its own page, for the mobile app's WebView.
 *
 * Turnstile only runs in a browser, and it reports the hostname it was
 * solved on — which the API checks. Serving the widget from our own site and
 * loading *that* in the app keeps both true, where an HTML string injected
 * into the WebView would have no hostname to report.
 *
 * The solved token is handed back through `ReactNativeWebView.postMessage`.
 */
export default function CaptchaPage() {
  return (
    <Suspense>
      <CaptchaBridge />
    </Suspense>
  );
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(data: string): void };
  }
}

function post(payload: Record<string, unknown>) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
}

function CaptchaBridge() {
  const search = useSearchParams();
  const action = search.get('action') ?? 'signup';
  const [failed, setFailed] = useState<string | null>(null);

  // Nothing to solve — tell the app so it stops waiting on a widget that
  // will never appear.
  useEffect(() => {
    if (!turnstileConfigured) post({ type: 'turnstile', token: null, disabled: true });
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-200">
      <p className="text-sm font-semibold">Just checking you&apos;re human</p>

      <Turnstile
        action={action}
        onToken={(token) => token && post({ type: 'turnstile', token })}
        onError={(message) => {
          setFailed(message);
          post({ type: 'turnstile', token: null, error: message });
        }}
      />

      {failed && <p className="text-xs text-red-300">{failed}</p>}

      <button
        type="button"
        onClick={() => post({ type: 'turnstile', token: null, cancelled: true })}
        className="mt-2 text-xs font-bold text-slate-400 underline underline-offset-2"
      >
        Cancel
      </button>
    </main>
  );
}
