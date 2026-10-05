with open('src/screens/BookingScreen.tsx', 'r') as f:
    content_booking = f.read()
    
old_hud = """              ) : activeBooking.status === 'searching' ? (
                <View style={styles.searchingFleetRow}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={styles.searchingFleetText}>
                    Broadcasting to nearby Orange EV Chauffeurs...
                  </Text>
                </View>
              ) : ("""

new_hud = """              ) : activeBooking.status === 'searching' ? (
                <View style={styles.searchingFleetRow}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={styles.searchingFleetText}>
                    Broadcasting to nearby Orange EV Chauffeurs...
                  </Text>
                </View>
              ) : activeBooking.status === 'cancelled' ? (
                <View style={styles.searchingFleetRow}>
                  <X size={20} color="#EF4444" />
                  <Text style={[styles.searchingFleetText, { color: '#EF4444' }]}>
                    Ride Cancelled
                  </Text>
                </View>
              ) : ("""

content_booking = content_booking.replace(old_hud, new_hud)

with open('src/screens/BookingScreen.tsx', 'w') as f:
    f.write(content_booking)

