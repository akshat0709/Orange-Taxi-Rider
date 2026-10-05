with open('src/context/RideContext.tsx', 'r') as f:
    content = f.read()

old_func = """    // Direct the user to drop the pin at their exact pickup location!
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPinPickerTarget('pickup');
    setPinCurrentCoords(pickupCoords);
    setPinAddressText(pickupText);
    setIsBookingPinConfirm(true);
    setPinPickerActive(true);
  }"""

new_func = """    // Direct the user to drop the pin at their exact pickup location!
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPinPickerTarget('pickup');
    setPinCurrentCoords(pickupCoords);
    setPinAddressText(pickupText);
    setIsBookingPinConfirm(true);
    setPinPickerActive(true);
    
    // IMPORTANT: Since we use React Navigation, we MUST explicitly return to the Home screen (step 1)
    // where the Pin Picker overlay is physically rendered over the map!
    setStep(1);
  }"""

content = content.replace(old_func, new_func)

with open('src/context/RideContext.tsx', 'w') as f:
    f.write(content)

