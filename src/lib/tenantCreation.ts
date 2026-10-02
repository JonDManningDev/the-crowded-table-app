// Keep these validation hints aligned with the first schema migration.
// PostgreSQL remains authoritative, including uniqueness and reserved handles.
export const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ')
const reserved = new Set('admin api app auth account accounts callback community communities create dashboard discover help home login logout new privacy profile reset-password settings signup support terms www'.split(' '))

export type TenantDraft = { name: string; slug: string; country: string; region: string; city: string; timezone: string; join: boolean }

export function validateTenant(draft: TenantDraft): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 120) return 'Enter a community name of 1–120 characters.'
  if (draft.slug.length < 3 || draft.slug.length > 63 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) return 'Use 3–63 lowercase letters or numbers, with single hyphens between words.'
  if (reserved.has(draft.slug)) return 'That community handle is reserved. Please choose another.'
  if (!countryCodes.includes(draft.country)) return 'Choose a country.'
  if (draft.region.trim().length > 120 || draft.city.trim().length > 120) return 'Keep city and state/province names to 120 characters each.'
  if (!draft.timezone.trim()) return 'Choose the community’s time zone.'
  return null
}

export function creationError(error: { code?: string; message?: string }) {
  if (error.code === '23505') return 'That community handle is already in use. Choose another, or check Your communities if you submitted this before.'
  if (error.message?.includes('invalid_timezone')) return 'Choose a recognized time zone, such as America/Tegucigalpa.'
  if (error.code === '42501' || error.code === 'PGRST301' || error.code === 'PGRST303') return 'Please sign in with a verified account before creating a community.'
  if (error.code === '23514' || error.code === '22023') return 'Please check the community details and choose another handle if it is reserved.'
  return 'We couldn’t confirm that your community was created. Check Your communities before trying again. Your form details are still here.'
}
