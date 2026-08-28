/**
 * Privacy masking for miner identities shown to other users.
 *
 * Referral rosters and the public leaderboard both list *other people's*
 * accounts, so neither may leak a full email address. The rule is the same
 * in both places: keep the first two characters of the local part, drop the
 * rest, keep the domain — `an***@gmail.com`. Accounts with no email fall
 * back to a short handle derived from the id, which is already public
 * (it is the row key, not a secret).
 */
export function maskIdentity(params: {
  id: string;
  email: string | null;
}): string {
  const { id, email } = params;
  if (!email) return `Miner ${id.slice(-4)}`;

  const [local, domain] = email.split('@');
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain || 'matsumoto.io'}`;
}
