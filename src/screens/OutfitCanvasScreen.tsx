import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  NavigationAction,
  RouteProp,
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import {
  CanvasItemData,
  OutfitCanvasSurface,
} from '../components/features/OutfitCanvasSurface';
import { seedCanvasLayout } from '../components/features/collage-seed-layout';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { useSidebar } from '../context/SidebarContext';
import { useCreationsSeen } from '../context/CreationsSeenContext';
import { track } from '../services/analytics';
import {
  CREATIONS_QUERY_KEY,
  CreationItem,
  CreationSaveError,
  creationsService,
} from '../services/creationsService';
import {
  requestCanvasExit,
  setCanvasExitGuard,
} from '../navigation/canvasExitGuard';
import { DiscardCreationDialog } from './canvas/DiscardCreationDialog';
import { ItemPickerPanel } from './canvas/ItemPickerPanel';
import { TagChip } from './canvas/TagChip';
import { ToolbarBtn } from './canvas/ToolbarBtn';
import { extractUri } from './canvas/canvas-helpers';
import { useCanvasHistory } from './canvas/useCanvasHistory';
import { useCanvasAddItems } from './canvas/useCanvasAddItems';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './canvas/canvas-dimensions';
import { ItemReadySnackbar } from '../components/feedback/ItemReadySnackbar';
import { InfoSnackbar } from '../components/feedback/InfoSnackbar';
import { DotsLoader } from '../components/atoms/DotsLoader';
import IconChevronLeft from '../assets/images/icon_chevron_left.svg';
import IconMenu from '../assets/images/icon_menu.svg';
import IconMyCreation from '../assets/images/icon_my_creation.svg';
// Footer "new blank canvas" affordance — a canvas/frame glyph, deliberately
// distinct from the toolbar's "+" add-item icon so the two aren't ambiguous.
import IconNewCanvas from '../assets/images/icon_outfit_canvas.svg';
import IconCanvasUndo from '../assets/images/canvas-icons/undo.svg';
import IconCanvasRedo from '../assets/images/canvas-icons/redo.svg';
import IconCanvasAdd from '../assets/images/canvas-icons/add.svg';
import IconCanvasLayerUp from '../assets/images/canvas-icons/layer_up.svg';
import IconCanvasLayerDown from '../assets/images/canvas-icons/layer_down.svg';
import IconCanvasDuplicate from '../assets/images/canvas-icons/duplicate.svg';
import IconCanvasSwap from '../assets/images/canvas-icons/swap.svg';
import IconCanvasDelete from '../assets/images/canvas-icons/trash.svg';

type Props = NativeStackScreenProps<AppStackParamList, 'OutfitCanvas'>;

// How long the "Saved to My Creations" success snackbar stays up (mirrors
// Wardrobe's READY_SNACKBAR_MS).
const SAVED_SNACKBAR_MS = 4000;

const INITIAL_MOCK_ITEMS: CanvasItemData[] = [];

// --- Main screen ---
export const OutfitCanvasScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<AppStackParamList, 'OutfitCanvas'>>();
  const { t } = useTranslation();
  const { open: openSidebar } = useSidebar();
  const { hasUnseen: hasUnseenCreations, markSaved: markCreationSaved } =
    useCreationsSeen();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  // Entered via Home's Remix button → show a back chevron (goes back to Home).
  // Entered from the sidebar drawer → show the hamburger that re-opens it.
  const fromRemix = route.params?.entry === 'remix';
  // Seed from the real outfit passed by Home's Remix button, reusing the shared
  // collage layout so pieces land in the SAME overlapping positions/sizes the
  // user just saw in Home's collage view (scaled to this canvas width). Fall
  // back to mock items only when opened without params (deep-link / dev).
  const initialItems = useRef<CanvasItemData[]>(
    route.params?.items?.length
      ? seedCanvasLayout(
          route.params.items.map(it => ({
            id: it.id,
            imageUri: it.imageUrl,
            category: it.category,
          })),
          CANVAS_WIDTH,
        )
      : INITIAL_MOCK_ITEMS,
  ).current;
  const [items, setItems] = useState<CanvasItemData[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(['Low Energy', 'Calm']);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  // Unsaved-changes guard: any edit (item move/add/delete/layer, tag change)
  // flips this true; Save clears it. Drives the "Discard this creation?" sheet
  // shown when the user tries to leave with pending edits.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // In-flight Save guard: true while persistCreation awaits the network so the
  // Save button can show its spinner and block a double-tap. Cleared in a
  // `finally`, so it always resets even if the save throws.
  const [isSaving, setIsSaving] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  // The navigation action we intercepted (back / goBack), replayed verbatim
  // once the user resolves the sheet. `proceedRef` lets that replay through the
  // beforeRemove guard without re-prompting (a ref so the live listener reads it).
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(
    null,
  );
  const proceedRef = useRef(false);
  // A push-style exit intercepted by the canvas exit guard (My Creations icon,
  // sidebar destinations that push rather than pop). Unlike `pendingAction`
  // (a NavigationAction replayed via dispatch), this is a thunk that performs
  // the navigation, replayed once the user resolves the discard sheet.
  const pendingProceedRef = useRef<(() => void) | null>(null);

  // Self-controlled success snackbar (mint M3 ItemReadySnackbar, same component
  // as Wardrobe's "item ready"): the library Toast render path is unused here,
  // so we mount it as a bottom overlay and auto-dismiss.
  const [savedSnackbarVisible, setSavedSnackbarVisible] = useState(false);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Self-controlled save-FAILURE snackbar (black InfoSnackbar). Mounted as a
  // bottom overlay like the success one — deliberately NOT react-native-toast-
  // message, which the toast migration (#177/#181) is removing.
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const saveErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSavedSnackbar = useCallback(() => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
    setSavedSnackbarVisible(true);
    snackbarTimerRef.current = setTimeout(() => {
      setSavedSnackbarVisible(false);
      snackbarTimerRef.current = null;
    }, SAVED_SNACKBAR_MS);
  }, []);

  const dismissSaveError = useCallback(() => {
    if (saveErrorTimerRef.current) {
      clearTimeout(saveErrorTimerRef.current);
      saveErrorTimerRef.current = null;
    }
    setSaveErrorVisible(false);
  }, []);

  const showSaveError = useCallback(() => {
    if (saveErrorTimerRef.current) {
      clearTimeout(saveErrorTimerRef.current);
    }
    setSaveErrorVisible(true);
    saveErrorTimerRef.current = setTimeout(() => {
      setSaveErrorVisible(false);
      saveErrorTimerRef.current = null;
    }, SAVED_SNACKBAR_MS);
  }, []);

  useEffect(
    () => () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
      if (saveErrorTimerRef.current) {
        clearTimeout(saveErrorTimerRef.current);
      }
    },
    [],
  );

  // Marks the canvas dirty on every history push. Stable so the history
  // handlers keep identical identity to the previous inline implementation.
  const markDirty = useCallback(() => setHasUnsavedChanges(true), []);

  // Undo/redo + item-transform history (position/scale/rotation/layer/dup/
  // delete). Operates on the lifted items/selectedId state — behaviour
  // preserved verbatim (see useCanvasHistory).
  const {
    pushHistory,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleSelect,
    handlePositionChange,
    handleScaleChange,
    handleRotationChange,
    handleLayerUp,
    handleLayerDown,
    handleDuplicate,
    handleDelete,
    resetHistory,
  } = useCanvasHistory({
    initialItems,
    items,
    selectedId,
    setItems,
    setSelectedId,
    onDirty: markDirty,
  });

  const handleAddItem = useCallback(() => {
    setPickerVisible(true);
  }, []);

  // Add-items flow: image prefetch/warming, collage placement of new pieces, and
  // the "Adding…" feedback state machine. Behaviour preserved (see
  // useCanvasAddItems).
  const { addStatusVisible, handlePickerConfirm, handleItemImageLoad } =
    useCanvasAddItems({ setItems, pushHistory, setPickerVisible });

  // Tag actions
  const handleRemoveTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(existing => existing !== tag));
    setHasUnsavedChanges(true);
  }, []);

  const handleConfirmTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setHasUnsavedChanges(true);
    }
    setTagInput('');
    setAddingTag(false);
  }, [tagInput, tags]);

  // Persist the current canvas arrangement to the local My Creations store and
  // confirm with a toast that says WHERE it went. Returns whether anything was
  // saved (false when there's nothing URI-backed to persist). Does NOT navigate
  // — the user stays on the canvas; the toast points them at My Creations.
  const persistCreation = useCallback(async (): Promise<boolean> => {
    // Only items backed by a real image URI persist — mock require()'d assets
    // (the deep-link/dev fallback) aren't serializable and are skipped.
    const savedItems = items.reduce<CreationItem[]>((acc, it) => {
      const uri = extractUri(it.imageSource);
      if (uri) {
        acc.push({
          id: it.id,
          wardrobeItemId: it.wardrobeItemId,
          imageUri: uri,
          x: it.x,
          y: it.y,
          width: it.width,
          height: it.height,
          zIndex: it.zIndex,
          scale: it.scale,
          rotation: it.rotation,
        });
      }
      return acc;
    }, []);

    if (savedItems.length === 0) {
      return false;
    }

    setIsSaving(true);
    try {
      await creationsService.saveCreation({
        items: savedItems,
        tags,
        canvasWidth: CANVAS_WIDTH,
      });
      queryClient.invalidateQueries({ queryKey: CREATIONS_QUERY_KEY });
      track('creation_saved', { item_count: savedItems.length });
      setHasUnsavedChanges(false);
      // Light the My Creations header dot (same "unseen saved" feedback as the
      // Home favourites "Wear this" mint dot); cleared when the list is opened.
      markCreationSaved();
      showSavedSnackbar();
      return true;
    } catch (error) {
      // A genuine save failure (a true offline error never reaches here — the
      // service falls back to a local save). `auth` = session expired: the
      // apiClient interceptor already cleared tokens, redirected to login and
      // toasted, so we stay silent and let that play out. Anything else didn't
      // save — tell the user so they can retry instead of seeing fake success.
      const isAuth =
        error instanceof CreationSaveError && error.kind === 'auth';
      if (!isAuth) {
        showSaveError();
      }
      track('creation_save_failed', {
        kind: error instanceof CreationSaveError ? error.kind : 'unknown',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    items,
    tags,
    queryClient,
    showSavedSnackbar,
    markCreationSaved,
    showSaveError,
  ]);

  const handleSave = useCallback(() => {
    persistCreation();
  }, [persistCreation]);

  const handleOpenCreations = useCallback(() => {
    // "My Creations" lists everything the user has saved from the canvas
    // (new canvases, remixed outfits, …). Opening it PUSHES the screen, so it
    // never trips beforeRemove — route through the exit guard so unsaved edits
    // surface the discard sheet first (passes straight through when clean).
    requestCanvasExit(() => {
      track('canvas_my_creations_opened');
      // Back chevron (→ Outfit Canvas) instead of the hamburger — the user is in
      // a sub-flow, not at a top-level destination.
      navigation.navigate('MyCreations', { showBackButton: true });
    });
  }, [navigation]);

  // Intercept leaving the canvas (back chevron / hardware back) while there are
  // unsaved edits → show the "Discard this creation?" sheet instead. The
  // intercepted action is replayed once the user picks Save or Discard.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (proceedRef.current || !hasUnsavedChanges) {
        return;
      }
      e.preventDefault();
      pendingProceedRef.current = null;
      setPendingAction(e.data.action);
      setDiscardVisible(true);
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  // Register the module-level exit guard so PUSH-style exits that never hit
  // beforeRemove (the My Creations icon, sidebar destinations) also surface the
  // discard sheet. Focus-gated: the guard is only armed while the canvas is the
  // focused screen, so a sidebar tap from a screen pushed ON TOP of a still-
  // mounted dirty canvas (e.g. My Creations) doesn't surface the canvas dialog.
  // The focus callback also re-arms proceedRef (a push exit leaves the canvas
  // mounted with it stuck true) so a later back/exit prompts again if dirty.
  useFocusEffect(
    useCallback(() => {
      proceedRef.current = false;
      if (hasUnsavedChanges) {
        setCanvasExitGuard(proceed => {
          pendingProceedRef.current = proceed;
          setPendingAction(null);
          setDiscardVisible(true);
        });
      } else {
        setCanvasExitGuard(null);
      }
      return () => setCanvasExitGuard(null);
    }, [hasUnsavedChanges]),
  );

  // The unsaved-changes sheet is reused for two intents: leaving the screen
  // (replay the intercepted nav action) and starting a NEW blank canvas (reset
  // in place). A ref tracks which, so the shared Save/Discard handlers resolve
  // correctly.
  const sheetIntentRef = useRef<'leave' | 'new'>('leave');

  const leaveWithPendingAction = useCallback(() => {
    proceedRef.current = true;
    setDiscardVisible(false);
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    if (proceed) {
      // Push-style exit (My Creations icon / sidebar) — run the navigation thunk.
      proceed();
    } else if (pendingAction) {
      navigation.dispatch(pendingAction);
    } else {
      navigation.goBack();
    }
  }, [navigation, pendingAction]);

  // Reset to a fresh, empty canvas (clears items, selection and history) and
  // mark it clean so the navigation guard and the "+" button settle.
  const resetCanvasToBlank = useCallback(() => {
    const blank: CanvasItemData[] = [];
    resetHistory(blank);
    setItems(blank);
    setSelectedId(null);
    setHasUnsavedChanges(false);
    track('canvas_reset');
  }, [resetHistory]);

  // Resolve the sheet per the active intent: start a blank canvas, or continue
  // leaving the screen.
  const resolveSheet = useCallback(() => {
    setDiscardVisible(false);
    if (sheetIntentRef.current === 'new') {
      sheetIntentRef.current = 'leave';
      resetCanvasToBlank();
    } else {
      leaveWithPendingAction();
    }
  }, [resetCanvasToBlank, leaveWithPendingAction]);

  // Discard sheet — "Save" persists then resolves (leave or new canvas). Only
  // resolve when the save actually succeeded: if it failed (server error) the
  // error toast has fired and we close the sheet but STAY on the canvas so the
  // user keeps their work and can retry, rather than leaving/clearing it.
  const handleDiscardSave = useCallback(async () => {
    const saved = await persistCreation();
    if (saved) {
      resolveSheet();
    } else {
      setDiscardVisible(false);
    }
  }, [persistCreation, resolveSheet]);

  // "Discard" resolves without saving.
  const handleDiscardConfirm = useCallback(() => {
    track('creation_discarded');
    resolveSheet();
  }, [resolveSheet]);

  // Backdrop / back dismiss — stay on the canvas, reset the intent.
  const handleDiscardCancel = useCallback(() => {
    setDiscardVisible(false);
    setPendingAction(null);
    pendingProceedRef.current = null;
    sheetIntentRef.current = 'leave';
  }, []);

  // New-blank-canvas button. Enabled whenever the canvas isn't already blank.
  // Only route through the save/discard sheet when there are pending edits to
  // lose; an already-saved canvas has nothing to discard, so reset in place.
  const handleNewBlankCanvas = useCallback(() => {
    if (!hasUnsavedChanges) {
      resetCanvasToBlank();
      return;
    }
    sheetIntentRef.current = 'new';
    setDiscardVisible(true);
  }, [hasUnsavedChanges, resetCanvasToBlank]);

  const actionDisabled = !selectedId;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header — left group: menu/back + undo + redo. Right: My Creations. */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            {fromRemix ? (
              <Pressable
                testID="canvas-header-back"
                onPress={() => navigation.goBack()}
                accessibilityLabel={t('common.a11y_go_back')}
                style={styles.headerIconBtn}
              >
                <IconChevronLeft width={24} height={24} />
              </Pressable>
            ) : (
              <Pressable
                testID="canvas-header-menu"
                onPress={openSidebar}
                accessibilityLabel={t('home.a11y_open_menu')}
                style={styles.headerIconBtn}
              >
                <IconMenu width={24} height={24} />
              </Pressable>
            )}
            <Pressable
              testID="canvas-header-undo"
              onPress={handleUndo}
              disabled={!canUndo}
              accessibilityLabel={t('outfitCanvas.a11y_undo')}
              style={[
                styles.headerIconBtn,
                !canUndo && styles.headerIconBtnDisabled,
              ]}
            >
              <IconCanvasUndo width={18} height={18} />
            </Pressable>
            <Pressable
              testID="canvas-header-redo"
              onPress={handleRedo}
              disabled={!canRedo}
              accessibilityLabel={t('outfitCanvas.a11y_redo')}
              style={[
                styles.headerIconBtn,
                !canRedo && styles.headerIconBtnDisabled,
              ]}
            >
              <IconCanvasRedo width={18} height={18} />
            </Pressable>
          </View>

          <Pressable
            testID="canvas-header-my-creations"
            onPress={handleOpenCreations}
            accessibilityLabel={t('outfitCanvas.a11y_my_creations')}
            style={styles.headerIconBtn}
          >
            <IconMyCreation width={24} height={24} />
            {/* Mint "unseen saved creation" dot — same feedback as the Home
                favourites "Wear this" dot. Lit on save, cleared when the My
                Creations list is opened. */}
            {hasUnseenCreations ? (
              <View
                testID="canvas-my-creations-badge"
                style={styles.creationDot}
                pointerEvents="none"
              />
            ) : null}
          </Pressable>
        </View>

        {/* Body — Figma justify-between: canvas card / add-row / tags grouped at
          top, Save pinned at the bottom. Backdrop tap deselects. */}
        <Pressable
          testID="canvas-backdrop"
          onPress={() => setSelectedId(null)}
          style={styles.body}
        >
          {/* Top group — gap 16 (theme.spacing.m) between card / add-row / tags */}
          <View style={styles.topGroup}>
            {/* Canvas card — fixed-size inset rounded card (Figma "Image 3:4") */}
            <View style={styles.canvasWrap}>
              <OutfitCanvasSurface
                items={items}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                selectedId={selectedId}
                onSelect={handleSelect}
                onPositionChange={handlePositionChange}
                onScaleChange={handleScaleChange}
                onRotationChange={handleRotationChange}
                onImageLoad={handleItemImageLoad}
                showGrid
                itemTestIDPrefix="canvas-item"
                enablePinchZoom
              />
              {/* Adding-items status — shown while freshly-added images load.
                  Informational, so it never blocks canvas touches. */}
              {addStatusVisible ? (
                <View
                  style={styles.addingStatusWrap}
                  pointerEvents="none"
                  testID="canvas-adding-status"
                >
                  <View style={styles.addingStatus}>
                    <DotsLoader accessibilityLabel={t('outfitCanvas.adding')} />
                    <Text style={styles.addingStatusLabel}>
                      {t('outfitCanvas.adding')}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Toolbar */}
            <View style={styles.toolbar}>
              <ToolbarBtn
                testID="canvas-tool-add"
                onPress={handleAddItem}
                accessibilityLabel={t('common.a11y_add_item')}
              >
                <IconCanvasAdd width={18} height={18} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-layer-up"
                onPress={handleLayerUp}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_bring_forward')}
              >
                <IconCanvasLayerUp width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-layer-down"
                onPress={handleLayerDown}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_send_backward')}
              >
                <IconCanvasLayerDown width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-duplicate"
                onPress={handleDuplicate}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_duplicate')}
              >
                <IconCanvasDuplicate width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-swap"
                onPress={() => {
                  /* TODO: navigate to item picker */
                }}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_swap')}
              >
                <IconCanvasSwap width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-delete"
                onPress={handleDelete}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_delete_item')}
              >
                <IconCanvasDelete width={32} height={31} />
              </ToolbarBtn>
            </View>

            {/* Tags row */}
            <View style={styles.tagsRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScroll}
                keyboardShouldPersistTaps="handled"
              >
                {tags.map(tag => (
                  <TagChip
                    key={tag}
                    label={tag}
                    onRemove={() => handleRemoveTag(tag)}
                  />
                ))}
                {addingTag ? (
                  <TextInput
                    testID="canvas-tag-input"
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={handleConfirmTag}
                    onBlur={handleConfirmTag}
                    autoFocus
                    returnKeyType="done"
                    placeholder={t('outfitCanvas.tag_placeholder')}
                    style={styles.tagInput}
                    accessibilityLabel={t('outfitCanvas.a11y_tag_input')}
                  />
                ) : (
                  <Pressable
                    testID="canvas-tag-add"
                    onPress={() => setAddingTag(true)}
                    accessibilityLabel={t('outfitCanvas.a11y_add_tag')}
                    style={styles.tagAddBtn}
                  >
                    <IconCanvasAdd width={12} height={12} />
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Footer — 56×56 outline "new canvas" button (canvas glyph, distinct
              from the toolbar add "+"; starts a new blank canvas, disabled only
              when the canvas is already blank) ahead of the primary FILLED Save
              button, which carries the My Creations icon and shows a spinner
              while the save is in flight. */}
            <View style={styles.saveRow}>
              <PillButton
                testID="canvas-new-blank"
                onPress={handleNewBlankCanvas}
                disabled={items.length === 0}
                accessibilityLabel={t('outfitCanvas.a11y_new_canvas')}
                leading={
                  <IconNewCanvas
                    width={24}
                    height={24}
                    color={theme.colors.figmaText}
                  />
                }
                variant="outline"
                style={styles.newCanvasButton}
              />
              <PillButton
                testID="canvas-save"
                onPress={handleSave}
                disabled={!hasUnsavedChanges || items.length === 0}
                loading={isSaving}
                accessibilityLabel={t('outfitCanvas.a11y_save_outfit')}
                title={t('common.save')}
                trailing={<IconMyCreation width={24} height={24} />}
                variant="filled"
                style={styles.saveButton}
              />
            </View>
          </View>
        </Pressable>
      </SafeAreaView>

      {/* Item picker panel */}
      <ItemPickerPanel
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={handlePickerConfirm}
      />

      {/* Unsaved-changes guard sheet (shown on leave with pending edits) */}
      <DiscardCreationDialog
        visible={discardVisible}
        onCancel={handleDiscardCancel}
        onSave={handleDiscardSave}
        onDiscard={handleDiscardConfirm}
      />

      {/* Success snackbar overlay — "Saved to My Creations" (mint M3 snackbar,
          same component as Wardrobe). Informational, so it never blocks touches. */}
      {savedSnackbarVisible ? (
        <View
          style={[styles.savedSnackbarOverlay, { bottom: insets.bottom + 24 }]}
          pointerEvents="none"
          testID="canvas-saved-snackbar-overlay"
        >
          <ItemReadySnackbar message={t('outfitCanvas.saved_body')} />
        </View>
      ) : null}

      {/* Save-failure snackbar overlay — black InfoSnackbar (role="alert"),
          dismissible + auto-dismissing. Interactive (close button), so it must
          stay touchable (no pointerEvents="none"). */}
      {saveErrorVisible ? (
        <View
          style={[styles.saveErrorOverlay, { bottom: insets.bottom + 24 }]}
          testID="canvas-save-error-overlay"
        >
          <InfoSnackbar
            testID="canvas-save-error-snackbar"
            message={t('outfitCanvas.save_failed')}
            onClose={dismissSaveError}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  // Bottom-anchored, centred overlay for the "Saved to My Creations" snackbar
  // (`bottom` supplied inline to respect the home-indicator safe area).
  savedSnackbarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: theme.zIndex.toast,
    elevation: 1000,
  },
  // The InfoSnackbar stretches to its container width, so this overlay adds the
  // side margins (vs the success overlay, which centres a fixed-width card).
  saveErrorOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.m,
    zIndex: theme.zIndex.toast,
    elevation: 1000,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    height: 56,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
    ...theme.ds.shadow.headerIcon,
  },
  // Mint "unseen saved creation" dot — mirrors the Home favourites favDot
  // (12×12, top/right 8, figmaFavouriteDot) for a consistent saved-feedback cue.
  creationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.figmaFavouriteDot,
  },
  headerIconBtnDisabled: {
    opacity: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  // Body — fills remaining height; Figma justify-between pins Save at bottom.
  // 12px (theme.spacing.uacDimension12) horizontal inset matches the canvas card inset.
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacDimension12,
    justifyContent: 'space-between',
  },
  // Top group — canvas card / add-row / tags stacked with 16px gap.
  topGroup: {
    gap: theme.spacing.m,
  },
  // Relative wrapper so the "Adding…" status can anchor over the canvas card.
  canvasWrap: {
    position: 'relative',
  },
  // Full-width band pinned near the top of the canvas; centres the status pill.
  addingStatusWrap: {
    position: 'absolute',
    top: theme.spacing.m,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.chip,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.uacDimension12,
    ...theme.ds.shadow.headerIcon,
  },
  addingStatusLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextDark,
  },
  // Add-item button (circular, below canvas — Figma Group 36, 48×48).
  // Left-aligned, flush to the canvas card's left edge (body provides the
  // 12px horizontal inset; gap handled by topGroup).
  addRow: {
    flexDirection: 'row',
  },
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.figmaDivider,
    backgroundColor: theme.colors.background,
  },
  // Tags — row sits in topGroup (gap 16 above); chips flush to body inset.
  tagsRow: {},
  tagsScroll: {
    gap: 10, // Figma chip row gap
    alignItems: 'center',
  },
  // Add chip — Figma: bg background/primary/subtle_50 (#f2efec), radius 6,
  // height 32, icon-only "+".
  tagAddBtn: {
    width: 38,
    height: 32,
    borderRadius: theme.borderRadius.chip,
    backgroundColor: theme.colors.figmaCardSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInput: {
    ...theme.typography.aliases.uacBodyXsRegular, // Inter Regular 12/16
    height: 32,
    minWidth: 80,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.uacDimension12,
    color: theme.colors.figmaTextDark,
  },
  // Save button — Figma: 1.5px border border/neutral/base (#1d1f23), radius 16,
  // height 56, transparent fill, label Poppins Medium 16/24 #262421.
  // Side inset = 12px (theme.spacing.uacDimension12), supplied by the body padding so the
  // button aligns flush with the canvas card edges.
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.m,
    paddingTop: theme.spacing.s,
  },
  // 56×56 outline icon button: override the PillButton's text padding so it's a
  // square, sitting ahead of the Save button.
  newCanvasButton: {
    width: 56,
    paddingHorizontal: 0,
  },
  // Primary Save button fills the remaining row width.
  saveButton: {
    flex: 1,
  },
});
