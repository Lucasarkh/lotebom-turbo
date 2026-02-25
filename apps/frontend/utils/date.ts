// Force Brazil (Sao Paulo) timezone as default for calculations
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Returns a date in Brasilia formatted as YYYY-MM-DD string (ISO format for inputs)
 */
export const getISODateInBrasilia = (dateInput: string | Date | null | undefined = new Date()) => {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('sv-SE', { timeZone: BRAZIL_TIMEZONE });
};

/**
 * Returns current date in Brasilia formatted as YYYY-MM-DD string
 */
export const getTodayInBrasilia = () => {
  return getISODateInBrasilia();
};

/**
 * Returns current date in Brasilia minus N days, formatted as YYYY-MM-DD string
 */
export const getDaysAgoInBrasilia = (days: number) => {
  const date = new Date(new Date().toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString('sv-SE', { timeZone: BRAZIL_TIMEZONE });
};

/**
 * Returns a new Date object forced to Brasilia midnight/current time
 */
export const getBrasiliaDate = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }));
};

/**
 * Formats an ISO string or Date object to a Brasilia-localized date string (DD/MM/YYYY)
 */
export const formatDateToBrasilia = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return '---';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TIMEZONE });
};

/**
 * Formats an ISO string or Date object to a Brasilia-localized date & time string (DD/MM/YYYY, HH:mm)
 */
export const formatDateTimeToBrasilia = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return '---';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleString('pt-BR', { 
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formats an ISO string/Date to just time in Brasilia (HH:mm)
 */
export const formatTimeToBrasilia = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return '---';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleTimeString('pt-BR', { 
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Gets current year in Brasilia
 */
export const getYearInBrasilia = () => {
    return new Date().toLocaleString('pt-BR', { timeZone: BRAZIL_TIMEZONE, year: 'numeric' });
}
