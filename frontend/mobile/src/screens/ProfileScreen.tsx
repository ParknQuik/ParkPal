import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../store';
import { logout, checkAuth, updateUserProfile } from '../store/slices/authSlice';
import { userAPI } from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(logout()).unwrap();
            } catch (err) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  }, [dispatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(checkAuth()).unwrap();
    } catch (err) {
      ;
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const getFileName = (uri: string) => {
    const timestamp = Date.now();
    const ext = uri.split('.').pop() || 'jpg';
    return `profile-${timestamp}.${ext}`;
  };

  const handleChangePhoto = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openCamera();
          else if (buttonIndex === 2) openGallery();
        }
      );
    } else {
      Alert.alert('Change Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: openCamera },
        { text: 'Choose from Gallery', onPress: openGallery },
      ]);
    }
  }, []);

  const openCamera = async () => {
    const hasPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!hasPermission?.granted) {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const hasPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!hasPermission?.granted) {
      Alert.alert('Permission needed', 'Media library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);
      const fileName = getFileName(imageUri);

      const { uploadUrl, fileName: gcsFileName } = await userAPI.getProfileUploadUrl(fileName).then(res => res.data);

      const response = await fetch(imageUri);
      const blob = await response.blob();
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      const updatedUser = await userAPI.uploadProfilePicture(gcsFileName).then(res => res.data);

      await dispatch(updateUserProfile({
        name: user?.name || '',
        phone: user?.phone || null,
        profileImageUrl: updatedUser.profileImageUrl || undefined,
      })).unwrap();

      Alert.alert('Success', 'Profile picture updated');
    } catch (error) {
      ;
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const userName = user?.name || 'Guest';
  const userEmail = user?.email || 'No email';
  const userInitial = userName.charAt(0).toUpperCase();

  const menuSections = [
    {
      title: 'My Account',
      items: [
        {
          icon: 'car-outline' as const,
          iconColor: colors.primary,
          label: 'My Vehicles',
          onPress: () => navigation.navigate('MyVehicles' as never),
        },

        {
          icon: 'format-list-bulleted' as const,
          iconColor: colors.accentYellow,
          label: 'My Listings',
          onPress: () => navigation.navigate('MyListings' as never),
        },
      ],
    },
    {
      title: 'Account Settings',
      items: [
        {
          icon: 'account-circle' as const,
          iconColor: colors.accentOrange,
          label: 'Personal Information',
          onPress: () => navigation.navigate('EditProfile' as never),
        },
        {
          icon: 'bell-outline' as const,
          iconColor: colors.accentYellow,
          label: 'Notifications',
          onPress: () => navigation.navigate('Notifications' as never),
        },
        {
          icon: 'shield-lock-outline' as const,
          iconColor: colors.primary,
          label: 'Security & Privacy',
          onPress: () => navigation.navigate('SecurityPrivacy' as never),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline' as const,
          iconColor: colors.textTertiary,
          label: 'Help Center',
          onPress: () => navigation.navigate('HelpCenter' as never),
        },
        {
          icon: 'logout' as const,
          iconColor: colors.error,
          label: 'Sign Out',
          onPress: handleLogout,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color={colors.white} />
              </View>
            )}
            {user?.profileImageUrl ? (
              <Image 
                source={{ uri: user!.profileImageUrl + '?t=' + Date.now() }} 
                style={styles.avatarImage}
                cachePolicy="none"
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editButton} onPress={handleChangePhoto}>
              <MaterialCommunityIcons name="camera" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>

          <View style={styles.membershipCard}>
            <View style={styles.membershipLeft}>
              <View style={styles.membershipIconContainer}>
                <MaterialCommunityIcons
                  name="star-circle"
                  size={28}
                  color={colors.white}
                />
              </View>
              <View>
                <Text style={styles.membershipLabel}>Bookings</Text>
                <Text style={styles.membershipValue}>{user?.totalBookings || 0} total</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.perksButton}
              onPress={() => navigation.navigate('Earnings' as never)}
            >
              <Text style={styles.perksButtonText}>Perks</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.menuContainer}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={styles.menuItem}
                    onPress={item.onPress}
                  >
                    <View style={styles.menuItemLeft}>
                      <View
                        style={[
                          styles.menuIconContainer,
                          { backgroundColor: `${item.iconColor}15` },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={22}
                          color={item.iconColor}
                        />
                      </View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  profileInfo: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  avatarText: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
  },
  userName: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  membershipCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    width: '100%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  membershipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  membershipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accentOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membershipLabel: {
    ...typography.small,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '500',
  },
  membershipValue: {
    ...typography.h5,
    color: colors.accentOrange,
    fontWeight: '700',
  },
  perksButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
  },
  perksButtonText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.small,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  menuContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default ProfileScreen;
