// src/components/IconSelectorMenu/IconSelectorMenu.db.ts
import type { IconOption } from './IconSelectorMenu.types';
import { createElement } from 'react';

import WorkIcon from '@mui/icons-material/Work';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FlightIcon from '@mui/icons-material/Flight';
import CategoryIcon from '@mui/icons-material/Category';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import PetsIcon from '@mui/icons-material/Pets';
import SchoolIcon from '@mui/icons-material/School';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SavingsIcon from '@mui/icons-material/Savings';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WifiIcon from '@mui/icons-material/Wifi';
import PublicIcon from '@mui/icons-material/Public';
import EmojiTransportationIcon from '@mui/icons-material/EmojiTransportation';
import LocalMallIcon from '@mui/icons-material/LocalMall';

import FastfoodIcon from '@mui/icons-material/Fastfood';
import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import IcecreamIcon from '@mui/icons-material/Icecream';

import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import LocalPizzaIcon from '@mui/icons-material/LocalPizza';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import LocalPostOfficeIcon from '@mui/icons-material/LocalPostOffice';
import LocalAirportIcon from '@mui/icons-material/LocalAirport';
import LocalHotelIcon from '@mui/icons-material/LocalHotel';
import LocalActivityIcon from '@mui/icons-material/LocalActivity';

import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';

import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import TrainIcon from '@mui/icons-material/Train';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import MapIcon from '@mui/icons-material/Map';
import LaptopIcon from '@mui/icons-material/Laptop';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';

import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import ElderlyIcon from '@mui/icons-material/Elderly';
import SpaIcon from '@mui/icons-material/Spa';
import ChairIcon from '@mui/icons-material/Chair';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SecurityIcon from '@mui/icons-material/Security';
import StoreIcon from '@mui/icons-material/Store';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

export const ICON_OPTIONS: IconOption[] = [
  { id: 'work', label: 'Work', render: (p) => createElement(WorkIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'home', label: 'Home', render: (p) => createElement(HomeIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'car', label: 'Car', render: (p) => createElement(DirectionsCarIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'shopping', label: 'Shopping', render: (p) => createElement(ShoppingCartIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'health', label: 'Health', render: (p) => createElement(FavoriteIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'travel', label: 'Travel', render: (p) => createElement(FlightIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'food', label: 'Food', render: (p) => createElement(RestaurantIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'groceries', label: 'Groceries', render: (p) => createElement(LocalGroceryStoreIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'coffee', label: 'Coffee', render: (p) => createElement(LocalCafeIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'pets', label: 'Pets', render: (p) => createElement(PetsIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'education', label: 'Education', render: (p) => createElement(SchoolIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'games', label: 'Games', render: (p) => createElement(SportsEsportsIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'phone', label: 'Phone', render: (p) => createElement(PhoneIphoneIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'subs', label: 'Subscriptions', render: (p) => createElement(SubscriptionsIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'medical', label: 'Medical', render: (p) => createElement(MedicalServicesIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'fitness', label: 'Fitness', render: (p) => createElement(FitnessCenterIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'atm', label: 'ATM', render: (p) => createElement(LocalAtmIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'savings', label: 'Savings', render: (p) => createElement(SavingsIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'offers', label: 'Offers', render: (p) => createElement(LocalOfferIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'electricity', label: 'Electricity', render: (p) => createElement(BoltIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'water', label: 'Water', render: (p) => createElement(WaterDropIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'wifi', label: 'Internet', render: (p) => createElement(WifiIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'world', label: 'World', render: (p) => createElement(PublicIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'transport', label: 'Transport', render: (p) => createElement(EmojiTransportationIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'mall', label: 'Mall', render: (p) => createElement(LocalMallIcon, { fontSize: p?.fontSize ?? 'small' }) },

  { id: 'fastfood', label: 'Fastfood', render: (p) => createElement(FastfoodIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'bakery', label: 'Bakery', render: (p) => createElement(BakeryDiningIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'dinner', label: 'Dinner', render: (p) => createElement(DinnerDiningIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'icecream', label: 'Icecream', render: (p) => createElement(IcecreamIcon, { fontSize: p?.fontSize ?? 'small' }) },

  { id: 'gas', label: 'Gas', render: (p) => createElement(LocalGasStationIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'hospital', label: 'Hospital', render: (p) => createElement(LocalHospitalIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'pharmacy', label: 'Pharmacy', render: (p) => createElement(LocalPharmacyIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'bar', label: 'Bar', render: (p) => createElement(LocalBarIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'movies', label: 'Movies', render: (p) => createElement(LocalMoviesIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'taxi', label: 'Taxi', render: (p) => createElement(LocalTaxiIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'laundry', label: 'Laundry', render: (p) => createElement(LocalLaundryServiceIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'florist', label: 'Florist', render: (p) => createElement(LocalFloristIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'pizza', label: 'Pizza', render: (p) => createElement(LocalPizzaIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'drink', label: 'Drink', render: (p) => createElement(LocalDrinkIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'shipping', label: 'Shipping', render: (p) => createElement(LocalShippingIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'library', label: 'Library', render: (p) => createElement(LocalLibraryIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'fire', label: 'Fire', render: (p) => createElement(LocalFireDepartmentIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'police', label: 'Police', render: (p) => createElement(LocalPoliceIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'post', label: 'Post', render: (p) => createElement(LocalPostOfficeIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'airport', label: 'Airport', render: (p) => createElement(LocalAirportIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'hotel', label: 'Hotel', render: (p) => createElement(LocalHotelIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'activity', label: 'Activity', render: (p) => createElement(LocalActivityIcon, { fontSize: p?.fontSize ?? 'small' }) },

  { id: 'bag', label: 'Bag', render: (p) => createElement(ShoppingBagIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'card', label: 'Card', render: (p) => createElement(CreditCardIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'bank', label: 'Bank', render: (p) => createElement(AccountBalanceIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'paid', label: 'Paid', render: (p) => createElement(PaidIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'receipt', label: 'Receipt', render: (p) => createElement(ReceiptLongIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'electric2', label: 'Electric', render: (p) => createElement(ElectricBoltIcon, { fontSize: p?.fontSize ?? 'small' }) },

  { id: 'bus', label: 'Bus', render: (p) => createElement(DirectionsBusIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'bike', label: 'Bike', render: (p) => createElement(DirectionsBikeIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'train', label: 'Train', render: (p) => createElement(TrainIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'scooter', label: 'Scooter', render: (p) => createElement(TwoWheelerIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'map', label: 'Map', render: (p) => createElement(MapIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'laptop', label: 'Laptop', render: (p) => createElement(LaptopIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'build', label: 'Build', render: (p) => createElement(BuildIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'handyman', label: 'Handyman', render: (p) => createElement(HandymanIcon, { fontSize: p?.fontSize ?? 'small' }) },

  { id: 'soccer', label: 'Soccer', render: (p) => createElement(SportsSoccerIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'music', label: 'Music', render: (p) => createElement(MusicNoteIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'headphones', label: 'Headphones', render: (p) => createElement(HeadphonesIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'child', label: 'Child', render: (p) => createElement(ChildCareIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'elderly', label: 'Elderly', render: (p) => createElement(ElderlyIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'spa', label: 'Spa', render: (p) => createElement(SpaIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'chair', label: 'Chair', render: (p) => createElement(ChairIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'light', label: 'Light', render: (p) => createElement(LightbulbIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'security', label: 'Security', render: (p) => createElement(SecurityIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'store', label: 'Store', render: (p) => createElement(StoreIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'android', label: 'Android', render: (p) => createElement(PhoneAndroidIcon, { fontSize: p?.fontSize ?? 'small' }) },
  { id: 'camera', label: 'Camera', render: (p) => createElement(CameraAltIcon, { fontSize: p?.fontSize ?? 'small' }) },

  { id: 'other', label: 'Other', render: (p) => createElement(CategoryIcon, { fontSize: p?.fontSize ?? 'small' }) },
];

export const COLOR_PRESETS: string[] = [
  '#1a73e8',
  '#174ea6',
  '#4285f4',
  '#7baaf7',
  '#a142f4',
  '#9334e6',
  '#d7aefb',
  '#ea4335',
  '#c5221f',
  '#ff6d60',
  '#fbbc05',
  '#f29900',
  '#fde293',
  '#34a853',
  '#188038',
  '#a8dab5',
  '#00acc1',
  '#00838f',
  '#80deea',
  '#6d4c41',
  '#5d4037',
  '#bcaaa4',
  '#9aa0a6',
  '#3c4043',
];