import re

with open('public/world-map.svg', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove existing fills
content = re.sub(r'fill="[^"]*"', '', content)
# Add our custom slate-200 fill to all paths
content = content.replace('<path ', '<path fill="#e2e8f0" ')

with open('public/world-map.svg', 'w', encoding='utf-8') as f:
    f.write(content)
