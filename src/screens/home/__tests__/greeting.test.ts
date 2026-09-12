/* eslint-env jest */
/**
 * Greeting derivation for the landing header. The backend `User` carries no
 * display name, so the name comes from the email local part — these lock the
 * two rules that matter: the time buckets, and never fabricating a name.
 */
import {
  displayNameFromEmail,
  greetingSlotFor,
} from '../greeting';

describe('greetingSlotFor', () => {
  it.each([
    [0, 'morning'],
    [6, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [23, 'evening'],
  ])('hour %i → %s', (hour, expected) => {
    expect(greetingSlotFor(hour as number)).toBe(expected);
  });
});

describe('displayNameFromEmail', () => {
  it('title-cases the first alphabetic chunk of the local part', () => {
    expect(displayNameFromEmail('linh.nguyen@gmail.com')).toBe('Linh');
    expect(displayNameFromEmail('LINH_NGUYEN42@auxi.app')).toBe('Linh');
    expect(displayNameFromEmail('duc-tran+tag@auxi.app')).toBe('Duc');
  });

  it('returns null rather than inventing a name it cannot derive', () => {
    expect(displayNameFromEmail(undefined)).toBeNull();
    expect(displayNameFromEmail('')).toBeNull();
    expect(displayNameFromEmail('12345@auxi.app')).toBeNull();
    // A single letter is an initial, not a name.
    expect(displayNameFromEmail('a@auxi.app')).toBeNull();
  });
});
