with open('src/context/RideContext.tsx', 'r') as f:
    content = f.read()

import re

# Use regex to comment out the rest of the block
old_block = """    // registerForPushNotificationsAsync().then(async (token) => {
      if (token && user) {
        try {
          await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
        } catch (e) {
          console.log('Push token DB update error', e);
        }
      }
    });"""

new_block = """    // registerForPushNotificationsAsync().then(async (token) => {
    //   if (token && user) {
    //     try {
    //       await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
    //     } catch (e) {
    //       console.log('Push token DB update error', e);
    //     }
    //   }
    // });"""

content = content.replace(old_block, new_block)

with open('src/context/RideContext.tsx', 'w') as f:
    f.write(content)
