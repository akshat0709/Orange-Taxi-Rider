with open('src/components/ProfileModal.tsx', 'r') as f:
    content = f.read()

# Remove top level import
content = content.replace("// @ts-ignore\nimport RazorpayCheckout from 'react-native-razorpay';", "")

# Put it inside the function
old_func = """  const handleRazorpayRecharge = (amount: number) => {
    var options = {"""

new_func = """  const handleRazorpayRecharge = (amount: number) => {
    let RazorpayCheckout;
    try {
      // @ts-ignore
      RazorpayCheckout = require('react-native-razorpay').default;
    } catch (e) {
      Alert.alert('Native Module Required', 'Razorpay checkout is only available in the standalone compiled app (EAS Build), not in Expo Go.');
      return;
    }
    
    var options = {"""

content = content.replace(old_func, new_func)

with open('src/components/ProfileModal.tsx', 'w') as f:
    f.write(content)

