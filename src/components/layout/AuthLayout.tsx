import React from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    Dimensions,
} from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '../../theme/theme';

const { width, height } = Dimensions.get('window');

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
}

const BackgroundPattern = () => (
    <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`}>
            <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={theme.colors.surface} stopOpacity="1" />
                    <Stop offset="1" stopColor="#E8E8E8" stopOpacity="1" />
                </LinearGradient>
            </Defs>
            <Path
                d={`M0 0 H${width} V${height} H0 Z`}
                fill="url(#grad)"
            />
            <Circle cx={width * 0.8} cy={height * 0.1} r={width * 0.4} fill={`${theme.colors.primary}10`} />
            <Circle cx={width * 0.1} cy={height * 0.5} r={width * 0.3} fill={`${theme.colors.secondary}10`} />
            <Circle cx={width * 0.9} cy={height * 0.9} r={width * 0.5} fill={`${theme.colors.textSecondary}05`} />
        </Svg>
    </View>
);

export const AuthLayout: React.FC<AuthLayoutProps> = ({
    children,
    title,
    subtitle,
}) => {
    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <BackgroundPattern />
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        <View style={styles.header}>
                            {title && <Text style={styles.title}>{title}</Text>}
                            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                        </View>
                        <View style={styles.card}>
                            {children}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.xl,
    },
    header: {
        marginBottom: theme.spacing.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: theme.typography.sizes.h1,
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.s,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: theme.typography.sizes.body,
        fontWeight: theme.typography.weights.regular as any,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        opacity: 0.8,
        lineHeight: 24,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: theme.borderRadius.l * 1.5,
        padding: theme.spacing.l,
        shadowColor: theme.ds.color.shadow,
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
});
