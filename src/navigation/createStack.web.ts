import { createStackNavigator } from '@react-navigation/stack';
import type { ParamListBase } from '@react-navigation/native';

// Web uses the JS stack (@react-navigation/native-stack has no web support).
// Same { Navigator, Screen } API; headerShown / gestureEnabled are honored.
export function createAppStack<T extends ParamListBase>() {
  return createStackNavigator<T>();
}
