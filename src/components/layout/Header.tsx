import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import { TopIconButton } from '../primitives/FigmaPrimitives';

/**
 * Canonical app header (single source of truth for every screen top-bar).
 *
 * Standard — keep these values identical across every header so the app reads
 * as one product. Per-screen props should only change content, never the
 * padding / height / title typography / icon chip:
 *   • padding        12px horizontal + 12px vertical (theme.spacing.uacDimension12)
 *   • height         68px (44px icon chip + 12px top + 12px bottom)
 *   • icon slots     44×44 (TopIconButton — white chip, radius 8, headerIcon shadow)
 *   • icon glyph     24×24
 *   • title          uacBodyMdSemibold (Poppins SemiBold 16/24), colour figmaTextDark, centred
 */

// 44px = the canonical TopIconButton chip; left/right slots match so the
// centred title is optically centred regardless of which side has an action.
const SLOT = 44;
const PAD = theme.spacing.uacDimension12; // 12

type HeaderBackground = 'solid' | 'tint' | 'blur' | 'transparent';

interface HeaderProps {
    title?: string;
    titleTextStyle?: TextStyle;
    /** 'center' (default) balances both 44px slots; 'left' sits the title next to the left icon. */
    titleAlign?: 'center' | 'left';
    /** Render the left button (default true). When false an empty 44px slot keeps the title centred. */
    showBack?: boolean;
    /** Override the default Menu glyph (e.g. a ChevronLeft for back). */
    leftIcon?: React.ReactNode;
    leftIconStyle?: ViewStyle;
    leftTestID?: string;
    leftAccessibilityLabel?: string;
    onBack?: () => void;
    /** Replaces the text title with an arbitrary node (e.g. Home's weather widget). */
    centerComponent?: React.ReactNode;
    /** Right slot content (e.g. an action chip). Defaults to an empty 44px spacer. */
    rightComponent?: React.ReactNode;
    /**
     * Override the right slot's style. The slot is a fixed 44×44 chip by default
     * (sized for a single icon button); pass e.g. `{ width: 'auto' }` when the
     * right content is wider than an icon (e.g. Favourite's view-toggle pill).
     */
    rightSlotStyle?: ViewStyle;
    /** Bar background treatment. 'blur' renders the frosted slab used by Favourite / My Creations. */
    background?: HeaderBackground;
    /** Pad the top by the device safe-area inset (for headers flush to the screen top). */
    safeAreaTop?: boolean;
    style?: ViewStyle;
}

const BACKGROUND_COLOR: Record<HeaderBackground, string> = {
    solid: theme.colors.figmaBackground,
    tint: theme.colors.figmaItemDetailHeaderBg,
    blur: theme.colors.transparent,
    transparent: theme.colors.transparent,
};

const HeaderBase: React.FC<HeaderProps> = ({
    title = 'Auxi',
    titleTextStyle,
    titleAlign = 'center',
    showBack = true,
    leftIcon,
    leftIconStyle,
    leftTestID,
    leftAccessibilityLabel,
    onBack,
    centerComponent,
    rightComponent,
    rightSlotStyle,
    background = 'solid',
    safeAreaTop = false,
    style,
}) => {
    const insets = useSafeAreaInsets();
    const isLeft = titleAlign === 'left';

    const containerStyle: ViewStyle = {
        backgroundColor: BACKGROUND_COLOR[background],
        paddingTop: PAD + (safeAreaTop ? insets.top : 0),
        justifyContent: isLeft ? 'flex-start' : 'space-between',
        // NOTE: never clip overflow here. The blur slab is absoluteFill (exactly
        // the bar bounds, so it can't bleed), and overflow:hidden would cut off
        // the icon chips' drop-shadow — which extends ~23px past the bar.
    };

    return (
        <View style={[styles.container, containerStyle, style]}>
            {background === 'blur' && (
                <>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="light"
                        blurAmount={8}
                        reducedTransparencyFallbackColor={
                            theme.colors.figmaItemDetailHeaderBg
                        }
                        pointerEvents="none"
                    />
                    <View style={styles.blurTint} pointerEvents="none" />
                </>
            )}

            <View style={styles.slot}>
                {showBack && (
                    <TopIconButton
                        onPress={onBack}
                        style={leftIconStyle}
                        testID={leftTestID}
                        accessibilityLabel={leftAccessibilityLabel}
                        icon={leftIcon || <Icons.Menu width={24} height={24} />}
                    />
                )}
            </View>

            <View style={[styles.center, isLeft && styles.centerLeft]}>
                {centerComponent ??
                    (title ? (
                        <Text
                            style={[
                                styles.title,
                                isLeft && styles.titleLeft,
                                titleTextStyle,
                            ]}
                            numberOfLines={1}
                        >
                            {title}
                        </Text>
                    ) : null)}
            </View>

            {/* Left-aligned titles have no trailing slot unless an action is given. */}
            {(!isLeft || rightComponent) && (
                <View style={[styles.slot, rightSlotStyle]}>{rightComponent}</View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: SLOT + PAD * 2, // 68 — keeps title-only bars the same height
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PAD,
        paddingBottom: PAD,
        columnGap: PAD, // gap between left icon and a left-aligned title
    },
    blurTint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.figmaItemDetailHeaderBg,
    },
    slot: {
        width: SLOT,
        height: SLOT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerLeft: {
        alignItems: 'flex-start',
    },
    title: {
        ...theme.typography.aliases.uacBodyMdSemibold,
        color: theme.colors.figmaTextDark,
    },
    titleLeft: {
        textAlign: 'left',
    },
});

/* ------------------------------------------------------------------ *
 * Presets — the named header "types" used across the app. Pick the one
 * that matches the shape you need; each only exposes its relevant props
 * so call sites stay short and can't drift from the canonical layout.
 * Reach for the base <Header> only for a genuine one-off.
 * ------------------------------------------------------------------ */

interface PresetProps {
    title?: string;
    titleTextStyle?: TextStyle;
    /** Bar surface. Defaults per preset (blur for menu-only, else solid). */
    background?: HeaderBackground;
    /** Pad the top by the safe-area inset — for headers flush to the screen top. */
    safeAreaTop?: boolean;
    /** Press handler for the left (menu or back) button. */
    onBack?: () => void;
    leftTestID?: string;
    leftAccessibilityLabel?: string;
    style?: ViewStyle;
}

/** Menu (hamburger) on the left, centred title. e.g. Settings, Feedback, Database. */
const MenuTitle: React.FC<PresetProps> = props => <HeaderBase {...props} />;

/** Back chevron on the left, centred title, optional action chip on the right.
 *  e.g. My Body, See-this-on-me, Legal. */
const BackTitle: React.FC<
    PresetProps & { leftIconStyle?: ViewStyle; right?: React.ReactNode }
> = ({ leftIconStyle, right, ...props }) => (
    <HeaderBase
        {...props}
        leftIconStyle={leftIconStyle}
        leftIcon={<Icons.ChevronLeft width={24} height={24} />}
        rightComponent={right}
    />
);

/** Menu on the left, centred title, action chip on the right. e.g. Wardrobe. */
const MenuTitleAction: React.FC<PresetProps & { right?: React.ReactNode }> = ({
    right,
    ...props
}) => <HeaderBase {...props} rightComponent={right} />;

/** Menu only on a blurred bar, no title. e.g. Favourite. */
const MenuOnly: React.FC<
    Omit<PresetProps, 'title' | 'titleTextStyle'>
> = ({ background = 'blur', safeAreaTop = true, ...props }) => (
    <HeaderBase
        {...props}
        title=""
        background={background}
        safeAreaTop={safeAreaTop}
    />
);

/**
 * Canonical app header. Use a preset (`Header.MenuTitle`, `Header.BackTitle`,
 * `Header.MenuTitleAction`, `Header.MenuOnly`) for the common shapes; call
 * `<Header>` directly only for a one-off layout.
 */
export const Header = Object.assign(HeaderBase, {
    MenuTitle,
    BackTitle,
    MenuTitleAction,
    MenuOnly,
});
