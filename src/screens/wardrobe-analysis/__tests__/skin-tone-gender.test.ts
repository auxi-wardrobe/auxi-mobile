import { resolveSkinToneGender } from '../skin-tone-gender';

describe('resolveSkinToneGender', () => {
  it('follows the wardrobe direction first', () => {
    expect(
      resolveSkinToneGender({
        gender: 'FEMININE',
        user_metadata: { wardrobe_direction: 'Menswear' },
      }),
    ).toBe('men');
    expect(
      resolveSkinToneGender({
        gender: 'MASCULINE',
        user_metadata: { wardrobe_direction: 'Womenswear' },
      }),
    ).toBe('women');
  });

  it.each([
    ['MASCULINE', 'men'],
    ['male', 'men'],
    ['M', 'men'],
    ['FEMININE', 'women'],
    ['female', 'women'],
    ['W', 'women'],
  ])('falls back to users.gender %s → %s', (gender, expected) => {
    expect(
      resolveSkinToneGender({
        gender,
        user_metadata: { wardrobe_direction: 'Mixed' },
      }),
    ).toBe(expected);
  });

  it('defaults to the women set when nothing is known', () => {
    expect(resolveSkinToneGender(null)).toBe('women');
    expect(resolveSkinToneGender({ gender: null, user_metadata: null })).toBe(
      'women',
    );
  });
});
