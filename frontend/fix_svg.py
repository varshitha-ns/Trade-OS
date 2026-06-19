import re

with open('public/world-map.svg', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any <path followed by whitespace with <path fill="#e2e8f0" 
content = re.sub(r'<path\s+', '<path fill="#e2e8f0" ', content)

with open('public/world-map.svg', 'w', encoding='utf-8') as f:
    f.write(content)
