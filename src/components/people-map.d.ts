import type { Profile } from '@/types/domain';

export interface PeopleMapProps {
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
}

export function PeopleMap(props: PeopleMapProps): React.ReactNode;
