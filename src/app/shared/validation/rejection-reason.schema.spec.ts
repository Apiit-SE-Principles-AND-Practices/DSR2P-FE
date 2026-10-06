import { REJECTION_MAX, REJECTION_PRESETS, rejectionReasonSchema } from './rejection-reason.schema';

describe('rejectionReasonSchema', () => {
  it('trims a reason and accepts it', () => {
    expect(rejectionReasonSchema.parse('  Spam  ')).toBe('Spam');
  });

  it('rejects an empty or blank reason', () => {
    expect(rejectionReasonSchema.safeParse('').success).toBeFalse();
    expect(rejectionReasonSchema.safeParse('   ').success).toBeFalse();
  });

  it('rejects a reason that is too long', () => {
    expect(rejectionReasonSchema.safeParse('a'.repeat(REJECTION_MAX + 1)).success).toBeFalse();
  });

  it('has presets that all pass the schema', () => {
    REJECTION_PRESETS.forEach((preset) => {
      expect(rejectionReasonSchema.safeParse(preset).success).toBeTrue();
    });
  });
});
