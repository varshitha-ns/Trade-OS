import re

file_path = r"d:\Tradeos-platform\frontend\src\pages\EnhancedTradePlatform.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

emojis_to_remove = [
    '🌍', '🏢', '🚢', '📝', '📦', '🤖', '🤝', '📄', '🔒', '✅', '🚀', '🎉',
    '🔍', '🏆', '💡', '📍', '⚡', '🔗', '📋', '📑', '💼', '📈', '💰', '📊',
    '💸', '💳', '🛡️', '⚠️', '🚨', 'ℹ️', '⚖️', '🏭', '🛳️', '✈️', '🚛', '⏳'
]

clean_text = text
for emoji in emojis_to_remove:
    clean_text = clean_text.replace(emoji + ' ', '') # Remove emoji with trailing space
    clean_text = clean_text.replace(emoji, '')

# Also remove empty divs that only contained emojis like <div style={{...}}>🌍</div>
clean_text = re.sub(r"<div style={{[^}]*}}>\s*</div>", "", clean_text)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(clean_text)

print("Successfully removed emojis from EnhancedTradePlatform.js")
