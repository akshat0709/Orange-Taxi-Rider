with open('src/components/ProfileModal.tsx', 'r') as f:
    content = f.read()

content = content.replace('borderColor: \'#334155\',\n  }\n\n\n  relChipLight', 'borderColor: \'#334155\',\n  },\n  relChipLight')

with open('src/components/ProfileModal.tsx', 'w') as f:
    f.write(content)
