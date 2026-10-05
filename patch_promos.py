import re

with open('src/context/RideContext.tsx', 'r') as f:
    content = f.read()

# 1. Update PROMO_CODES
old_promos = r"""const PROMO_CODES: Record<string, \{ discountType: 'flat' | 'percent'; value: number; minFare: number; desc: string \}> = \{
    'ORANGE50': \{ discountType: 'flat', value: 50, minFare: 120, desc: '₹50 flat off on luxury EV rides' \},
    'FIRST100': \{ discountType: 'flat', value: 100, minFare: 180, desc: '₹100 welcome bonus on Orange fleet' \},
    'BE6VIP': \{ discountType: 'percent', value: 20, minFare: 150, desc: '20% off up to ₹150 on Mahindra BE.6' \},
    'ELECTRIC': \{ discountType: 'flat', value: 75, minFare: 140, desc: '₹75 clean mobility subsidy' \},
  \};"""

new_promos = r"""const PROMO_CODES: Record<string, { discountType: 'flat' | 'percent'; value: number; minFare: number; desc: string }> = {
    'FIRST100': { discountType: 'flat', value: 100, minFare: 180, desc: '₹100 welcome bonus on Orange fleet' },
  };"""

content = re.sub(old_promos, new_promos, content)


# 2. Update handleApplyPromo to check usage
old_handle = r"""function handleApplyPromo\(\) \{
    const code = promoInput\.trim\(\)\.toUpperCase\(\);
    if \(!code\) \{
      setPromoError\('Please enter a promo code'\);
      return;
    \}
    const promo = PROMO_CODES\[code\];
    if \(!promo\) \{
      Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Error\);
      setPromoError\('Invalid code\. Try ORANGE50, FIRST100, or BE6VIP\.'\);
      return;
    \}"""

new_handle = r"""async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a promo code');
      return;
    }
    const promo = PROMO_CODES[code];
    if (!promo) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPromoError('Invalid code. Try FIRST100.');
      return;
    }
    
    if (code === 'FIRST100') {
      const used = await AsyncStorage.getItem(`@orange_promo_used_FIRST100_${user?.id || 'guest'}`);
      if (used) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPromoError('You have already used the FIRST100 welcome bonus.');
        return;
      }
    }"""

content = re.sub(old_handle, new_handle, content)


# 3. Mark FIRST100 as used inside executeBookingSubmission
old_insert_success = r"""      if \(!error && data\) \{
        setPendingSearchBooking\(data\);
        setStep\(3\); // move to Search Radar Screen
      \}"""

new_insert_success = r"""      if (!error && data) {
        if (appliedPromo?.code === 'FIRST100') {
          await AsyncStorage.setItem(`@orange_promo_used_FIRST100_${user?.id || 'guest'}`, 'true');
        }
        setPendingSearchBooking(data);
        setStep(3); // move to Search Radar Screen
      }"""

content = re.sub(old_insert_success, new_insert_success, content)


with open('src/context/RideContext.tsx', 'w') as f:
    f.write(content)

