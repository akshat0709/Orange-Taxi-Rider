with open('src/components/ProfileModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("key: 'rzp_test_YourTestKey',", "key: 'rzp_test_TjnylwNIDTQjP2',")

with open('src/components/ProfileModal.tsx', 'w') as f:
    f.write(content)

