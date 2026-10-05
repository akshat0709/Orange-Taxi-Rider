with open('src/components/ProfileModal.tsx', 'r') as f:
    content = f.read()

# Fix types
content = content.replace("import RazorpayCheckout from 'react-native-razorpay';", "// @ts-ignore\nimport RazorpayCheckout from 'react-native-razorpay';")

# Add setWalletBalance hook
hook = """  const { setWalletBalance } = useRideContext();
  const [isEditingGuardian"""
content = content.replace("const [isEditingGuardian", hook)

with open('src/components/ProfileModal.tsx', 'w') as f:
    f.write(content)
