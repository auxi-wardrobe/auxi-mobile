// Mock geolocation (Hanoi) so location.ts resolves without native perms.
const Geolocation = {
  getCurrentPosition: (success: any) =>
    success({ coords: { latitude: 21.0278, longitude: 105.8342, accuracy: 10 } }),
  requestAuthorization: async () => 'granted',
  watchPosition: () => 0,
  clearWatch: () => undefined,
  stopObserving: () => undefined,
};
export default Geolocation;
