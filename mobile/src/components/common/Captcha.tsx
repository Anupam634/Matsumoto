import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { WEB_URL } from '../../api/client';

/**
 * Cloudflare Turnstile for the app.
 *
 * The widget is browser-only, and Cloudflare reports the hostname it was
 * solved on — which the API checks. So the app opens our own `/captcha` page
 * in a WebView rather than injecting HTML, which would have no hostname to
 * report.
 *
 * `solve()` resolves with a token, or with null when the sheet is dismissed
 * or the site key is not configured; callers send whatever they get and let
 * the server decide, so the app keeps working while captcha is switched off.
 *
 * The screen must render `sheet` on every step that calls `solve()`.
 */
export type CaptchaAction = 'signup' | 'login' | 'password-reset' | 'withdrawal';

interface Pending {
  action: CaptchaAction;
  resolve: (token: string | null) => void;
}

/** Counts itself in `mounted` for as long as the screen renders it. */
function Mounted({ mounted, children }: { mounted: React.MutableRefObject<number>; children: React.ReactNode }) {
  useEffect(() => {
    mounted.current += 1;
    return () => {
      mounted.current -= 1;
    };
  }, [mounted]);
  return <>{children}</>;
}

export function useCaptcha() {
  const [pending, setPending] = useState<Pending | null>(null);
  // The promise is settled exactly once, whichever way the sheet closes.
  const settled = useRef(false);
  // How many copies of `sheet` are on screen right now.
  const mounted = useRef(0);

  const solve = useCallback((action: CaptchaAction) => {
    // With no sheet on screen nothing can ever answer, and the caller would
    // wait forever — the sign-up form did, and its button spun until the
    // app was closed. Resolve null instead, so the server's "complete the
    // anti-bot check" error shows and the screen stays usable.
    if (mounted.current === 0) {
      if (__DEV__) {
        console.warn(`captcha.solve('${action}') was called on a step that does not render captcha.sheet`);
      }
      return Promise.resolve<string | null>(null);
    }
    return new Promise<string | null>((resolve) => {
      settled.current = false;
      setPending({ action, resolve });
    });
  }, []);

  const finish = useCallback(
    (token: string | null) => {
      if (settled.current) return;
      settled.current = true;
      pending?.resolve(token);
      setPending(null);
    },
    [pending],
  );

  const sheet = (
    <Mounted mounted={mounted}>
      <Modal
        visible={!!pending}
        animationType="slide"
        transparent={false}
        onRequestClose={() => finish(null)}
      >
        <View style={styles.fill}>
          {pending && (
            <WebView
              source={{ uri: `${WEB_URL}/en/captcha?action=${pending.action}` }}
              style={styles.fill}
              javaScriptEnabled
              // Turnstile renders inside an iframe of its own.
              originWhitelist={['https://*']}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data) as {
                    type?: string;
                    token?: string | null;
                  };
                  if (data.type === 'turnstile') finish(data.token ?? null);
                } catch {
                  finish(null);
                }
              }}
              // A page that will not load must not leave the caller hanging.
              onError={() => finish(null)}
              onHttpError={() => finish(null)}
            />
          )}
        </View>
      </Modal>
    </Mounted>
  );

  return { solve, sheet };
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#020617' },
});
