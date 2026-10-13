import { checkNickname } from '../../src/game/nickname';
import { defaultIdentity, emptyProfile } from '../../src/game/profile';

describe('nicknames', () => {
  it('defaults to Chronicler', () => {
    expect(defaultIdentity.nickname).toBe('Chronicler');
    expect(emptyProfile.identity.nickname).toBe('Chronicler');
  });

  it('accepts up to 20 letters, numbers, spaces and simple punctuation, trimmed', () => {
    expect(checkNickname('  Good Queen Bess  ')).toEqual({ ok: true, nickname: 'Good Queen Bess' });
    expect(checkNickname("O'Neill-1601, too!")).toEqual({ ok: true, nickname: "O'Neill-1601, too!" });
    expect(checkNickname('Élisabeth')).toEqual({ ok: true, nickname: 'Élisabeth' });
    expect(checkNickname('a'.repeat(20))).toMatchObject({ ok: true });
  });

  it('refuses empty, too long, odd characters and filtered words', () => {
    expect(checkNickname('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkNickname('a'.repeat(21))).toEqual({ ok: false, reason: 'tooLong' });
    expect(checkNickname('<script>')).toEqual({ ok: false, reason: 'characters' });
    expect(checkNickname('emoji 👑')).toEqual({ ok: false, reason: 'characters' });
    expect(checkNickname('Sh1t Happens')).toEqual({ ok: false, reason: 'word' });
  });
});
