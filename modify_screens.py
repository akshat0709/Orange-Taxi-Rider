import os
import re

SCREENS_DIR = "/Users/akshatgupta/Desktop/a/orange-taxi-rider/src/screens"
FILES = ["HomeScreen.tsx", "BookingScreen.tsx", "ActiveRideScreen.tsx"]

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add accessibility to avatar
    content = content.replace(
        "style={[styles.floatingAvatarBtn",
        "accessibilityLabel=\"Profile\"\n              accessibilityRole=\"button\"\n              style={[styles.floatingAvatarBtn"
    )

    # Add accessibility to wallet
    content = content.replace(
        "style={[styles.floatingWalletPill",
        "accessibilityLabel=\"Wallet\"\n              accessibilityRole=\"button\"\n              style={[styles.floatingWalletPill"
    )

    # Add accessibility to city
    content = content.replace(
        "style={[styles.floatingCityBtn",
        "accessibilityLabel=\"Select City\"\n                accessibilityRole=\"button\"\n                style={[styles.floatingCityBtn"
    )

    # Add accessibility to chat
    content = content.replace(
        "style={styles.circularActionChat}",
        "style={styles.circularActionChat}\n                  accessibilityLabel=\"Chat with Driver\"\n                  accessibilityRole=\"button\""
    )

    # Add accessibility to call
    content = content.replace(
        "style={styles.circularActionCall}",
        "style={styles.circularActionCall}\n                  accessibilityLabel=\"Call Driver\"\n                  accessibilityRole=\"button\""
    )

    # Add accessibility to cancel
    content = content.replace(
        "style={[styles.circularActionCancel",
        "accessibilityLabel=\"Cancel Ride\"\n                    accessibilityRole=\"button\"\n                    style={[styles.circularActionCancel"
    )

    # Add accessibility to amenities
    content = content.replace(
        "style={styles.onboardAmenitiesBar}",
        "style={styles.onboardAmenitiesBar}\n                accessibilityLabel=\"View Amenities\"\n                accessibilityRole=\"button\""
    )

    # Add SOS button in ActiveRideScreen
    if "ActiveRideScreen" in filepath:
        sos_button = """
                {/* SOS Emergency Button */}
                <TouchableOpacity
                  style={[styles.circularActionCall, { backgroundColor: '#EF4444', marginLeft: 8 }]}
                  activeOpacity={0.85}
                  accessibilityLabel="SOS Emergency"
                  accessibilityRole="button"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    Linking.openURL('tel:112');
                  }}
                >
                  <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>SOS</Text>
                </TouchableOpacity>
"""
        # Insert after Circular Call Action block
        call_action_end = "                  <Phone size={20} color=\"#FFFFFF\" />\n                </TouchableOpacity>"
        content = content.replace(call_action_end, call_action_end + sos_button)

    with open(filepath, 'w') as f:
        f.write(content)

for filename in FILES:
    update_file(os.path.join(SCREENS_DIR, filename))

print("Modified screens successfully.")
