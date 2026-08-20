import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { palette } from '@/constants/theme';
import type { Profile } from '@/types/domain';

interface AvatarProps {
  profile?: Pick<Profile, 'name' | 'initials' | 'avatarColor' | 'avatarUrl' | 'isVerified'>;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ profile, size = 44, style }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const initials = profile?.initials || '?';
  const fontSize = Math.max(12, size * 0.34);

  return (
    <View
      accessibilityLabel={profile ? `${profile.name}'s avatar` : 'Unknown person'}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: profile?.avatarColor ?? palette.surfaceMuted,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      {profile?.avatarUrl && failedUrl !== profile.avatarUrl ? (
        <Image
          accessibilityElementsHidden
          onError={() => setFailedUrl(profile.avatarUrl)}
          resizeMode="cover"
          source={{ uri: profile.avatarUrl }}
          style={[styles.image, { width: size - 4, height: size - 4, borderRadius: size / 2 }]}
        />
      ) : null}
      {profile?.isVerified ? (
        <View
          accessibilityLabel="Verified profile"
          style={[
            styles.verified,
            {
              width: Math.max(12, size * 0.28),
              height: Math.max(12, size * 0.28),
              borderRadius: size,
            },
          ]}
        >
          <Text style={[styles.check, { fontSize: Math.max(8, size * 0.18) }]}>✓</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.white,
  },
  initials: { color: palette.white, fontWeight: '800', letterSpacing: 0.3 },
  image: { position: 'absolute' },
  verified: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.forest,
    borderWidth: 1.5,
    borderColor: palette.white,
  },
  check: { color: palette.white, fontWeight: '900' },
});
