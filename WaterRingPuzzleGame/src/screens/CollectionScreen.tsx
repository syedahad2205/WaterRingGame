/**
 * CollectionScreen.tsx
 *
 * Displays all 20 collections. Completed items are shown in full colour;
 * missing items are greyed out. Tapping a missing item shows a "how to get"
 * tooltip.
 *
 * Requirements: 35.3
 * Task: 8.4.3
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useCosmeticsStore } from '../store/slices/cosmeticsSlice';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Icon } from '../components/icons/GameIcons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { COLLECTION_DEFINITIONS } from '../features/progression/CollectionTracker';
import { getCosmeticById } from '../constants/cosmeticCatalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionItem {
  id: string;
  name: string;
  previewColors: { primary: string; secondary: string };
  howToGet: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  rewardCoins: number;
  rewardXP: number;
  items: CollectionItem[];
}

// ---------------------------------------------------------------------------
// Build collections from real CollectionTracker + CosmeticCatalog data
// ---------------------------------------------------------------------------

const COLLECTIONS: Collection[] = COLLECTION_DEFINITIONS.map((def) => ({
  id: def.id,
  name: def.name,
  description: `Collect all ${def.itemIds.length} items for ${def.rewardCoins} coins + ${def.rewardXP} XP`,
  rewardCoins: def.rewardCoins,
  rewardXP: def.rewardXP,
  items: def.itemIds.map((itemId) => {
    const cosmetic = getCosmeticById(itemId);
    return {
      id: itemId,
      name: cosmetic?.name ?? itemId.replace(/^(skin_|trail_)/, '').replace(/_/g, ' '),
      previewColors: cosmetic?.previewColors ?? { primary: '#555555', secondary: '#888888' },
      howToGet: cosmetic
        ? cosmetic.source === 'store'
          ? `Purchase in Store for ${cosmetic.coinCost} coins`
          : `Source: ${cosmetic.source.replace(/_/g, ' ')}`
        : 'Complete challenges to unlock',
    };
  }),
}));

// ---------------------------------------------------------------------------
// CollectionCard component (Task 8.4.3)
// ---------------------------------------------------------------------------

interface CollectionCardProps {
  item: CollectionItem;
  isOwned: boolean;
  onPress: () => void;
}

const CollectionCard = React.memo(function CollectionCard({ item, isOwned, onPress }: CollectionCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        { opacity: pressed ? 0.7 : 1 },
      ]}
      accessible={true}
      accessibilityLabel={`${item.name}. ${isOwned ? 'Owned' : 'Not yet unlocked. Tap to see how to get it.'}`}
    >
      <GlassCard
        variant="subtle"
        noAnimation
        style={[styles.card, !isOwned && styles.cardLocked]}
      >
        {isOwned ? (
          <View style={[styles.previewSwatch, {
            backgroundColor: item.previewColors.primary,
            borderColor: item.previewColors.secondary,
            shadowColor: item.previewColors.primary,
          }]}>
            <View style={[styles.previewSwatchInner, { backgroundColor: item.previewColors.secondary }]} />
          </View>
        ) : (
          <View style={styles.cardIconContainer}>
            <Icon name="lock" size={28} color={DS.colors.text.tertiary} />
          </View>
        )}
        <Text
          style={[styles.cardName, !isOwned && styles.cardNameLocked]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
      </GlassCard>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// CollectionScreen
// ---------------------------------------------------------------------------

/**
 * CollectionScreen — shows all collections with owned/locked states.
 *
 * Requirements: 35.3
 * Task: 8.4.3
 */
// eslint-disable-next-line max-lines-per-function
export default function CollectionScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const ownedIds = useCosmeticsStore((state) => state.ownedCosmeticIds);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [infoDialog, setInfoDialog] = useState<{ name: string; howToGet: string } | null>(null);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 400 });
    contentTranslateY.value = withDelay(100, withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleCardPress = useCallback((item: CollectionItem, isOwned: boolean): void => {
    if (!isOwned) {
      setInfoDialog({ name: item.name, howToGet: item.howToGet });
    }
  }, []);

  const renderCollection = useCallback(({ item: col }: { item: Collection }): React.JSX.Element => {
    const isExpanded = expandedId === col.id;
    const ownedCount = col.items.filter((i) => ownedIds.includes(i.id)).length;
    const isComplete = ownedCount === col.items.length;

    return (
      <GlassCard
        variant="medium"
        glow={isComplete ? DS.colors.accent : undefined}
        noAnimation
        style={styles.collection}
      >
        <Pressable
          onPress={(): void => setExpandedId(isExpanded ? null : col.id)}
          accessibilityRole="button"
          accessibilityLabel={`${col.name} collection. ${ownedCount} of ${col.items.length} items owned.`}
          accessibilityState={{ expanded: isExpanded }}
        >
          <SectionHeader
            title={col.name}
            subtitle={col.description}
            actionIcon={isExpanded ? 'chevron-up' : 'chevron-down'}
            onAction={(): void => setExpandedId(isExpanded ? null : col.id)}
            showDivider={false}
            style={styles.sectionHeader}
          />

          <View style={styles.progressRow}>
            {isComplete && (
              <Icon name="check" size={16} color={DS.colors.success} style={styles.checkIcon} />
            )}
            <View style={styles.progressBarContainer}>
              <ProgressBar
                value={col.items.length > 0 ? ownedCount / col.items.length : 0}
                size="sm"
                color={isComplete ? DS.colors.accent : DS.colors.primary}
              />
            </View>
            <Text style={styles.progressText}>
              {ownedCount}/{col.items.length}
            </Text>
          </View>
          {/* Reward preview */}
          <View style={styles.rewardRow}>
            <Icon name="coin" size={14} color={DS.colors.accent} />
            <Text style={styles.rewardText}>{col.rewardCoins}</Text>
            <Icon name="star" size={14} color={DS.colors.secondary} />
            <Text style={styles.rewardText}>{col.rewardXP} XP</Text>
          </View>
        </Pressable>

        {isExpanded ? (
          <View style={styles.itemGrid}>
            {col.items.map((item) => {
              const isOwned = ownedIds.includes(item.id);
              return (
                <CollectionCard
                  key={item.id}
                  item={item}
                  isOwned={isOwned}
                  onPress={(): void => handleCardPress(item, isOwned)}
                />
              );
            })}
          </View>
        ) : null}
      </GlassCard>
    );
  }, [expandedId, ownedIds, handleCardPress]);

  return (
    <ScreenContainer accessibilityLabel="Collection Screen">
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="back" size={28} color={DS.colors.text.primary} />
        </Pressable>
        <Text style={styles.pageTitle} accessibilityRole="header">
          Collection
        </Text>
      </View>

      <Animated.View style={contentStyle}>
      <FlatList
        data={COLLECTIONS}
        renderItem={renderCollection}
        keyExtractor={(col): string => col.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      </Animated.View>

      <ConfirmDialog
        visible={infoDialog !== null}
        title={infoDialog ? `How to get: ${infoDialog.name}` : ''}
        message={infoDialog?.howToGet ?? ''}
        confirmLabel="OK"
        cancelLabel="Close"
        confirmVariant="primary"
        onConfirm={() => setInfoDialog(null)}
        onCancel={() => setInfoDialog(null)}
      />
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xl,
    paddingTop: DS.spacing.lg,
    paddingBottom: DS.spacing.md,
    gap: DS.spacing.md,
  },
  pageTitle: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title1,
    fontWeight: DS.typography.weight.heavy,
  },
  listContent: {
    paddingHorizontal: DS.spacing.lg,
    paddingBottom: DS.spacing.xxxl,
  },
  collection: {
    marginBottom: DS.spacing.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    marginBottom: 0,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xs,
    paddingBottom: DS.spacing.sm,
    gap: DS.spacing.sm,
  },
  checkIcon: {
    marginRight: DS.spacing.xxs,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressText: {
    color: DS.colors.secondary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.bold,
    minWidth: 32,
    textAlign: 'right',
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: DS.spacing.md,
    paddingBottom: DS.spacing.md,
    gap: DS.spacing.sm,
  },
  card: {
    width: 84,
    alignItems: 'center',
    padding: DS.spacing.sm,
    gap: DS.spacing.xxs,
  },
  cardLocked: {
    opacity: 0.45,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.caption2,
    textAlign: 'center',
    fontWeight: DS.typography.weight.semibold,
  },
  cardNameLocked: {
    color: DS.colors.text.tertiary,
  },
  previewSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  previewSwatchInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  rewardRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: DS.spacing.xxs,
    paddingHorizontal: DS.spacing.xs,
    paddingBottom: DS.spacing.xs,
  },
  rewardText: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.semibold,
    marginRight: DS.spacing.xs,
  },
});
