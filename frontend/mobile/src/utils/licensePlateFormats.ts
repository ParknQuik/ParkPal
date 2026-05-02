export interface PlateFormat {
  pattern: RegExp;
  placeholder: string;
  mask: (value: string) => string;
}

export const PLATE_FORMATS: Record<string, PlateFormat> = {
  PH: {
    pattern: /^[A-Z]{3}-\d{4}$/,
    placeholder: 'ABC-1234',
    mask: (v) => {
      const clean = v.replace(/[^A-Z0-9]/g, '').toUpperCase();
      const letters = clean.slice(0, 3);
      const numbers = clean.slice(3, 7);
      return `${letters}${numbers.length ? '-' + numbers : ''}`;
    },
  },
  US: {
    pattern: /^[A-Z]{3}-\d{3,4}$/,
    placeholder: 'ABC-1234',
    mask: (v) => {
      const clean = v.replace(/[^A-Z0-9]/g, '').toUpperCase();
      const letters = clean.slice(0, 3);
      const numbers = clean.slice(3, 7);
      return `${letters}${numbers.length ? '-' + numbers : ''}`;
    },
  },
  CA: {
    pattern: /^[A-Z]{3}-\d{4}$/,
    placeholder: 'ABC-1234',
    mask: (v) => {
      const clean = v.replace(/[^A-Z0-9]/g, '').toUpperCase();
      const letters = clean.slice(0, 3);
      const numbers = clean.slice(3, 7);
      return `${letters}${numbers.length ? '-' + numbers : ''}`;
    },
  },
  UK: {
    pattern: /^[A-Z]{2}\d{2}\s?[A-Z]{3}$/,
    placeholder: 'AB12 CDE',
    mask: (v) => {
      const clean = v.replace(/[^A-Z0-9]/g, '').toUpperCase();
      if (clean.length <= 4) return clean;
      return `${clean.slice(0, 4)} ${clean.slice(4, 7)}`;
    },
  },
  SG: {
    pattern: /^[A-Z]{3}\s?\d{1,4}[A-Z]?$/,
    placeholder: 'SBA 1234A',
    mask: (v) => {
      const clean = v.replace(/[^A-Z0-9]/g, '').toUpperCase();
      return clean.replace(/^(.{3})(\d{1,4})([A-Z]?)$/, '$1 $2$3');
    },
  },
};

export const formatLicensePlate = (value: string, countryCode: string = 'PH'): string => {
  const format = PLATE_FORMATS[countryCode];
  if (!format) return value.toUpperCase();
  return format.mask(value);
};

export const validateLicensePlate = (value: string, countryCode: string = 'PH'): boolean => {
  const format = PLATE_FORMATS[countryCode];
  if (!format) return value.length > 0;
  return format.pattern.test(value);
};
