import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Text, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

export type AppIconName =
  | 'home'
  | 'people'
  | 'mail'
  | 'person'
  | 'plus'
  | 'back'
  | 'search'
  | 'calendar'
  | 'location'
  | 'bookmark'
  | 'bookmark-filled'
  | 'check'
  | 'close'
  | 'chevron-right'
  | 'sparkles'
  | 'shield'
  | 'clock'
  | 'lock'
  | 'globe'
  | 'edit'
  | 'settings'
  | 'logout'
  | 'group'
  | 'send'
  | 'heart'
  | 'info'
  | 'filter'
  | 'map'
  | 'list';

const symbols: Record<AppIconName, SymbolViewProps['name']> = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  people: { ios: 'person.2.fill', android: 'group', web: 'group' },
  mail: { ios: 'envelope.fill', android: 'mail', web: 'mail' },
  person: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  bookmark: { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' },
  'bookmark-filled': { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  'chevron-right': { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  shield: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  globe: { ios: 'globe', android: 'public', web: 'public' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  group: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  filter: {
    ios: 'line.3.horizontal.decrease',
    android: 'filter_list',
    web: 'filter_list',
  },
  map: { ios: 'map.fill', android: 'map', web: 'map' },
  list: { ios: 'list.bullet', android: 'view_list', web: 'view_list' },
};

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

export function AppIcon({ name, size = 22, color = '#19231E', style }: AppIconProps) {
  return (
    <SymbolView
      name={symbols[name]}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
      fallback={<Text style={{ color, fontSize: size * 0.72 }}>•</Text>}
    />
  );
}
