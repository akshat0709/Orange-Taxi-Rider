
import React from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, Modal, StatusBar, Alert, Linking, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Navigation, Car, Snowflake, VolumeX, Shield, ShieldCheck, CheckCircle, ArrowRight, Clock, Sparkles, Phone, Radio, X, Check, ChevronRight, Search, Crosshair, CreditCard, Banknote, RotateCcw, User as UserIcon, LogOut, Mail, Lock, MessageSquare, Star, Map as MapIcon, ArrowLeft, ChevronDown, Sun, Moon, Calendar, Wallet } from 'lucide-react-native';
import { styles } from '../styles/AppStyles';
import { useRideContext, formatScheduleShort, formatScheduleDate } from '../context/RideContext';
import { RideMap } from '../components/RideMap';
import { InRideChatModal } from '../components/InRideChatModal';
import { RatingModal } from '../components/RatingModal';
import { LocationSearchModal } from '../components/LocationSearchModal';
import { ProfileModal } from '../components/ProfileModal';
import { RideHistoryModal } from '../components/RideHistoryModal';
import { GuardianSafetyModal } from '../components/GuardianSafetyModal';
import { AmenitiesModal } from '../components/AmenitiesModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { TalkToOrangeModal } from '../components/TalkToOrangeModal';
import { WalletModal } from '../components/WalletModal';

export const BookingScreen = ({ navigation }: any) => {
  const context = useRideContext();
  const { insets, topSafeOffset, user, setUser, authModalVisible, setAuthModalVisible, authMode, setAuthMode, authEmail, setAuthEmail, authPassword, setAuthPassword, authFullName, setAuthFullName, authPhone, setAuthPhone, authSubmitting, setAuthSubmitting, vehicles, setVehicles, selectedVehicle, setSelectedVehicle, loading, setLoading, activeCity, setActiveCity, cityPickerVisible, setCityPickerVisible, pickupText, setPickupText, pickupCoords, setPickupCoords, dropLocation, setDropLocation, pickupPillar, setPickupPillar, searchModalVisible, setSearchModalVisible, pinPickerActive, setPinPickerActive, pinPickerTarget, setPinPickerTarget, pinCurrentCoords, setPinCurrentCoords, pinAddressText, setPinAddressText, isBookingPinConfirm, setIsBookingPinConfirm, cabinClimate, setCabinClimate, quietRide, setQuietRide, paymentMethod, setPaymentMethod, bookingLoading, setBookingLoading, activeBooking, setActiveBooking, assignedDriver, setAssignedDriver, pendingSearchBooking, setPendingSearchBooking, chatModalVisible, setChatModalVisible, unreadChatCount, setUnreadChatCount, ratingModalVisible, setRatingModalVisible, profileModalVisible, setProfileModalVisible, guardianModalVisible, setGuardianModalVisible, guardianContact, setGuardianContact, sosAlertActive, setSosAlertActive, activeTab, setActiveTab, historyModalVisible, setHistoryModalVisible, amenitiesModalVisible, setAmenitiesModalVisible, walletBalance, setWalletBalance, walletModalVisible, setWalletModalVisible, scheduleModalVisible, setScheduleModalVisible, scheduledDate, setScheduledDate, talkToOrangeVisible, setTalkToOrangeVisible, intermediateStop, setIntermediateStop, searchTarget, setSearchTarget, promoInput, setPromoInput, appliedPromo, setAppliedPromo, promoError, setPromoError, inAppNotification, setInAppNotification, savedHomeAddress, setSavedHomeAddress, savedWorkAddress, setSavedWorkAddress, theme, setTheme, handleToggleTheme, bookingStatusRef, pickupCoordsRef, dropLocationRef, lastDriverLocRef, surgeMultiplier, checkActiveRide, initApp, refreshLocation, handleSelectCity, handleHomeMapPress, rawDist, distKm, durationMin, baseFare, perKm, minFare, distanceFare, stopFare, preTax, taxAmount, platformFee, calculatedPreDiscount, discountAmount, totalEstimatedFare, PROMO_CODES, handleApplyPromo, currentResumableBooking, activeScheduledBooking, rateNowBooking, dispatchStatus, setDispatchStatus, handlePinRegionChange, handleConfirmPinPicker, handleConfirmBooking, executeBookingSubmission, handleQuickHome, handleQuickWork, handleQuickAirport, handleRepeatTrip, handleCancelRide, handleAuthSubmit, handleSignOut, popularHubs, resolvedVehicle, driverDistM, driverEtaMin, inProgressDistM, inProgressDistKm } = context;
  const { height } = Dimensions.get('window');
  const step: number = 2;
  
  // replace setStep logic with navigation
  const originalSetStep = context.setStep;
  const setStep = (newStep: number) => {
    originalSetStep(newStep);
    if (newStep === 1) navigation.navigate('Home');
    if (newStep === 2) navigation.navigate('Booking');
    if (newStep === 4) navigation.navigate('ActiveRide');
  };

  return (
    <View style={[styles.container, theme === 'dark' && styles.containerDark]}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />

        {/* SOS ACTIVE PERSISTENT BANNER */}
        {sosAlertActive && (
          <TouchableOpacity
            style={{
              backgroundColor: '#EF4444',
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 999,
            }}
            onPress={() => setSosAlertActive(false)}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
              🚨 SOS Active — Emergency contacts notified
            </Text>
            <Text style={{ color: '#fff', fontSize: 12 }}>Dismiss</Text>
          </TouchableOpacity>
        )}

        {/* IN-APP REALTIME DRIVER NOTIFICATION BANNER */}
        {inAppNotification && (
          <TouchableOpacity
            style={[
              styles.floatingNotificationBanner,
              inAppNotification.type === 'arrived' && styles.notifBannerArrived,
              inAppNotification.type === 'assigned' && styles.notifBannerAssigned,
              inAppNotification.type === 'completed' && styles.notifBannerCompleted,
              { top: topSafeOffset + 4 },
            ]}
            activeOpacity={0.9}
            onPress={() => setInAppNotification(null)}
          >
            <View style={styles.notifIconWrap}>
              {inAppNotification.type === 'arrived' ? (
                <MapPin size={17} color="#FFFFFF" />
              ) : inAppNotification.type === 'completed' ? (
                <CheckCircle size={17} color="#FFFFFF" />
              ) : (
                <Car size={17} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.notifBannerTitle}>{inAppNotification.title}</Text>
              <Text style={styles.notifBannerMessage}>{inAppNotification.message}</Text>
            </View>
            <TouchableOpacity onPress={() => setInAppNotification(null)} style={{ padding: 4 }}>
              <X size={15} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {pinPickerActive ? null : step === 1 ? (
          /* STEP 1: FLOATING ISLAND HEADER */
          <View style={[styles.floatingIslandHeader, { top: topSafeOffset }]}>
            {/* User Profile Avatar Circle */}
            <TouchableOpacity
              accessibilityLabel="Profile"
              accessibilityRole="button"
              style={[styles.floatingAvatarBtn, theme === 'dark' && styles.floatingAvatarBtnDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                setProfileModalVisible(true);
              }}
            >
              {user ? (
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarChar}>
                    {(user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                </View>
              ) : (
                <UserIcon size={19} color={theme === 'dark' ? '#F8FAFC' : '#18181B'} />
              )}
            </TouchableOpacity>

            {/* Floating Wallet Pill */}
            <TouchableOpacity
              accessibilityLabel="Wallet"
              accessibilityRole="button"
              style={[styles.floatingWalletPill, theme === 'dark' && styles.floatingWalletPillDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                setWalletModalVisible(true);
              }}
            >
              <CreditCard size={15} color={theme === 'dark' ? '#F97316' : '#18181B'} />
              <Text style={[styles.floatingWalletText, theme === 'dark' && styles.textWhite]}>₹ {walletBalance}</Text>
            </TouchableOpacity>

            {/* Right Action Cluster: Theme Switcher & City Selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Quick Theme Switcher Button (☀️ Light Default / 🌙 Dark Mode) */}
              <TouchableOpacity
                style={[styles.floatingThemeBtn, theme === 'dark' && styles.floatingThemeBtnDark]}
                activeOpacity={0.85}
                onPress={() => handleToggleTheme()}
                accessibilityLabel={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun size={17} color="#F97316" />
                ) : (
                  <Moon size={17} color="#475569" />
                )}
              </TouchableOpacity>

              {/* City Switcher Circular Button */}
              <TouchableOpacity
                accessibilityLabel="Select City"
                accessibilityRole="button"
                style={[styles.floatingCityBtn, theme === 'dark' && styles.floatingCityBtnDark]}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCityPickerVisible(!cityPickerVisible);
                }}
              >
                <MapPin size={18} color="#F97316" />
              </TouchableOpacity>
            </View>

            {/* Floating City Dropdown Menu */}
            {cityPickerVisible && (
              <View style={[styles.floatingCityMenu, theme === 'dark' && styles.floatingCityMenuDark]}>
                <Text style={[styles.cityMenuHeader, theme === 'dark' && styles.textMutedDark]}>SELECT CITY</Text>
                {(['Delhi NCR', 'Bengaluru', 'Mumbai', 'Hyderabad'] as const).map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityMenuItem, activeCity === city && styles.cityMenuItemActive]}
                    onPress={() => {
                      handleSelectCity(city);
                      setCityPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.cityMenuItemText, activeCity === city && styles.cityMenuItemTextActive]}>
                      {city}
                    </Text>
                    {activeCity === city && <Check size={14} color="#F97316" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : step === 4 ? (
          /* STEP 4: FLOATING ARRIVING / IN-PROGRESS HEADER */
          <View style={[styles.arrivingTopHeader, theme === 'dark' && styles.arrivingTopHeaderDark, { top: topSafeOffset }]}>
            <TouchableOpacity
              style={[styles.arrivingBackBtn, theme === 'dark' && styles.arrivingBackBtnDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (activeBooking) {
                  setPendingSearchBooking(activeBooking);
                }
                setStep(1);
              }}
            >
              <ArrowLeft size={18} color={theme === 'dark' ? '#F8FAFC' : '#18181B'} />
            </TouchableOpacity>

            <Text style={[styles.arrivingHeaderTitle, theme === 'dark' && styles.textWhite]}>
              {activeBooking?.status === 'in_progress'
                ? 'Ride in Progress'
                : activeBooking?.status === 'arrived'
                ? 'Chauffeur Arrived'
                : activeBooking?.status === 'accepted'
                ? 'Arriving'
                : 'Connecting'}
            </Text>

            <TouchableOpacity
              style={[styles.arrivingShieldBtn, theme === 'dark' && styles.arrivingShieldBtnDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setGuardianModalVisible(true);
              }}
            >
              <ShieldCheck size={18} color="#10B981" />
            </TouchableOpacity>
          </View>
        ) : step === 2 ? (
          /* STEP 2: MINIMAL VEHICLE SELECTION FLOATING HEADER (SAFELY BELOW DYNAMIC ISLAND) */
          <View style={[styles.step2FloatingHeader, { top: topSafeOffset }]}>
            <TouchableOpacity
              style={[styles.step2BackCircleBtn, theme === 'dark' && styles.step2BackCircleBtnDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep(1);
              }}
            >
              <ArrowLeft size={19} color={theme === 'dark' ? '#F8FAFC' : '#18181B'} />
            </TouchableOpacity>

            <View style={[styles.step2HeaderPill, theme === 'dark' && styles.step2HeaderPillDark]}>
              <View style={styles.step2PillIndicator} />
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.step2HeaderPillTitle, theme === 'dark' && styles.textWhite]}>
                  {distKm ? `${distKm} km${intermediateStop ? ' (1 stop)' : ''} · ~${durationMin} min` : 'Select Ride'}
                </Text>
                <Text style={styles.step2HeaderPillSub}>100% Zero-Emission EV</Text>
              </View>
            </View>

            <View style={{ width: 44 }} />
          </View>
        ) : null}

        {/* ================================================================= */}
        {/* VIEW ROUTER                                                       */}
        {/* ================================================================= */}
        {loading ? (
          <View style={[styles.centerLoading, theme === 'dark' && styles.containerDark]}>
            <ActivityIndicator size="large" color="#F56B00" />
            <Text style={[styles.loadingText, theme === 'dark' && styles.textMutedDark]}>Initializing Orange Electric Fleet...</Text>
          </View>
        ) : pinPickerActive ? (
          /* =============================================================== */
          /* PIN PICKER MODE ("SET ON MAP")                                  */
          /* =============================================================== */
          <View style={[styles.pinPickerContainer, theme === 'dark' && styles.containerDark]}>
            <View style={[styles.pinPickerHeader, theme === 'dark' && styles.pinPickerHeaderDark, { paddingTop: topSafeOffset, paddingBottom: 12 }]}>
              <TouchableOpacity
                style={[styles.pinPickerBackBtn, theme === 'dark' && styles.pinPickerBackBtnDark]}
                onPress={() => {
                  setPinPickerActive(false);
                  if (isBookingPinConfirm) {
                    setIsBookingPinConfirm(false);
                  }
                }}
              >
                <ArrowLeft size={20} color={theme === 'dark' ? '#F8FAFC' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={[styles.pinPickerTitle, theme === 'dark' && styles.textWhite]}>
                {isBookingPinConfirm
                  ? 'Confirm Exact Pickup Spot'
                  : pinPickerTarget === 'pickup'
                  ? 'Set Pickup Location'
                  : 'Set Destination'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Instruction Banner if booking pin confirm */}
            {isBookingPinConfirm && (
              <View style={styles.pinDropHintBanner}>
                <Sparkles size={14} color="#F97316" />
                <Text style={styles.pinDropHintText}>
                  Move map to drop pin at your exact gate or curb
                </Text>
              </View>
            )}

            {/* Full Screen Map with fixed Center Pin */}
            <View style={{ flex: 1 }}>
              <RideMap
                pickup={pinCurrentCoords}
                interactive={true}
                height="100%"
                isPinPickerMode={true}
                pinPickerTarget={pinPickerTarget}
                onPinLocationChange={handlePinRegionChange}
                theme={theme}
              />
            </View>

            {/* Bottom Confirmation Card */}
            <View style={[styles.pinPickerBottomCard, theme === 'dark' && styles.pinPickerBottomCardDark]}>
              <View style={styles.pinAddressRow}>
                <MapPin size={18} color="#F97316" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.pinAddressMicro, theme === 'dark' && styles.textMutedDark]}>
                    {isBookingPinConfirm ? 'EXACT PICKUP SPOT' : 'PINPOINTED LOCATION'}
                  </Text>
                  <Text style={[styles.pinAddressText, theme === 'dark' && styles.textWhite]} numberOfLines={2}>
                    {pinAddressText}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.pinConfirmBtn}
                disabled={bookingLoading}
                onPress={handleConfirmPinPicker}
              >
                {bookingLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.pinConfirmText}>
                      {isBookingPinConfirm
                        ? `Confirm Pickup & Book · ₹${totalEstimatedFare}`
                        : 'Confirm Location'}
                    </Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : step === 4 && activeBooking ? (
          /* =============================================================== */
          /* STEP 4: ACTIVE RIDE, LIVE GPS & REAL-TIME DRIVER STATUS         */
          /* =============================================================== */
          <View style={{ flex: 1, position: 'relative' }}>
            {/* Live Interactive Map Tracking */}
            <View style={StyleSheet.absoluteFill}>
              <RideMap
                pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, name: activeBooking.pickup_area }}
                drop={{
                  lat: dropLocation?.lat ?? (activeBooking.drop_address && activeBooking.drop_address.includes(',') ? Number(activeBooking.drop_address.split(',')[0]) : pickupCoords.lat),
                  lng: dropLocation?.lng ?? (activeBooking.drop_address && activeBooking.drop_address.includes(',') ? Number(activeBooking.drop_address.split(',')[1]) : pickupCoords.lng),
                  name: activeBooking.drop_area,
                }}
                driverLocation={
                  assignedDriver?.current_lat && assignedDriver?.current_lng
                    ? { lat: assignedDriver.current_lat, lng: assignedDriver.current_lng }
                    : null
                }
                status={activeBooking.status}
                height="100%"
                routeDistanceKm={activeBooking.distance_km}
                routeDurationMin={activeBooking.duration_min}
                theme={theme}
              />
            </View>

            {/* Floating Minimal Arriving HUD Card (Option B) */}
            <View style={[styles.floatingArrivingCard, theme === 'dark' && styles.floatingArrivingCardDark]}>
              {/* Header: Title + ETA badge */}
              <View style={styles.arrivingCardHeader}>
                <View>
                  <Text style={[styles.arrivingTitleText, theme === 'dark' && styles.textWhite]}>
                    {activeBooking.status === 'scheduled'
                      ? 'Ride Scheduled'
                      : activeBooking.status === 'in_progress'
                      ? 'In Progress'
                      : activeBooking.status === 'arrived'
                      ? 'Arrived'
                      : activeBooking.status === 'accepted'
                      ? 'Arriving'
                      : 'Connecting'}
                  </Text>
                  <Text style={[styles.arrivingSubSubtitle, theme === 'dark' && styles.textMutedDark]}>
                    {activeBooking.status === 'scheduled'
                      ? activeBooking.scheduled_at
                        ? `Pickup on ${formatScheduleShort(new Date(activeBooking.scheduled_at))}`
                        : 'Chauffeur reserved for scheduled departure'
                      : activeBooking.status === 'in_progress'
                      ? 'Cruising safely to destination'
                      : activeBooking.status === 'arrived'
                      ? 'Chauffeur waiting at pickup'
                      : activeBooking.status === 'accepted'
                      ? 'Chauffeur en route to pickup'
                      : 'Locating closest verified electric cab'}
                  </Text>
                </View>

                <View style={styles.arrivingEtaBadge}>
                  <Text style={styles.arrivingEtaText}>
                    {activeBooking.status === 'scheduled'
                      ? '📅 Confirmed'
                      : activeBooking.status === 'in_progress'
                      ? `⚡ ${inProgressDistKm} km`
                      : activeBooking.status === 'accepted'
                      ? driverDistM !== null && driverDistM < 100
                        ? 'Arriving'
                        : `${driverEtaMin} min`
                      : '⚡ Active'}
                  </Text>
                </View>
              </View>

              {/* Chauffeur & Vehicle Profile Row */}
              {activeBooking.status === 'scheduled' ? (
                <View style={[styles.scheduledHudBox, theme === 'dark' && styles.scheduledHudBoxDark]}>
                  <View style={styles.scheduledHudIconRow}>
                    <Calendar size={16} color="#7C3AED" />
                    <Text style={[styles.scheduledHudDateText, theme === 'dark' && styles.textWhite]}>
                      {activeBooking.scheduled_at
                        ? formatScheduleDate(new Date(activeBooking.scheduled_at))
                        : 'Scheduled Ride'}
                    </Text>
                  </View>
                  <Text style={[styles.scheduledHudSubText, theme === 'dark' && styles.textMutedDark]}>
                    Zero surge guarantee locked. Chauffeur assigned 30 mins before pickup with pre-cooled AC.
                  </Text>
                </View>
              ) : activeBooking.status === 'searching' ? (
                <View style={styles.searchingFleetRow}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={styles.searchingFleetText}>
                    Broadcasting to nearby Orange EV Chauffeurs...
                  </Text>
                </View>
              ) : (
                <View style={styles.driverProfileMinimalRow}>
                  {/* Driver Avatar */}
                  <View style={[styles.driverAvatarCircle, theme === 'dark' && styles.driverAvatarCircleDark]}>
                    <Text style={styles.driverAvatarLetter}>
                      {resolvedVehicle.chauffeurName.charAt(0) || 'D'}
                    </Text>
                  </View>

                  {/* Driver & Car Meta */}
                  <View style={styles.driverMetaCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.driverNameTitle, theme === 'dark' && styles.textWhite]} numberOfLines={1}>
                        {resolvedVehicle.chauffeurName}
                      </Text>
                      {resolvedVehicle.isPartner && (
                        <View style={styles.partnerPill}>
                          <Text style={styles.partnerPillText}>Partner</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.vehicleModelSub, theme === 'dark' && styles.textMutedDark]} numberOfLines={1}>
                      {resolvedVehicle.modelName} · 100% EV
                    </Text>
                  </View>

                  {/* Rating & Number Plate Pills */}
                  <View style={styles.driverPillsRow}>
                    <View style={styles.ratingPillYellow}>
                      <Text style={styles.ratingPillText}>★ {resolvedVehicle.rating}</Text>
                    </View>
                    <View style={styles.platePillMono}>
                      <Text style={styles.platePillText}>{resolvedVehicle.plateNumber}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Circular Tactile Action Buttons Row (Mockup: Cancel, Chat, Call) */}
              <View style={styles.circularActionsRow}>
                {/* Circular Cancel Action */}
                {activeBooking.status !== 'in_progress' && activeBooking.status !== 'completed' ? (
                  <TouchableOpacity
                    accessibilityLabel="Cancel Ride"
                    accessibilityRole="button"
                    style={[styles.circularActionCancel, theme === 'dark' && styles.circularActionCancelDark]}
                    activeOpacity={0.8}
                    onPress={handleCancelRide}
                  >
                    <X size={20} color="#64748B" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    accessibilityLabel="Cancel Ride"
                    accessibilityRole="button"
                    style={[styles.circularActionCancel, { backgroundColor: '#ECFDF5' }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      Alert.alert('Trip Information', `Booking: ${activeBooking.reference}\nFare: ₹${activeBooking.estimated_fare}\nDestination: ${activeBooking.drop_area}`);
                    }}
                  >
                    <Check size={20} color="#10B981" />
                  </TouchableOpacity>
                )}

                {/* Circular In-Ride Chat Action */}
                <TouchableOpacity
                  style={styles.circularActionChat}
                  accessibilityLabel="Chat with Driver"
                  accessibilityRole="button"
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setUnreadChatCount(0);
                    setChatModalVisible(true);
                  }}
                >
                  <MessageSquare size={20} color="#FFFFFF" />
                  {unreadChatCount > 0 && (
                    <View style={styles.chatBadgeAbsolute}>
                      <Text style={styles.chatBadgeText}>{unreadChatCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Circular Call Action */}
                <TouchableOpacity
                  style={styles.circularActionCall}
                  accessibilityLabel="Call Driver"
                  accessibilityRole="button"
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (resolvedVehicle.phone) {
                      Linking.openURL(`tel:${resolvedVehicle.phone}`);
                    } else {
                      Linking.openURL('tel:1800123456');
                    }
                  }}
                >
                  <Phone size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Ride Start OTP Pill (Revealed only after driver accepts) */}
              {activeBooking.status === 'in_progress' ? (
                <View style={styles.inProgressPillBar}>
                  <CheckCircle size={15} color="#10B981" />
                  <Text style={styles.inProgressPillText}>OTP Verified · Fare ₹{activeBooking.estimated_fare}</Text>
                </View>
              ) : (activeBooking.status === 'accepted' || activeBooking.status === 'arrived') && activeBooking.ride_otp ? (
                <View style={styles.otpPillBar}>
                  <Text style={styles.otpPillLabel}>START OTP</Text>
                  <Text style={styles.otpPillCode}>{activeBooking.ride_otp}</Text>
                  <Text style={styles.otpPillSub}>Share with chauffeur to start trip</Text>
                </View>
              ) : activeBooking.status === 'searching' ? (
                <View style={styles.searchingOtpBar}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={styles.searchingOtpText}>
                    Searching nearby chauffeurs · OTP will reveal once ride is accepted
                  </Text>
                </View>
              ) : null}

              {/* Onboard Amenities Tray */}
              <TouchableOpacity
                style={styles.onboardAmenitiesBar}
                accessibilityLabel="View Amenities"
                accessibilityRole="button"
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.selectionAsync();
                  setAmenitiesModalVisible(true);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Sparkles size={13} color="#F97316" />
                  <Text style={styles.onboardAmenitiesText} numberOfLines={1}>
                    Onboard: Chilled Water · In-Seat Screen · Dailies
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={styles.onboardAmenitiesViewText}>Perks</Text>
                  <ChevronRight size={12} color="#F97316" />
                </View>
              </TouchableOpacity>

              {/* Safety & SOS Strip */}
              <View style={styles.safetyStripRow}>
                <TouchableOpacity
                  style={styles.safetyStripBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setGuardianModalVisible(true);
                  }}
                >
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={styles.safetyStripText}>Orange Guardian Active</Text>
                </TouchableOpacity>
                <Text style={styles.bookingRefMicro}>Ref: {activeBooking.reference}</Text>
              </View>
            </View>
          </View>
        ) : step === 2 ? (
          /* =============================================================== */
          /* STEP 2: RIDE SELECTION & ROUTE REVIEW (FULL SCREEN MAP + SHEET) */
          /* =============================================================== */
          <View style={{ flex: 1, position: 'relative' }}>
            {/* Full Screen Background Route Map */}
            <View style={StyleSheet.absoluteFill}>
              <RideMap
                pickup={{ lat: pickupCoords.lat, lng: pickupCoords.lng, name: pickupText }}
                drop={dropLocation ? { lat: dropLocation.lat, lng: dropLocation.lng, name: dropLocation.name } : undefined}
                waypoint={intermediateStop ? { lat: intermediateStop.lat, lng: intermediateStop.lng, name: intermediateStop.name } : null}
                interactive={true}
                height="100%"
                routeDistanceKm={distKm}
                routeDurationMin={durationMin}
                theme={theme}
                showRoutePill={false}
                edgePadding={{ top: topSafeOffset + 60, right: 60, bottom: height * 0.54, left: 60 }}
              />
            </View>

            {/* Bottom Swipeable Booking Sheet Floating Over Map */}
            <View style={[styles.sheetContainer, theme === 'dark' && styles.sheetContainerDark]}>
              <View style={styles.sheetHandleBox}>
                <View style={[styles.sheetHandle, theme === 'dark' && styles.sheetHandleDark]} />
              </View>

              <ScrollView
                style={[styles.sheetScroll, theme === 'dark' && styles.sheetScrollDark]}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
                showsVerticalScrollIndicator={false}
              >
              {/* Pickup -> Destination Bar (Tap to re-edit anytime) */}
              <TouchableOpacity
                style={[styles.sheetRouteBar, theme === 'dark' && styles.sheetRouteBarDark]}
                onPress={() => setSearchModalVisible(true)}
              >
                <View style={styles.sheetRouteVisual}>
                  <View style={styles.sheetGreenDot} />
                  <View style={styles.sheetLine} />
                  {intermediateStop && (
                    <>
                      <View style={styles.sheetStopDot} />
                      <View style={styles.sheetLine} />
                    </>
                  )}
                  <View style={styles.sheetOrangeDot} />
                </View>
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <Text style={styles.sheetRoutePickup} numberOfLines={1}>
                    {pickupText}
                  </Text>
                  {intermediateStop && (
                    <Text style={styles.sheetRouteStop} numberOfLines={1}>
                      📍 Stop 1: {intermediateStop.name}
                    </Text>
                  )}
                  <Text style={[styles.sheetRouteDrop, theme === 'dark' && styles.textWhite]} numberOfLines={1}>
                    {dropLocation ? dropLocation.name : 'Select drop-off destination'}
                  </Text>
                </View>
                <View style={[styles.sheetEditBtn, theme === 'dark' && styles.sheetEditBtnDark]}>
                  <Text style={styles.sheetEditText}>Edit</Text>
                </View>
              </TouchableOpacity>

              {/* Optional Airport / Metro Pickup Gate Note */}
              <View style={[styles.gateNoteBox, theme === 'dark' && styles.gateNoteBoxDark]}>
                <TextInput
                  style={[styles.gateNoteInput, theme === 'dark' && styles.textWhite]}
                  placeholder="Pillar / Gate / Landmark (e.g. Pillar 3, Gate 4)"
                  placeholderTextColor={theme === 'dark' ? '#64748B' : '#94A3B8'}
                  value={pickupPillar}
                  onChangeText={setPickupPillar}
                />
              </View>

              {/* VEHICLE FLEET SELECTION LIST */}
              <Text style={[styles.sheetSectionTitle, theme === 'dark' && styles.textMutedDark]}>CHOOSE YOUR ELECTRIC RIDE</Text>
              <View style={styles.sheetFleetList}>
                {vehicles.map((v: any) => {
                  const isSel = selectedVehicle?.code === v.code;
                  // Dynamic live price calculation for each vehicle
                  const vBase = v.base_fare;
                  const vPerKm = v.per_km;
                  const vMin = v.minimum_fare;
                  const vPreTax = Math.max(vMin, vBase + Math.round(vPerKm * distKm));
                  const vTotal = Math.round(vPreTax * 1.05);

                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.sheetFleetCard,
                        isSel && styles.sheetFleetCardActive,
                        theme === 'dark' && (isSel ? styles.sheetFleetCardActiveDark : styles.sheetFleetCardDark),
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedVehicle(v);
                      }}
                    >
                      <View style={[styles.sheetFleetIconBox, theme === 'dark' && styles.sheetFleetIconBoxDark]}>
                        <Car size={22} color={isSel ? '#F56B00' : '#CBD5E1'} />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.sheetFleetName, theme === 'dark' && styles.textWhite]}>{v.name}</Text>
                          <View style={styles.sheetSeatsPill}>
                            <Text style={styles.sheetSeatsText}>{v.seats} Seats</Text>
                          </View>
                        </View>
                        <Text style={[styles.sheetFleetTagline, theme === 'dark' && styles.textMutedDark]} numberOfLines={1}>
                          {v.tagline || (v.code === 'ORANGE_SEDAN' ? 'Mahindra BE.6 Luxury EV' : v.code === 'ORANGE_XL' ? '6-Seater Electric SUV' : 'Tata Tiago Smart EV')}
                        </Text>
                        <Text style={styles.sheetFleetEta}>
                          {v.code === 'ORANGE_SEDAN' ? '⚡ 3 min away · Most Popular' : '⚡ 4-5 min away'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.sheetFleetFare, theme === 'dark' && styles.textWhite]}>₹{vTotal}</Text>
                        <Text style={styles.sheetFleetPerKm}>₹{v.per_km}/km</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* INCLUDED IN-CAB AMENITIES CARD */}
              <TouchableOpacity
                style={[styles.step2AmenitiesCard, theme === 'dark' && styles.step2AmenitiesCardDark]}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAmenitiesModalVisible(true);
                }}
              >
                <View style={styles.step2AmenitiesHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#F97316" />
                    <Text style={[styles.step2AmenitiesTitle, theme === 'dark' && styles.textWhite]}>Included With Your {selectedVehicle?.name || 'Ride'}</Text>
                  </View>
                  <View style={styles.freeTagBadge}>
                    <Text style={styles.freeTagBadgeText}>100% INCLUDED</Text>
                  </View>
                </View>

                <View style={styles.step2AmenitiesGrid}>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>📺</Text>
                    <Text style={[styles.step2AmenityText, theme === 'dark' && styles.textMutedDark]}>In-Seat Screen</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>🎵</Text>
                    <Text style={[styles.step2AmenityText, theme === 'dark' && styles.textMutedDark]}>Studio Audio</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>💧</Text>
                    <Text style={[styles.step2AmenityText, theme === 'dark' && styles.textMutedDark]}>Bottled Water</Text>
                  </View>
                  <View style={styles.step2AmenityItem}>
                    <Text style={styles.step2AmenityEmoji}>📰</Text>
                    <Text style={[styles.step2AmenityText, theme === 'dark' && styles.textMutedDark]}>Daily Papers</Text>
                  </View>
                </View>

                <View style={styles.step2AmenitiesFooter}>
                  <Text style={[styles.step2AmenitiesFooterText, theme === 'dark' && styles.textMutedDark]}>Pre-cooled AC · Clean EV · Zero surge guarantee</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={styles.step2AmenitiesDetailsLink}>Details</Text>
                    <ChevronRight size={12} color="#F97316" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* DEPARTURE TIME: RIDE NOW OR SCHEDULE */}
              <View style={[styles.departureCard, theme === 'dark' && styles.departureCardDark]}>
                <View style={styles.departureHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color="#F97316" />
                    <Text style={[styles.departureTitle, theme === 'dark' && styles.textWhite]}>
                      DEPARTURE TIME
                    </Text>
                  </View>
                  {scheduledDate && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        setScheduledDate(null);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.departureResetText}>Switch to Now</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.departureToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.departureToggleBtn,
                      !scheduledDate && styles.departureToggleBtnActive,
                      theme === 'dark' && styles.departureToggleBtnDark,
                      !scheduledDate && theme === 'dark' && styles.departureToggleBtnActiveDark,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setScheduledDate(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.departureToggleText,
                        !scheduledDate && styles.departureToggleTextActive,
                        theme === 'dark' && !scheduledDate && styles.textWhite,
                      ]}
                    >
                      ⚡ Ride Now
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.departureToggleBtn,
                      scheduledDate && styles.departureToggleBtnActive,
                      theme === 'dark' && styles.departureToggleBtnDark,
                      scheduledDate && theme === 'dark' && styles.departureToggleBtnActiveDark,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setScheduleModalVisible(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.departureToggleText,
                        scheduledDate && styles.departureToggleTextActive,
                        theme === 'dark' && scheduledDate && styles.textWhite,
                      ]}
                      numberOfLines={1}
                    >
                      📅 {scheduledDate ? formatScheduleShort(scheduledDate) : 'Schedule for Later'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {scheduledDate && (
                  <View style={styles.scheduledBannerInfo}>
                    <Sparkles size={12} color="#F97316" />
                    <Text style={[styles.scheduledBannerInfoText, theme === 'dark' && styles.textMutedDark]}>
                      Zero surge locked · Chauffeur arrives 10 mins early with pre-cooled AC
                    </Text>
                  </View>
                )}
              </View>

              {/* SIGNATURE HOSPITALITY PREFERENCES */}
              <View style={[styles.sheetHospitalityCard, theme === 'dark' && styles.sheetHospitalityCardDark]}>
                <Text style={[styles.sheetHospitalityTitle, theme === 'dark' && styles.textWhite]}>SIGNATURE COMFORT</Text>

                <View style={styles.climateRow}>
                  {[
                    { id: 'chilled', label: 'Chilled (19°C)' },
                    { id: 'pleasant', label: 'Pleasant (22°C)' },
                    { id: 'eco', label: 'Eco AC (24°C)' },
                  ].map(({ id, label }) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.climateChip,
                        cabinClimate === id && styles.climateChipActive,
                        theme === 'dark' && styles.climateChipDark,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCabinClimate(id as any);
                      }}
                    >
                      <Snowflake size={12} color={cabinClimate === id ? '#F56B00' : '#9CA3AF'} />
                      <Text style={[styles.climateChipText, cabinClimate === id && styles.climateChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quiet Mode Toggle */}
                <TouchableOpacity
                  style={[styles.quietToggle, quietRide && styles.quietToggleActive, theme === 'dark' && styles.quietToggleDark]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setQuietRide(!quietRide);
                  }}
                >
                  <VolumeX size={16} color={quietRide ? '#F56B00' : '#9CA3AF'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.quietToggleTitle, quietRide && styles.quietToggleTitleActive, theme === 'dark' && styles.textWhite]}>
                      Quiet Ride Mode
                    </Text>
                    <Text style={[styles.quietToggleSub, theme === 'dark' && styles.textMutedDark]}>Chauffeur will keep conversation minimal</Text>
                  </View>
                  <View style={[styles.quietCheckbox, quietRide && styles.quietCheckboxActive]}>
                    {quietRide && <Check size={10} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              </View>

              {/* ZERO SURGE GUARANTEE CARD */}
              <View style={[styles.surgeFreeCard, theme === 'dark' && styles.surgeFreeCardDark]}>
                <View style={styles.surgeFreeIconBadge}>
                  <ShieldCheck size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.surgeFreeTitle, theme === 'dark' && styles.textWhite]}>
                      Zero Surge Guarantee
                    </Text>
                    <View style={styles.surgeFreePill}>
                      <Text style={styles.surgeFreePillText}>0% SURGE</Text>
                    </View>
                  </View>
                  <Text style={[styles.surgeFreeSub, theme === 'dark' && styles.textMutedDark]}>
                    Fare is 100% locked. Zero peak surge, rain multiplier, or cancellation fee guaranteed by Orange EV fleet.
                  </Text>
                </View>
              </View>

              {/* PROMO CODE & OFFERS CARD */}
              <View style={[styles.promoCard, theme === 'dark' && styles.promoCardDark]}>
                <View style={styles.promoHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#F97316" />
                    <Text style={[styles.promoTitle, theme === 'dark' && styles.textWhite]}>
                      PROMO CODE & OFFERS
                    </Text>
                  </View>
                  {appliedPromo && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        setAppliedPromo(null);
                        setPromoInput('');
                        setPromoError(null);
                      }}
                    >
                      <Text style={styles.promoRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {appliedPromo ? (
                  <View style={styles.appliedPromoBanner}>
                    <CheckCircle size={15} color="#10B981" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.appliedPromoCodeText}>{appliedPromo.code} APPLIED (-₹{appliedPromo.discount})</Text>
                      <Text style={styles.appliedPromoDescText}>{appliedPromo.description}</Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.promoInputRow}>
                      <TextInput
                        style={[styles.promoInput, theme === 'dark' && styles.promoInputDark, theme === 'dark' && styles.textWhite]}
                        placeholder="Enter promo code (e.g. ORANGE50)"
                        placeholderTextColor={theme === 'dark' ? '#64748B' : '#94A3B8'}
                        value={promoInput}
                        onChangeText={(t) => {
                          setPromoInput(t.toUpperCase());
                          setPromoError(null);
                        }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={[styles.promoApplyBtn, !promoInput.trim() && styles.promoApplyBtnDisabled]}
                        disabled={!promoInput.trim()}
                        onPress={handleApplyPromo}
                      >
                        <Text style={styles.promoApplyText}>Apply</Text>
                      </TouchableOpacity>
                    </View>

                    {promoError && (
                      <Text style={styles.promoErrorText}>{promoError}</Text>
                    )}

                    {/* Quick Promo Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromosScroll}>
                      {['ORANGE50', 'FIRST100', 'BE6VIP', 'ELECTRIC'].map((code) => (
                        <TouchableOpacity
                          key={code}
                          style={[styles.quickPromoChip, theme === 'dark' && styles.quickPromoChipDark]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPromoInput(code);
                            setPromoError(null);
                          }}
                        >
                          <Text style={[styles.quickPromoChipText, theme === 'dark' && styles.textWhite]}>{code}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </View>

              {/* PAYMENT METHOD SELECTOR */}
              <View style={styles.paymentMethodRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentChip,
                    paymentMethod === 'cash' && styles.paymentChipActive,
                    theme === 'dark' && styles.paymentChipDark,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMethod('cash');
                  }}
                >
                  <Banknote size={16} color={paymentMethod === 'cash' ? '#F56B00' : '#9CA3AF'} />
                  <Text style={[styles.paymentChipText, paymentMethod === 'cash' && styles.paymentChipTextActive]}>
                    Cash
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentChip,
                    paymentMethod === 'upi' && styles.paymentChipActive,
                    theme === 'dark' && styles.paymentChipDark,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMethod('upi');
                  }}
                >
                  <CreditCard size={16} color={paymentMethod === 'upi' ? '#F56B00' : '#9CA3AF'} />
                  <Text style={[styles.paymentChipText, paymentMethod === 'upi' && styles.paymentChipTextActive]}>
                    UPI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentChip,
                    paymentMethod === 'wallet' && styles.paymentChipActive,
                    theme === 'dark' && styles.paymentChipDark,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMethod('wallet');
                  }}
                >
                  <Wallet size={16} color={paymentMethod === 'wallet' ? '#F56B00' : '#9CA3AF'} />
                  <Text style={[styles.paymentChipText, paymentMethod === 'wallet' && styles.paymentChipTextActive]}>
                    Wallet ₹{walletBalance}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CONFIRM & BOOK CTA BUTTON */}
              <View style={styles.bookCtaRow}>
                <TouchableOpacity
                  style={[styles.secondaryBackBtn, theme === 'dark' && styles.secondaryBackBtnDark]}
                  onPress={() => setStep(1)}
                >
                  <ArrowLeft size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bookPrimaryBtn}
                  disabled={bookingLoading}
                  onPress={handleConfirmBooking}
                >
                  {bookingLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.bookPrimaryText}>
                        {scheduledDate
                          ? `Schedule ${selectedVehicle?.name || 'Ride'} · ${formatScheduleShort(scheduledDate)}`
                          : appliedPromo
                          ? `Book ${selectedVehicle?.name || 'Ride'} · ₹${totalEstimatedFare} (Saved ₹${discountAmount})`
                          : `Book ${selectedVehicle?.name || 'Ride'} · ₹${totalEstimatedFare}`}
                      </Text>
                      <ArrowRight size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ height: 36 }} />
            </ScrollView>
          </View>
        </View>
        ) : (
          /* =============================================================== */
          /* STEP 1: UBER / OLA MAP-FIRST HOME SCREEN                        */
          /* =============================================================== */
          <View style={{ flex: 1, position: 'relative' }}>
            {/* Full Screen Interactive Minimalist Map */}
            <View style={StyleSheet.absoluteFill}>
              <RideMap
                pickup={pickupCoords}
                drop={dropLocation ? { lat: dropLocation.lat, lng: dropLocation.lng, name: dropLocation.name } : undefined}
                waypoint={intermediateStop ? { lat: intermediateStop.lat, lng: intermediateStop.lng, name: intermediateStop.name } : null}
                interactive={true}
                height="100%"
                onMapPress={handleHomeMapPress}
                onRecenterPress={() => refreshLocation(activeCity)}
                theme={theme}
              />
            </View>

            {/* Floating Minimal Two-Stop Destination Card (Option B) */}
            <View
              style={[
                styles.minimalDestCard,
                theme === 'dark' && styles.minimalDestCardDark,
                { bottom: Math.max(insets.bottom, 12) + 72 },
              ]}
            >
              {/* ── RATE YOUR LAST RIDE PROMPT ── */}
              {rateNowBooking && (
                <TouchableOpacity
                  style={[styles.rateNowCard, theme === 'dark' && styles.rateNowCardDark]}
                  activeOpacity={0.88}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setRatingModalVisible(true);
                  }}
                >
                  <View style={styles.rateNowLeft}>
                    <View style={styles.rateNowIconBadge}>
                      <Star size={18} color="#F59E0B" fill="#F59E0B" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.rateNowTitle, theme === 'dark' && styles.textWhite]}>
                        Rate Your Last Ride
                      </Text>
                      <Text style={[styles.rateNowSubtitle, theme === 'dark' && styles.textMutedDark]} numberOfLines={1}>
                        How was your ride with {rateNowBooking.driver_name || 'your chauffeur'}?
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rateNowActionBtn}>
                    <Text style={styles.rateNowActionText}>Rate →</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* ── UPCOMING SCHEDULED RIDE BANNER ── */}
              {activeScheduledBooking && (
                <TouchableOpacity
                  style={[styles.scheduledHomeCard, theme === 'dark' && styles.scheduledHomeCardDark]}
                  activeOpacity={0.88}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHistoryModalVisible(true);
                  }}
                >
                  <View style={styles.scheduledHomeLeft}>
                    <View style={styles.scheduledCalendarIconBadge}>
                      <Calendar size={18} color="#9333EA" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.scheduledHomeTitle, theme === 'dark' && styles.textWhite]}>
                          Upcoming Chauffeur
                        </Text>
                        <View style={styles.scheduledBadgePill}>
                          <Text style={styles.scheduledBadgeText}>Guaranteed</Text>
                        </View>
                      </View>
                      <Text style={styles.scheduledHomeTimeText} numberOfLines={1}>
                        {activeScheduledBooking.scheduled_at
                          ? new Date(activeScheduledBooking.scheduled_at).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'Advance Booking'}
                      </Text>
                      <Text
                        style={[styles.scheduledHomeRouteText, theme === 'dark' && styles.textMutedDark]}
                        numberOfLines={1}
                      >
                        {activeScheduledBooking.pickup_area || 'Pickup'} → {activeScheduledBooking.drop_area || 'Destination'}
                      </Text>
                      {dispatchStatus && (
                        <Text style={[
                          styles.scheduledHomeRouteText,
                          { marginTop: 4, fontWeight: '700',
                            color: dispatchStatus.urgency === 'active' ? '#EF4444' : dispatchStatus.urgency === 'soon' ? '#D97706' : '#7C3AED'
                          }
                        ]}>
                          {dispatchStatus.label}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.scheduledHomeActionBtn}>
                    <Text style={styles.scheduledHomeActionText}>Manage →</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* ── ACTIVE / SEARCHING RIDE RESUME BANNER ── */}
              {currentResumableBooking && (
                <TouchableOpacity
                  style={[styles.resumeRideHomeCard, theme === 'dark' && styles.resumeRideHomeCardDark]}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setActiveBooking(currentResumableBooking);
                    setPendingSearchBooking(null);
                    setStep(4);
                  }}
                >
                  <View style={styles.resumeRideLeft}>
                    <View style={styles.resumeRidePulseContainer}>
                      <View style={styles.resumeRidePulseRing} />
                      <View style={styles.resumeRidePulseDot} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.resumeRideTitle, theme === 'dark' && styles.textWhite]}>
                        {currentResumableBooking.status === 'searching'
                          ? 'Searching for EV Chauffeur…'
                          : 'Ride in Progress'}
                      </Text>
                      <Text
                        style={[styles.resumeRideSubtitle, theme === 'dark' && styles.textMutedDark]}
                        numberOfLines={1}
                      >
                        {currentResumableBooking.pickup_area || 'Pickup'} → {currentResumableBooking.drop_area || 'Destination'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resumeRideActionBtn}>
                    <Text style={styles.resumeRideActionText}>
                      {currentResumableBooking.status === 'searching' ? 'Resume Booking →' : 'Track Ride →'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Pickup Row: "Where are you?" */}
              <TouchableOpacity
                style={styles.destStopRow}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchModalVisible(true);
                }}
              >
                <View style={[styles.destOrangeHollowRing, theme === 'dark' && styles.destOrangeHollowRingDark]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.destMicroLabel, theme === 'dark' && styles.textMutedDark]}>Where are you?</Text>
                  <Text style={[styles.destPrimaryAddress, theme === 'dark' && styles.textWhite]} numberOfLines={1}>
                    {pickupText}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.destPinIconBtn, theme === 'dark' && styles.destPinIconBtnDark]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setPinPickerTarget('pickup');
                    setPinCurrentCoords(pickupCoords);
                    setPinAddressText(pickupText);
                    setPinPickerActive(true);
                  }}
                >
                  <MapIcon size={16} color={theme === 'dark' ? '#94A3B8' : '#9CA3AF'} />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Vertical connector line */}
              <View style={[styles.destConnectorLine, theme === 'dark' && styles.destConnectorLineDark]} />

              {/* Intermediate Stop Row (if set) */}
              {intermediateStop && (
                <>
                  <TouchableOpacity
                    style={styles.destStopRow}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSearchTarget('stop');
                      setSearchModalVisible(true);
                    }}
                  >
                    <View style={styles.stopWaypointBox}>
                      <Text style={styles.stopWaypointText}>1</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.destMicroLabel, { color: '#7C3AED' }]}>Stop 1 (Waypoint)</Text>
                      <Text style={[styles.destPrimaryAddress, theme === 'dark' && styles.textWhite]} numberOfLines={1}>
                        {intermediateStop.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        setIntermediateStop(null);
                      }}
                      style={{ padding: 6 }}
                    >
                      <X size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  <View style={[styles.destConnectorLine, theme === 'dark' && styles.destConnectorLineDark]} />
                </>
              )}

              {/* Destination Row: "Where you want to go?" */}
              <TouchableOpacity
                style={styles.destStopRow}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchTarget('drop');
                  setSearchModalVisible(true);
                }}
              >
                <View style={[styles.destCarIconBox, theme === 'dark' && styles.destCarIconBoxDark]}>
                  <Car size={16} color={theme === 'dark' ? '#F97316' : '#18181B'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.destMicroLabel, theme === 'dark' && styles.textMutedDark]}>Drop Off</Text>
                  <Text
                    style={[
                      dropLocation ? styles.destPrimaryAddress : styles.destPlaceholderText,
                      theme === 'dark' && (dropLocation ? styles.textWhite : styles.destPlaceholderTextDark),
                    ]}
                    numberOfLines={1}
                  >
                    {dropLocation ? dropLocation.name : 'Where you want to go?'}
                  </Text>
                </View>

                {/* Schedule Ride Quick Action Button */}
                <TouchableOpacity
                  style={[
                    styles.destScheduleBtn,
                    scheduledDate && styles.destScheduleBtnActive,
                    theme === 'dark' && styles.destScheduleBtnDark,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setScheduleModalVisible(true);
                  }}
                >
                  <Calendar size={13} color={scheduledDate ? '#FFFFFF' : '#F97316'} />
                  <Text
                    style={[
                      styles.destScheduleBtnText,
                      scheduledDate && styles.destScheduleBtnTextActive,
                      theme === 'dark' && !scheduledDate && styles.textWhite,
                    ]}
                    numberOfLines={1}
                  >
                    {scheduledDate ? formatScheduleShort(scheduledDate) : 'Schedule'}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.destSearchCircle, theme === 'dark' && styles.destSearchCircleDark]}>
                  <Search size={15} color="#F97316" />
                </View>
              </TouchableOpacity>

              {/* Quick Filter Chips: Home, Work, Airport, Add Stop */}
              <View style={[styles.minimalChipsRow, theme === 'dark' && styles.minimalChipsRowDark]}>
                <TouchableOpacity
                  style={[styles.minimalChip, intermediateStop && styles.minimalChipActiveStop, theme === 'dark' && styles.minimalChipDark]}
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSearchTarget('stop');
                    setSearchModalVisible(true);
                  }}
                >
                  <Text style={[styles.minimalChipText, intermediateStop && { color: '#7C3AED' }, theme === 'dark' && styles.minimalChipTextDark]} numberOfLines={1}>
                    {intermediateStop ? '📍 Stop 1 Set' : '➕ Add Stop'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.minimalChip, theme === 'dark' && styles.minimalChipDark]}
                  activeOpacity={0.75}
                  onPress={handleQuickHome}
                >
                  <Text style={[styles.minimalChipText, theme === 'dark' && styles.minimalChipTextDark]} numberOfLines={1}>
                    🏠 Home
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.minimalChip, theme === 'dark' && styles.minimalChipDark]}
                  activeOpacity={0.75}
                  onPress={handleQuickWork}
                >
                  <Text style={[styles.minimalChipText, theme === 'dark' && styles.minimalChipTextDark]} numberOfLines={1}>
                    💼 Work
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.minimalChip, theme === 'dark' && styles.minimalChipDark]}
                  activeOpacity={0.75}
                  onPress={handleQuickAirport}
                >
                  <Text style={[styles.minimalChipText, theme === 'dark' && styles.minimalChipTextDark]} numberOfLines={1}>
                    ✈️ Airport
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TALK TO ORANGE CONCIERGE QUICK BAR */}
              <TouchableOpacity
                style={[styles.homeTalkBanner, theme === 'dark' && styles.homeTalkBannerDark]}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTalkToOrangeVisible(true);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
                  <View style={styles.homeTalkIconWrap}>
                    <Sparkles size={14} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.homeTalkTitle, theme === 'dark' && styles.textWhite]}>Talk to Orange</Text>
                      <View style={styles.homeTalkBadge}>
                        <Text style={styles.homeTalkBadgeText}>24x7 AI</Text>
                      </View>
                    </View>
                    <Text style={[styles.homeTalkSub, theme === 'dark' && styles.textMutedDark]} numberOfLines={1}>
                      Ask fares, airport rules, EV features or chat live
                    </Text>
                  </View>
                </View>
                <ChevronRight size={15} color="#F97316" />
              </TouchableOpacity>

              {/* INSIDE EVERY ORANGE - AMENITIES SHOWCASE BANNER */}
              <View style={[styles.homeAmenitiesBanner, theme === 'dark' && styles.homeAmenitiesBannerDark]}>
                <View style={styles.homeAmenitiesHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="#F97316" />
                    <Text style={[styles.homeAmenitiesTitle, theme === 'dark' && styles.textWhite]}>Inside Every Orange Ride</Text>
                  </View>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 2, paddingHorizontal: 4 }}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAmenitiesModalVisible(true);
                    }}
                  >
                    <Text style={styles.homeAmenitiesViewAll}>Perks</Text>
                    <ChevronRight size={13} color="#F97316" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  contentContainerStyle={styles.homeAmenitiesScroll}
                >
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>📺 In-Seat HD Screen</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>🎵 Studio Acoustics</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>💧 Bottled Water</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>📰 Daily Papers</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>❄️ Pre-Cooled AC</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>⚡ BE.6 Luxury EV</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>🔌 Type-C Chargers</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>🛡️ Zero Surge Pricing</Text>
                  </View>
                  <View style={[styles.homeAmenityPill, theme === 'dark' && styles.homeAmenityPillDark]}>
                    <Text style={[styles.homeAmenityPillText, theme === 'dark' && styles.homeAmenityPillTextDark]}>🌿 100% Electric</Text>
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Floating Bottom Navigation Dock with Elevated Taxi FAB (Option B) */}
            <View
              style={[
                styles.floatingNavDock,
                theme === 'dark' && styles.floatingNavDockDark,
                { bottom: Math.max(insets.bottom, 12) },
              ]}
            >
              {/* Home Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('home');
                }}
              >
                <Navigation size={22} color={activeTab === 'home' ? '#F97316' : (theme === 'dark' ? '#64748B' : '#9CA3AF')} />
                {activeTab === 'home' && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>

              {/* History Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('history');
                  setHistoryModalVisible(true);
                }}
              >
                <Clock size={22} color={activeTab === 'history' ? '#F97316' : (theme === 'dark' ? '#64748B' : '#9CA3AF')} />
                {activeTab === 'history' && <View style={styles.activeTabIndicator} />}
                {activeScheduledBooking && activeTab !== 'history' && (
                  <View style={styles.navDockScheduledDot} />
                )}
              </TouchableOpacity>

              {/* Elevated Center Taxi FAB */}
              <TouchableOpacity
                style={[styles.navDockCenterFab, theme === 'dark' && styles.navDockCenterFabDark]}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  if (currentResumableBooking) {
                    setActiveBooking(currentResumableBooking);
                    setPendingSearchBooking(null);
                    setStep(4);
                  } else if (dropLocation && dropLocation.name) {
                    setStep(2);
                  } else {
                    setSearchModalVisible(true);
                  }
                }}
              >
                <Car size={26} color="#FFFFFF" />
                {currentResumableBooking && <View style={styles.navDockActiveDot} />}
              </TouchableOpacity>

              {/* Talk to Orange / Concierge Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('chat');
                  setTalkToOrangeVisible(true);
                }}
              >
                <MessageSquare size={22} color={activeTab === 'chat' ? '#F97316' : (theme === 'dark' ? '#64748B' : '#9CA3AF')} />
                {activeTab === 'chat' && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>

              {/* Settings / Profile Tab */}
              <TouchableOpacity
                style={styles.navDockItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('profile');
                  setProfileModalVisible(true);
                }}
              >
                <UserIcon size={22} color={activeTab === 'profile' ? '#F97316' : (theme === 'dark' ? '#64748B' : '#9CA3AF')} />
                {activeTab === 'profile' && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================================================================= */}
        {/* DEDICATED LOCATION SEARCH MODAL (UBER / OLA STYLE)                */}
        {/* ================================================================= */}
        <LocationSearchModal
          visible={searchModalVisible}
          topInset={insets.top}
          onClose={() => setSearchModalVisible(false)}
          pickupText={pickupText}
          pickupCoords={pickupCoords}
          dropLocation={dropLocation}
          stopLocation={intermediateStop}
          initialTarget={searchTarget}
          onSelectPickup={(loc) => {
            setPickupText(loc.name);
            setPickupCoords({ lat: loc.lat, lng: loc.lng });
          }}
          onSelectDrop={(loc) => {
            setDropLocation(loc);
            setSearchModalVisible(false);
            setStep(2); // Jump directly to ride & vehicle selection
          }}
          onSelectStop={(loc) => {
            setIntermediateStop(loc);
          }}
          onRemoveStop={() => {
            setIntermediateStop(null);
          }}
          onChooseOnMap={(target) => {
            setSearchModalVisible(false);
            setPinPickerTarget(target);
            setPinCurrentCoords(target === 'pickup' ? pickupCoords : (dropLocation ? { lat: dropLocation.lat, lng: dropLocation.lng } : pickupCoords));
            setPinAddressText(target === 'pickup' ? pickupText : (dropLocation?.name || 'Set destination on map'));
            setPinPickerActive(true);
          }}
          onUseCurrentGPS={() => refreshLocation(activeCity)}
          activeCity={activeCity}
          onChangeCity={(c) => {
            if (c !== 'All') {
              setActiveCity(c);
            }
          }}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* IN-RIDE REALTIME CHAT MODAL                                       */}
        {/* ================================================================= */}
        {activeBooking && (
          <InRideChatModal
            visible={chatModalVisible}
            onClose={() => setChatModalVisible(false)}
            bookingId={activeBooking.id}
            bookingReference={activeBooking.reference || activeBooking.id.substring(0, 8)}
            driverName={assignedDriver?.full_name || 'Orange Chauffeur'}
            driverPhone={assignedDriver?.phone}
            customerName={user?.email?.split('@')[0] || 'Passenger'}
            currentUserLocation={pickupCoords}
            driverLocation={
              assignedDriver?.current_lat && assignedDriver?.current_lng
                ? { lat: assignedDriver.current_lat, lng: assignedDriver.current_lng }
                : null
            }
            onUnreadCountChange={(count) => setUnreadChatCount(count)}
          />
        )}

        {/* ================================================================= */}
        {/* POST-TRIP 5-STAR RATING & REVIEW MODAL                            */}
        {/* ================================================================= */}
        {activeBooking && (
          <RatingModal
            visible={ratingModalVisible}
            bookingId={activeBooking.id}
            driverId={assignedDriver?.id || activeBooking.driver_id}
            driverName={resolvedVehicle.chauffeurName}
            vehicleName={`${resolvedVehicle.modelName} (${resolvedVehicle.plateNumber})`}
            onRatingSubmitted={(newRating, totalRides) => {
              if (assignedDriver) {
                setAssignedDriver({
                  ...assignedDriver,
                  rating: newRating,
                  total_rides: totalRides,
                });
              }
            }}
            onDismiss={() => {
              setRatingModalVisible(false);
              setActiveBooking(null);
              setAssignedDriver(null);
              setStep(1);
            }}
            theme={theme}
          />
        )}

        {/* ================================================================= */}
        {/* RIDER PROFILE MODAL                                               */}
        {/* ================================================================= */}
        <ProfileModal
          visible={profileModalVisible}
          onDismiss={() => {
            setProfileModalVisible(false);
            setActiveTab('home');
          }}
          user={user}
          onSignOut={handleSignOut}
          onGuardianUpdated={(g) => setGuardianContact(g)}
          onSavedPlacesUpdated={(places) => {
            setSavedHomeAddress(places.home);
            setSavedWorkAddress(places.work);
          }}
          onOpenRideHistory={() => {
            setProfileModalVisible(false);
            setActiveTab('history');
            setHistoryModalVisible(true);
          }}
          onOpenAuth={() => {
            setProfileModalVisible(false);
            setAuthMode('signin');
            setAuthModalVisible(true);
          }}
          onOpenAmenities={() => {
            setProfileModalVisible(false);
            setAmenitiesModalVisible(true);
          }}
          onOpenTalkToOrange={() => {
            setProfileModalVisible(false);
            setTalkToOrangeVisible(true);
          }}
          walletBalance={walletBalance}
          theme={theme}
          onToggleTheme={(t) => handleToggleTheme()}
        />

        {/* ================================================================= */}
        {/* RIDE HISTORY MODAL (CONNECTED TO SUPABASE)                         */}
        {/* ================================================================= */}
        <RideHistoryModal
          visible={historyModalVisible}
          onClose={() => {
            setHistoryModalVisible(false);
            setActiveTab('home');
          }}
          user={user}
          onRepeatTrip={handleRepeatTrip}
          onResumeBooking={(booking) => {
            setHistoryModalVisible(false);
            setActiveTab('home');
            setActiveBooking(booking);
            setPendingSearchBooking(null);
            setStep(4);
          }}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* IN-CAB AMENITIES & FACILITIES SHOWCASE MODAL                       */}
        {/* ================================================================= */}
        <AmenitiesModal
          visible={amenitiesModalVisible}
          onClose={() => setAmenitiesModalVisible(false)}
          onBookNow={() => {
            if (dropLocation && dropLocation.name) {
              setStep(2);
            } else {
              setSearchModalVisible(true);
            }
          }}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* RIDE SCHEDULE MODAL                                               */}
        {/* ================================================================= */}
        <ScheduleModal
          visible={scheduleModalVisible}
          onClose={() => setScheduleModalVisible(false)}
          currentSchedule={scheduledDate}
          onConfirmSchedule={(date) => {
            setScheduledDate(date);
            setScheduleModalVisible(false);
          }}
          onClearSchedule={() => {
            setScheduledDate(null);
            setScheduleModalVisible(false);
          }}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* GUARDIAN SAFETY SUITE MODAL                                       */}
        {/* ================================================================= */}
        <GuardianSafetyModal
          visible={guardianModalVisible}
          onDismiss={() => setGuardianModalVisible(false)}
          booking={activeBooking}
          driver={assignedDriver}
          guardian={guardianContact}
          onOpenGuardianSetup={() => setProfileModalVisible(true)}
          onSosActivated={() => setSosAlertActive(true)}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* TALK TO ORANGE - 24x7 CONCIERGE & INTELLIGENT AI ASSISTANT MODAL  */}
        {/* ================================================================= */}
        <TalkToOrangeModal
          visible={talkToOrangeVisible}
          onClose={() => {
            setTalkToOrangeVisible(false);
            setActiveTab('home');
          }}
          topInset={insets.top}
          theme={theme}
          activeBooking={activeBooking}
          activeCity={activeCity}
          onOpenChauffeurChat={() => {
            setTalkToOrangeVisible(false);
            setChatModalVisible(true);
          }}
          onBookRide={(destinationName, coords) => {
            setTalkToOrangeVisible(false);
            if (destinationName && coords) {
              setDropLocation({
                id: `dest-${Date.now()}`,
                name: destinationName,
                subtitle: destinationName,
                lat: coords.lat,
                lng: coords.lng,
                city: activeCity,
                tag: '📍 Selected Place',
              });
              setStep(2);
            } else if (dropLocation && dropLocation.name) {
              setStep(2);
            } else {
              setSearchModalVisible(true);
            }
          }}
        />

        {/* ================================================================= */}
        {/* ORANGE WALLET MODAL                                                */}
        {/* ================================================================= */}
        <WalletModal
          visible={walletModalVisible}
          onClose={() => setWalletModalVisible(false)}
          userId={user?.id}
          currentBalance={walletBalance}
          onBalanceUpdated={(newBal) => setWalletBalance(newBal)}
          theme={theme}
        />

        {/* ================================================================= */}
        {/* SUPABASE AUTH MODAL                                               */}
        {/* ================================================================= */}
        <Modal visible={authModalVisible} animationType="slide" transparent={true}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBackdrop}
          >
            <View style={styles.authModalContent}>
              <View style={styles.authModalHeader}>
                <Text style={styles.authModalTitle}>
                  {authMode === 'signin' ? 'Sign In to Orange Taxi' : 'Create Orange Account'}
                </Text>
                <TouchableOpacity onPress={() => setAuthModalVisible(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.authModalSub}>
                {authMode === 'signin'
                  ? 'Access your ride history, saved trips and instant booking.'
                  : 'Join Orange Taxi for luxury electric travel across India.'}
              </Text>

              {authMode === 'signup' && (
                <>
                  <View style={styles.authField}>
                    <Text style={styles.authLabel}>Full Name</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="e.g. Akshat Gupta"
                      placeholderTextColor="#94A3B8"
                      value={authFullName}
                      onChangeText={setAuthFullName}
                    />
                  </View>
                  <View style={styles.authField}>
                    <Text style={styles.authLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={authPhone}
                      onChangeText={setAuthPhone}
                    />
                  </View>
                </>
              )}

              <View style={styles.authField}>
                <Text style={styles.authLabel}>Email Address</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="name@domain.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={authEmail}
                  onChangeText={setAuthEmail}
                />
              </View>

              <View style={styles.authField}>
                <Text style={styles.authLabel}>Password</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={authPassword}
                  onChangeText={setAuthPassword}
                />
              </View>

              <TouchableOpacity
                style={styles.authSubmitBtn}
                disabled={authSubmitting}
                onPress={handleAuthSubmit}
              >
                {authSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.authSubmitText}>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authSwitchBtn}
                onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              >
                <Text style={styles.authSwitchText}>
                  {authMode === 'signin'
                    ? "Don't have an account? Sign Up"
                    : 'Already have an account? Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
    </View>

  );
};
