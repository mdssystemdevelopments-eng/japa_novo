export function stripDocument(value: string) {
  return value.replace(/\D/g, '');
}

function allSameDigits(digits: string) {
  return /^(\d)\1+$/.test(digits);
}

export function isValidCpf(raw: string): boolean {
  const cpf = stripDocument(raw);
  if (cpf.length !== 11 || allSameDigits(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

export function isValidCnpj(raw: string): boolean {
  const cnpj = stripDocument(raw);
  if (cnpj.length !== 14 || allSameDigits(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i], 10) * weights1[i];
  }
  let d1 = sum % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== parseInt(cnpj[12], 10)) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i], 10) * weights2[i];
  }
  let d2 = sum % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === parseInt(cnpj[13], 10);
}

export function validateDocument(raw: string): boolean {
  const digits = stripDocument(raw);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}
