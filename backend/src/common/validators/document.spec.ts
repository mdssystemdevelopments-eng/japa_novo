import { isValidCnpj, isValidCpf, validateDocument } from './document';

describe('document validators', () => {
  it('validates CPF', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('validates CNPJ', () => {
    expect(isValidCnpj('04.252.011/0001-10')).toBe(true);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('validateDocument picks type by length', () => {
    expect(validateDocument('52998224725')).toBe(true);
    expect(validateDocument('04252011000110')).toBe(true);
  });
});
