import os

file_path = r"d:\Tradeos-platform - Copy\frontend\src\pages\EnhancedTradePlatform.js"
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Global Avg Price
target1 = 'Global Avg Price: <strong className="text-blue-600">${exporterDealRoom.intelligence.marketAvg}/kg</strong></div>'
repl1 = 'Global Avg Price: <strong className="text-blue-600">₹{exporterDealRoom.intelligence.marketAvg}/kg</strong></div>'
text = text.replace(target1, repl1)

# Replace Suggested Counter
target2 = 'Suggested Counter: <strong className="text-amber-600">${exporterDealRoom.intelligence.suggestion}/kg</strong></div>'
repl2 = 'Suggested Counter: <strong className="text-amber-600">₹{exporterDealRoom.intelligence.suggestion}/kg</strong></div>'
text = text.replace(target2, repl2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced successfully")
