import os

screens = ['src/screens/HomeScreen.tsx', 'src/screens/BookingScreen.tsx', 'src/screens/ActiveRideScreen.tsx']

for screen in screens:
    with open(screen, 'r') as f:
        content = f.read()
    
    # Remove the wrapper
    import re
    content = re.sub(r'  // replace setStep logic with navigation\s+const originalSetStep = context\.setStep;\s+const setStep = \(newStep: number\) => \{\s+originalSetStep\(newStep\);\s+if \(newStep === 1\) navigation\.navigate\(\'Home\'\);\s+if \(newStep === 2\) navigation\.navigate\(\'Booking\'\);\s+if \(newStep === 4\) navigation\.navigate\(\'ActiveRide\'\);\s+\};', 'const { setStep } = context;', content)

    with open(screen, 'w') as f:
        f.write(content)
