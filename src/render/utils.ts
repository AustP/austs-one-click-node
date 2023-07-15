export function abbreviateNumber(number: number): string {
  return Intl.NumberFormat(undefined, {
    maximumSignificantDigits: 3,
    minimumSignificantDigits: number < 10 ? 1 : 2,
    notation: 'compact',
  }).format(number);
}

export function formatNumber(number: number): string {
  try {
    return Intl.NumberFormat(undefined, {
      maximumSignificantDigits: Math.max(3, Math.ceil(Math.log10(number))),
      minimumSignificantDigits: number < 10 ? 1 : 2,
    }).format(number);
  } catch (e) {
    if (Number.isNaN(number)) {
      return '';
    }

    return number.toString();
  }
}
