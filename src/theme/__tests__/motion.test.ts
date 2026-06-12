import { motion, rotationForDx, isCommit, applyEmotion } from '../motion';

describe('motion tokens', () => {
  it('exposes Macgie v1.0 duration tokens', () => {
    expect(motion.duration).toEqual({
      instant: 50,
      fast: 120,
      normal: 250,
      medium: 350,
      slow: 500,
      reveal: 700,
    });
  });
  it('spring-standard is critically damped (no bounce)', () => {
    expect(motion.spring.standard).toEqual({ stiffness: 300, damping: 35 });
  });
});

describe('rotationForDx', () => {
  it('is 0 at center', () => expect(rotationForDx(0, 400)).toBe(0));
  it('caps at +6deg far right', () =>
    expect(rotationForDx(400, 400)).toBeCloseTo(6));
  it('caps at -6deg far left', () =>
    expect(rotationForDx(-400, 400)).toBeCloseTo(-6));
  it('never exceeds the cap', () => expect(rotationForDx(9999, 400)).toBe(6));
});

describe('isCommit', () => {
  const W = 400; // commit at 30% width = 120px, or |vx| > 0.4
  it('commits past 30% width', () => expect(isCommit(130, 0, W)).toBe(true));
  it('does not commit below threshold with low velocity', () =>
    expect(isCommit(80, 0.1, W)).toBe(false));
  it('commits on a fast flick even if short', () =>
    expect(isCommit(40, 0.6, W)).toBe(true));
});

describe('applyEmotion', () => {
  it('Confident shortens duration ~10%', () =>
    expect(
      applyEmotion('confident', { duration: 250, stagger: 80 }).duration,
    ).toBe(225));
  it('Calm lengthens duration ~15% and adds stagger', () => {
    const r = applyEmotion('calm', { duration: 250, stagger: 80 });
    expect(r.duration).toBe(288); // round(250*1.15)
    expect(r.stagger).toBe(110); // 80 + 30
  });
  it('unknown direction is identity', () =>
    expect(applyEmotion('none', { duration: 250, stagger: 80 })).toEqual({
      duration: 250,
      stagger: 80,
    }));
});
