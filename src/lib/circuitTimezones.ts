// src/lib/circuitTimezones.ts
// IANA timezone for each GP, keyed by Race.name (matches f1calendar.ts's GP_META keys).

export const GP_TIMEZONE: Record<string, string> = {
  'Australian Grand Prix':     'Australia/Melbourne',
  'Bahrain Grand Prix':        'Asia/Bahrain',
  'Saudi Arabian Grand Prix':  'Asia/Riyadh',
  'Japanese Grand Prix':       'Asia/Tokyo',
  'Chinese Grand Prix':        'Asia/Shanghai',
  'Miami Grand Prix':          'America/New_York',
  'Emilia Romagna Grand Prix': 'Europe/Rome',
  'Monaco Grand Prix':         'Europe/Monaco',
  'Canadian Grand Prix':       'America/Toronto',
  'Spanish Grand Prix':        'Europe/Madrid',
  'Austrian Grand Prix':       'Europe/Vienna',
  'British Grand Prix':        'Europe/London',
  'Hungarian Grand Prix':      'Europe/Budapest',
  'Belgian Grand Prix':        'Europe/Brussels',
  'Dutch Grand Prix':          'Europe/Amsterdam',
  'Italian Grand Prix':        'Europe/Rome',
  'Azerbaijan Grand Prix':     'Asia/Baku',
  'Singapore Grand Prix':      'Asia/Singapore',
  'United States Grand Prix':  'America/Chicago',
  'Mexico City Grand Prix':    'America/Mexico_City',
  'São Paulo Grand Prix':      'America/Sao_Paulo',
  'Las Vegas Grand Prix':      'America/Los_Angeles',
  'Qatar Grand Prix':          'Asia/Qatar',
  'Abu Dhabi Grand Prix':      'Asia/Dubai',
};
