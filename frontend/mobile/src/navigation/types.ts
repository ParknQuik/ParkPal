import { CompositeScreenProps } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types';
import type { MainStackParamList } from './MainStack';

type TabParamList = {
  Home: undefined;
  Explore: undefined;
  MyBookings: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>;

export type MainStackScreenProps<T extends keyof MainStackParamList> = CompositeScreenProps<
  StackScreenProps<MainStackParamList, T>,
  RootStackScreenProps<'MainTabs'>
>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  MainStackScreenProps<'MainTabs'>
>;

export { StackScreenProps, BottomTabScreenProps, CompositeScreenProps, TabParamList };
