export const warrantyDurationMonths = (warrantyType: string): number => {
  switch (warrantyType) {
    case '1 Month':
      return 1;
    case '3 Months':
      return 3;
    case '6 Months':
      return 6;
    case '1 Year':
      return 12;
    case '2 Years':
      return 24;
    case '3 Years':
      return 36;
    case '4 Years':
      return 48;
    case '5 Years':
      return 60;
    case '6 Years':
      return 72;
    case '7 Years':
      return 84;
    case '8 Years':
      return 96;
    case '9 Years':
      return 108;
    case '10 Years':
      return 120;
    case '11 Years':
      return 132;
    case '12 Years':
      return 144;
    case '13 Years':
      return 156;
    case '14 Years':
      return 168;
    case '15 Years':
      return 180;
    default:
      return 0;
  }
};

export const calculateWarrantyExpiry = (purchaseDate?: string | Date, warrantyType = 'None') => {
  if (!purchaseDate) return null;
  const months = warrantyDurationMonths(warrantyType);
  if (!months) return null;

  const expiry = new Date(purchaseDate);
  expiry.setMonth(expiry.getMonth() + months);
  return expiry;
};

export const isUnderWarranty = (purchaseDate?: string | Date, warrantyType = 'None') => {
  const expiry = calculateWarrantyExpiry(purchaseDate, warrantyType);
  if (!expiry) return false;
  return expiry >= new Date();
};
