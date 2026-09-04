/**
 * Dynamic Expo config.
 *
 * `app.json` stays the source of truth; this file only decides whether
 * `runtimeVersion` survives into the served manifest.
 *
 * Expo Go loads a project through expo-updates, and it accepts an update only
 * when the manifest's runtimeVersion is `exposdk:<sdk>`. Our appVersion policy
 * resolves to "1.0.0" instead, so Expo Go rejects the dev bundle outright and
 * reports "failed to download remote update" — with nothing in the Metro log,
 * because the request succeeded and the client threw the result away.
 *
 * EAS Update, on the other hand, needs the appVersion policy: it is what pairs
 * an update with the builds that can safely run it. Dropping it everywhere
 * would silently break OTA delivery.
 *
 * So: keep it for builds, drop it for the dev server. Dev-client users who do
 * want the real runtime version can set EXPO_USE_RUNTIME_VERSION=1, since a
 * development build is pinned to the same "1.0.0" its manifest was built with.
 */
module.exports = ({ config }) => {
  const isEasBuild = !!process.env.EAS_BUILD;
  const forceRuntimeVersion = process.env.EXPO_USE_RUNTIME_VERSION === '1';

  if (isEasBuild || forceRuntimeVersion) return config;

  const { runtimeVersion, ...expoGoConfig } = config;
  return expoGoConfig;
};
