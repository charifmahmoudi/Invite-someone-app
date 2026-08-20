import {
  Camera,
  Map as MapLibreMap,
  Marker,
  type InitialViewState,
} from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { palette, radius, shadow, spacing, typography } from '@/constants/theme';
import { approximateMapBounds, profilesWithApproximateLocations } from '@/domain/profile-discovery';
import type { Profile } from '@/types/domain';

const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

interface PeopleMapProps {
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
}

export function PeopleMap({ profiles, onSelectProfile }: PeopleMapProps) {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const locatedProfiles = useMemo(() => profilesWithApproximateLocations(profiles), [profiles]);
  const bounds = useMemo(() => approximateMapBounds(profiles), [profiles]);

  const initialViewState = useMemo<InitialViewState | undefined>(() => {
    if (!bounds) return undefined;
    if (locatedProfiles.length === 1) {
      return {
        center: locatedProfiles[0].approximateLocation.coordinates,
        zoom: 11.5,
      };
    }
    return {
      bounds,
      padding: { top: 72, right: 48, bottom: 72, left: 48 },
    };
  }, [bounds, locatedProfiles]);

  if (!initialViewState) {
    return (
      <View style={styles.unavailable}>
        <AppIcon name="location" color={palette.forest} size={26} />
        <Text style={styles.unavailableTitle}>No approximate areas to show</Text>
        <Text style={styles.unavailableBody}>
          Try clearing the distance filter or use list view.
        </Text>
      </View>
    );
  }

  const retry = () => {
    setLoadState('loading');
    setRetryKey((value) => value + 1);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.mapShell}>
        <MapLibreMap
          key={retryKey}
          accessibilityLabel="Interactive map of matching people's approximate areas"
          androidView="texture"
          attribution
          attributionPosition={{ bottom: 8, right: 8 }}
          compass
          compassPosition={{ top: 12, right: 12 }}
          logo={false}
          mapStyle={OPEN_FREE_MAP_STYLE}
          onDidFailLoadingMap={() => setLoadState('failed')}
          onDidFinishLoadingMap={() => setLoadState('ready')}
          scaleBar={false}
          style={StyleSheet.absoluteFill}
          tintColor={palette.forest}
        >
          <Camera initialViewState={initialViewState} maxZoom={15} minZoom={3} />
          {locatedProfiles.map((profile) => (
            <Marker
              accessibilityLabel={`Open ${profile.name}'s profile near ${profile.approximateLocation.area}`}
              anchor="bottom"
              id={`profile-${profile.id}`}
              key={profile.id}
              lngLat={profile.approximateLocation.coordinates}
              onPress={() => onSelectProfile(profile)}
            >
              <View pointerEvents="none" style={styles.marker}>
                <View style={styles.markerAvatar}>
                  <Avatar profile={profile} size={44} />
                </View>
                <Text numberOfLines={1} style={styles.markerLabel}>
                  {profile.name.split(' ')[0]}
                </Text>
              </View>
            </Marker>
          ))}
        </MapLibreMap>

        {loadState === 'loading' ? (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <View style={styles.loadingPill}>
              <Text style={styles.loadingText}>Loading map…</Text>
            </View>
          </View>
        ) : null}

        {loadState === 'failed' ? (
          <View style={styles.errorOverlay}>
            <AppIcon name="location" color={palette.forest} size={28} />
            <Text style={styles.errorTitle}>The map could not load</Text>
            <Text style={styles.errorBody}>Check your connection, then try again.</Text>
            <Button fullWidth={false} label="Retry map" onPress={retry} variant="outline" />
          </View>
        ) : null}
      </View>

      <View style={styles.privacyRow}>
        <AppIcon name="shield" color={palette.forest} size={17} />
        <Text style={styles.privacyText}>
          Pins show broad area centres, never a person’s live or exact location.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  mapShell: {
    height: 460,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#CEDBD2',
    backgroundColor: '#E8EFE9',
    ...shadow.card,
  },
  marker: { width: 84, alignItems: 'center', gap: 2 },
  markerAvatar: {
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: palette.white,
    backgroundColor: palette.white,
    ...shadow.floating,
  },
  markerLabel: {
    ...typography.micro,
    maxWidth: 80,
    color: palette.ink,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.md,
  },
  loadingPill: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow.card,
  },
  loadingText: { ...typography.small, color: palette.inkMuted },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(247,246,241,0.96)',
    padding: spacing.xxl,
  },
  errorTitle: { ...typography.h3, color: palette.ink, textAlign: 'center' },
  errorBody: {
    ...typography.body,
    color: palette.inkMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  privacyText: { ...typography.small, color: palette.inkMuted, flex: 1 },
  unavailable: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.xxl,
  },
  unavailableTitle: { ...typography.h3, color: palette.ink, textAlign: 'center' },
  unavailableBody: { ...typography.body, color: palette.inkMuted, textAlign: 'center' },
});
