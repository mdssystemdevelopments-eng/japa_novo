export function normalizePlate(plate: string) {
  return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}
