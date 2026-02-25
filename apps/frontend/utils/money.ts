/**
 * Formats a number to BRL currency string (R$ 0.000,00)
 */
export const formatCurrencyToBrasilia = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return '---';
  const val = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(val)) return '---';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

/**
 * Formats a number to a decimal string (0.000,00)
 */
export const formatNumberToBrasilia = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return '---';
  const val = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(val)) return '---';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};
