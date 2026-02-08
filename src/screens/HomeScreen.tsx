import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/layout/Header'; // Adjusted path if needed, check where I put it. It was src/components/layout/Header.tsx
import { Sidebar } from '../components/layout/Sidebar';
import { theme } from '../theme/theme';
import IconSort from '../assets/images/sort_icon.svg';
import IconSend from '../assets/images/send_icon.svg';

const { width } = Dimensions.get('window');

// Figma: Width 414. Frame 2009 width 414.
// Images are 205x273.
// Gap 4px.
// 205*2 + 4 = 414. So it fits exactly full width?
// Wait, the main container Frame 2030 has gap 12.
// Let's approximate a 2-column masonry or grid.

export const HomeScreen = () => {
    // const { user } = useAuth(); // Unused in new design
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleFeedback = () => {
        console.log('Feedback pressed');
    };

    const handleMenu = () => {
        setIsSidebarOpen(true);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <Header
                onFeedback={handleFeedback}
                onBack={handleMenu}
            />

            <View style={styles.mainContent}>
                <Text style={styles.sectionTitle}>An option that works</Text>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Grid of items */}
                    <View style={styles.grid}>
                        {/* Placeholder for "Common items" images since we didn't download them yet 
                             and Figma API for fills is complex. using colored blocks or logo for now.
                         */}
                        <View style={styles.gridItem}>
                            <View style={[styles.imagePlaceholder, { backgroundColor: '#E0E0E0' }]} />
                            <View style={styles.itemLabelContainer}>
                                <Text style={styles.itemLabel}>common items</Text>
                            </View>
                        </View>
                        <View style={styles.gridItem}>
                            <View style={[styles.imagePlaceholder, { backgroundColor: '#D0D0D0' }]} />
                            <View style={styles.itemLabelContainer}>
                                <Text style={styles.itemLabel}>common items</Text>
                            </View>
                        </View>
                        <View style={styles.gridItem}>
                            <View style={[styles.imagePlaceholder, { backgroundColor: '#C0C0C0' }]} />
                            <View style={styles.itemLabelContainer}>
                                <Text style={styles.itemLabel}>common items</Text>
                            </View>
                        </View>
                        <View style={styles.gridItem}>
                            {/* Empty or more items */}
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* Bottom Sheet / Floating Panel */}
            <View style={styles.bottomSheet}>
                <View style={styles.suggestionRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                        <Chip label="more neutral" />
                        <Chip label="more casual" />
                        <Chip label="colorful" />
                        <TouchableOpacity style={styles.sortButton}>
                            <IconSort width={24} height={24} />
                        </TouchableOpacity>
                        <Chip label="find more context" wide />
                    </ScrollView>
                </View>


            </View>
        </SafeAreaView>
    );
};

const Chip = ({ label, wide }: { label: string, wide?: boolean }) => (
    <TouchableOpacity style={[styles.chip, wide && styles.chipWide]}>
        <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.figmaBackground,
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 0, // Grid seems full width?
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Manrope-Medium',
        fontWeight: '500',
        color: theme.colors.figmaButton,
        marginBottom: 12,
        marginLeft: 22, // Align with header
        marginTop: 10,
    },
    scrollContent: {
        paddingBottom: 280, // Space for bottom sheet
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '49.5%', // Approx 2 col
        aspectRatio: 3 / 4, // 205/273
        marginBottom: 4,
        position: 'relative',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
    },
    itemLabelContainer: {
        position: 'absolute',
        bottom: 15,
        left: '15%', // Centered roughly
        backgroundColor: 'rgba(39, 42, 50, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 0, // Figma didn't show radius?
        width: 81,
        height: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemLabel: {
        color: '#FFFFFF',
        fontSize: 9,
        fontFamily: 'Manrope-Medium',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        padding: 20,
        height: 277, // Figma height
        justifyContent: 'flex-start',
    },
    suggestionRow: {
        marginBottom: 32,
    },
    chipsContainer: {
        gap: 8,
        alignItems: 'center',
    },
    chip: {
        backgroundColor: '#E3E3EC',
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 48,
        justifyContent: 'center',
    },
    chipWide: {
        // minWidth: 120,
    },
    chipText: {
        color: theme.colors.figmaButton,
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
    },
    sortButton: {
        width: 70,
        height: 48,
        backgroundColor: '#E3E3EC',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    inputActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 56,
    },
    cancelButton: {
        paddingHorizontal: 24,
        justifyContent: 'center',
        height: '100%',
    },
    cancelText: {
        color: '#CC4C3E',
        fontSize: 16,
        fontFamily: 'Manrope-Medium',
        fontWeight: '500',
    },
    sendButtonContainer: {
        // 
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D0D5DD',
        borderRadius: 100,
        height: 56,
        paddingHorizontal: 24,
        gap: 8,
    },
    sendText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Manrope-SemiBold',
        fontWeight: '600',
    },
    sendIcon: {
        width: 16,
        height: 18,
        resizeMode: 'contain',
    },
});
