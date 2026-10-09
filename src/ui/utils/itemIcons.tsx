import React from 'react';
import {
  Droplets,
  IceCream,
  IceCreamCone,
  Cookie,
  Sparkles,
  Star,
  Cherry,
  Candy,
  Coffee,
  Citrus,
} from 'lucide-react';

export const ICON_OPTIONS: readonly { id: string; label: string }[] = [
  { id: 'droplets', label: 'Agua' },
  { id: 'ice-cream', label: 'Paleta' },
  { id: 'ice-cream-cone', label: 'Cono' },
  { id: 'cookie', label: 'Galleta' },
  { id: 'sparkles', label: 'Especial' },
  { id: 'cherry', label: 'Fruta' },
  { id: 'citrus', label: 'Cítrico' },
  { id: 'candy', label: 'Dulce' },
  { id: 'coffee', label: 'Café' },
  { id: 'star', label: 'Estrella' },
];

export const COLOR_OPTIONS: readonly string[] = [
  '#38BDF8',
  '#FDE047',
  '#F59E0B',
  '#FB7185',
  '#A855F7',
  '#34D399',
  '#F97316',
  '#A16207',
];

const MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  droplets: Droplets,
  'ice-cream': IceCream,
  'ice-cream-cone': IceCreamCone,
  cookie: Cookie,
  sparkles: Sparkles,
  cherry: Cherry,
  citrus: Citrus,
  candy: Candy,
  coffee: Coffee,
  star: Star,
};

export const ItemIcon: React.FC<{ icono: string; color: string; className?: string }> = ({
  icono,
  color,
  className = 'w-8 h-8',
}) => {
  const Cmp = MAP[icono] ?? Star;
  return <Cmp className={className} style={{ color }} />;
};
