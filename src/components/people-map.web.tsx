import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type Map as MapLibreWebMap,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { palette, radius, shadow, spacing, typography } from '@/constants/theme';
import { approximateMapBounds, profilesWithApproximateLocations } from '@/domain/profile-discovery';
import type { Profile } from '@/types/domain';

const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

interface PeopleMapProps {
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
}

export function PeopleMap({ profiles, onSelectProfile }: PeopleMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreWebMap | null>(null);
  const [failed, setFailed] = useState(false);
  const locatedProfiles = useMemo(() => profilesWithApproximateLocations(profiles), [profiles]);
  const bounds = useMemo(() => approximateMapBounds(profiles), [profiles]);

  useEffect(() => {
    if (!containerRef.current || !bounds) return;
    setFailed(false);
    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPEN_FREE_MAP_STYLE,
      attributionControl: { compact: true },
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: 64, duration: 0, maxZoom: 12 },
    );
    map.on('error', () => setFailed(true));

    const markers = locatedProfiles.map((profile) => {
      const markerButton = document.createElement('button');
      markerButton.type = 'button';
      markerButton.title = `Open ${profile.name}'s profile near ${profile.approximateLocation.area}`;
      markerButton.setAttribute('aria-label', markerButton.title);
      markerButton.textContent = profile.initials;
      Object.assign(markerButton.style, {
        width: '46px',
        height: '46px',
        borderRadius: '999px',
        border: '3px solid white',
        color: 'white',
        backgroundColor: profile.avatarColor,
        backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : 'none',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        boxShadow: '0 5px 14px rgba(22, 31, 27, 0.22)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '800',
      });
      markerButton.addEventListener('click', () => onSelectProfile(profile));
      return new Marker({ element: markerButton, anchor: 'bottom' })
        .setLngLat(profile.approximateLocation.coordinates)
        .addTo(map);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, locatedProfiles, onSelectProfile]);

  if (!bounds) {
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

  return (
    <View style={styles.wrapper}>
      <View style={styles.mapShell}>
        <div
          aria-label="Interactive map of matching people's approximate areas"
          ref={containerRef}
          role="application"
          style={{ height: '100%', width: '100%' }}
        />
        {failed ? (
          <View pointerEvents="none" style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Some map details could not load.</Text>
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
  errorOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    alignItems: 'center',
  },
  errorTitle: {
    ...typography.small,
    color: palette.ink,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
