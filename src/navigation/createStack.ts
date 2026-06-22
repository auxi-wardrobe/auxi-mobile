import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

// Native build keeps the native-stack. Generic passes through for typed params.
export function createAppStack<T extends ParamListBase>() {
  return createNativeStackNavigator<T>();
}
