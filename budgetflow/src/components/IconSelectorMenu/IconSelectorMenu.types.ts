import type { JSX } from 'react';
import type { Category, RegistryRow } from '../RegistryTable/RegistryTable.types';

export type IconId =
  | 'work'
  | 'home'
  | 'car'
  | 'shopping'
  | 'health'
  | 'travel'
  | 'food'
  | 'groceries'
  | 'coffee'
  | 'pets'
  | 'education'
  | 'games'
  | 'phone'
  | 'subs'
  | 'medical'
  | 'fitness'
  | 'atm'
  | 'savings'
  | 'offers'
  | 'electricity'
  | 'water'
  | 'wifi'
  | 'world'
  | 'transport'
  | 'mall'
  | 'fastfood'
  | 'bakery'
  | 'dinner'
  | 'icecream'
  | 'gas'
  | 'hospital'
  | 'pharmacy'
  | 'bar'
  | 'movies'
  | 'taxi'
  | 'laundry'
  | 'florist'
  | 'pizza'
  | 'drink'
  | 'shipping'
  | 'library'
  | 'fire'
  | 'police'
  | 'post'
  | 'airport'
  | 'hotel'
  | 'activity'
  | 'bag'
  | 'card'
  | 'bank'
  | 'paid'
  | 'receipt'
  | 'electric2'
  | 'bus'
  | 'bike'
  | 'train'
  | 'scooter'
  | 'map'
  | 'laptop'
  | 'build'
  | 'handyman'
  | 'soccer'
  | 'music'
  | 'headphones'
  | 'child'
  | 'elderly'
  | 'spa'
  | 'chair'
  | 'light'
  | 'security'
  | 'store'
  | 'android'
  | 'camera'
  | 'other';

export type IconOption = {
  id: IconId;
  label: string;
  render: (props?: { fontSize?: 'small' | 'medium' }) => JSX.Element;
};

export type IconSelectorMenuProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;

  row: RegistryRow | null;

  categories: Category[];
  onCreateCategory: (name: string) => void;

  icons: IconOption[];
  colorPresets: string[];

  onChange: (patch: Partial<RegistryRow>) => void;
};