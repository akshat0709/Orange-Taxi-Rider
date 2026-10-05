with open('src/context/RideContext.tsx', 'r') as f:
    content = f.read()

old_apply = """    function applyBookingUpdate(newBooking: any) {
      if (!newBooking) return;
      setActiveBooking((prev) => {
        if (!prev) return newBooking;
        const statusChanged = prev.status !== newBooking.status;"""

new_apply = """    function applyBookingUpdate(newBooking: any) {
      if (!newBooking) return;
      
      // If the booking was cancelled (by user or driver), completely clear it
      if (newBooking.status === 'cancelled') {
        setActiveBooking(null);
        setPendingSearchBooking(null);
        setAssignedDriver(null);
        setStep(1);
        return;
      }

      setActiveBooking((prev) => {
        if (!prev) return newBooking;
        const statusChanged = prev.status !== newBooking.status;"""

content = content.replace(old_apply, new_apply)

old_cancel = """          setActiveBooking(null);
          setAssignedDriver(null);
          setStep(1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);"""

new_cancel = """          setActiveBooking(null);
          setPendingSearchBooking(null);
          setAssignedDriver(null);
          setStep(1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);"""

content = content.replace(old_cancel, new_cancel)

with open('src/context/RideContext.tsx', 'w') as f:
    f.write(content)

