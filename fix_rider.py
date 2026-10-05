import re

with open('src/components/ProfileModal.tsx', 'r') as f:
    content = f.read()

# The bad string that got inserted multiple times:
bad_str = """  relChipLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cancelBtnLight: {
    backgroundColor: '#F1F5F9',
  },
});"""

content = content.replace(bad_str, '});')

# Now add it ONLY at the very end of the file. 
# The stylesheet ends at the bottom.
content = content.replace('});\n\nexport default', bad_str + '\n\nexport default')

with open('src/components/ProfileModal.tsx', 'w') as f:
    f.write(content)
