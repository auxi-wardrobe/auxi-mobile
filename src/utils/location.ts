import { Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

interface LocationResult {
    latitude: number;
    longitude: number;
}

export const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        return auth === 'granted';
    } else {
        // Android permission handling logic would go here
        // For now, assuming granted or handled elsewhere for Android in this MVP
        return true; 
    }
};

export const getCurrentLocation = (): Promise<LocationResult> => {
    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                resolve({ latitude, longitude });
            },
            (error) => {
                reject(error);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    });
};
