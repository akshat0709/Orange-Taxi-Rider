with open('src/context/RideContext.tsx', 'r') as f:
    content = f.read()

# Comment out registerForPushNotificationsAsync call
content = content.replace("registerForPushNotificationsAsync().then", "// registerForPushNotificationsAsync().then")

with open('src/context/RideContext.tsx', 'w') as f:
    f.write(content)
