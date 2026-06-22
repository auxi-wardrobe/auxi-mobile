export const getLocales = () => [
  { languageCode: 'en', countryCode: 'US', languageTag: 'en-US', isRTL: false },
];
export const findBestLanguageTag = () => ({ languageTag: 'en-US', isRTL: false });
export const getNumberFormatSettings = () => ({
  decimalSeparator: '.', groupingSeparator: ',',
});
export const getCalendar = () => 'gregorian';
export const getCountry = () => 'US';
export const getCurrencies = () => ['USD'];
export const getTimeZone = () => 'UTC';
export const uses24HourClock = () => false;
export const usesMetricSystem = () => true;
export const usesAutoDateAndTime = () => true;
export const usesAutoTimeZone = () => true;
export const getTemperatureUnit = () => 'celsius';
export const addEventListener = () => undefined;
export const removeEventListener = () => undefined;
export default {};
