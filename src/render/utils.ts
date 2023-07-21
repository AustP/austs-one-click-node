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

// modified from https://stackoverflow.com/a/45309230/1408717
export function parseNumber(value: string, defaultValue: number = 0) {
  if (!value) {
    return defaultValue;
  }

  const decimal = Intl.NumberFormat()
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')!.value;

  return parseFloat(
    value
      .replace(new RegExp(`[^-+0-9${decimal}]`, 'g'), '')
      .replace(decimal, '.'),
  );
}
