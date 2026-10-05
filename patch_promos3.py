with open('src/screens/BookingScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace("placeholder=\"Enter promo code (e.g. ORANGE50)\"", "placeholder=\"Enter promo code (e.g. FIRST100)\"")
content = content.replace("{['ORANGE50', 'FIRST100', 'BE6VIP', 'ELECTRIC'].map((code) => (", "{['FIRST100'].map((code) => (")

with open('src/screens/BookingScreen.tsx', 'w') as f:
    f.write(content)
