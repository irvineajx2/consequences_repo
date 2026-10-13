// The nickname rules, in one place so a server can apply the same ones when profiles go online.
// Pure TypeScript.

export const NICKNAME_MAX = 20;

/** Letters (any script), numbers, spaces and simple punctuation. */
const ALLOWED = /^[\p{L}\p{N} .,'!?&()-]+$/u;

/**
 * A basic word filter: nicknames containing these (ignoring case, spaces, punctuation and common
 * letter-for-number swaps) are refused. Moderation proper arrives with accounts.
 */
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'rape', 'nazi', 'hitler', 'bitch', 'bastard', 'dick', 'cock', 'pussy', 'wank'];

export type NicknameCheck =
  | { readonly ok: true; readonly nickname: string }
  | { readonly ok: false; readonly reason: 'empty' | 'tooLong' | 'characters' | 'word' };

function squash(text: string): string {
  const swaps: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
  return text
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => swaps[c] ?? c)
    .replace(/[^\p{L}]/gu, '');
}

/** Checks a nickname as typed; trims it and collapses runs of spaces. */
export function checkNickname(raw: string): NicknameCheck {
  const nickname = raw.trim().replace(/\s+/g, ' ');
  if (nickname.length === 0) return { ok: false, reason: 'empty' };
  if ([...nickname].length > NICKNAME_MAX) return { ok: false, reason: 'tooLong' };
  if (!ALLOWED.test(nickname)) return { ok: false, reason: 'characters' };
  const plain = squash(nickname);
  if (BLOCKED.some((w) => plain.includes(w))) return { ok: false, reason: 'word' };
  return { ok: true, nickname };
}
