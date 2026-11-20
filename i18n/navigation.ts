import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Link / usePathname conscients de la locale : le pathname retourné n'a pas de préfixe de langue.
export const { Link, usePathname } = createNavigation(routing);
