import { createNavigationContainerRef } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';

// Shared navigation ref so surfaces rendered OUTSIDE the NavigationContainer
// (e.g. the root-level push-drawer menu — see RootDrawer / SidebarMenu) can
// navigate and read the focused route. Attached to <NavigationContainer> in
// AppNavigator; also reused by the deep-link handler.
export const navigationRef = createNavigationContainerRef<AppStackParamList>();
