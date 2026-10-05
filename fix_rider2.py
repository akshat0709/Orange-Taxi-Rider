import re

with open('src/components/ProfileModal.tsx', 'r') as f:
    content = f.read()

# 1. Phone numbers
content = content.replace('+91 11 4000 7000', '+91 72940 73222')
content = content.replace('+911140007000', '+917294073222')

# 2. Chips
content = content.replace('style={[styles.relChip, relationship === opt && styles.relChipActive]}', 'style={[styles.relChip, !isDark && styles.relChipLight, relationship === opt && styles.relChipActive]}')
content = content.replace('style={styles.cancelBtn}', 'style={[styles.cancelBtn, !isDark && styles.cancelBtnLight]}')
content = content.replace('style={styles.cancelBtnText}', 'style={[styles.cancelBtnText, !isDark && styles.textDark]}')

styles_to_add = """
  relChipLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cancelBtnLight: {
    backgroundColor: '#F1F5F9',
  },
  textDark: { color: '#0F172A' },
});"""

# ONLY REPLACE THE VERY LAST `});` WHICH IS THE END OF STYLESHEET
content = re.sub(r'\}\);\s*$', styles_to_add, content)

with open('src/components/ProfileModal.tsx', 'w') as f:
    f.write(content)
