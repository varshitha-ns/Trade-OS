# 📋 Trade Item Parser - Proper Prompt & Usage Guide

## System Prompt for Trade Item Parser

Use this prompt when initializing the Trade Item Parser for intelligent trade item extraction:

```
You are an expert Trade Item Parser for the TradeOS B2B platform. Your role is to intelligently 
parse user trade requests (both natural language and structured data) and extract key information 
for the Matchmaker Agent.

Your objectives:
1. Extract explicit trade item information (product name, quantity, destination, etc.)
2. Infer missing information intelligently using context and domain knowledge
3. Validate data against HS codes and product categories
4. Identify quality requirements and certifications needed
5. Flag any concerns or missing critical information

When parsing trade requests, extract these fields:
- product_name: The specific product being traded
- product_category: Category from [Agriculture, Spices, Grains, Textiles, Metals, Industrial, Chemical, Pharma, Electronics, Automobile, Energy]
- hs_code: Harmonized System code (6-10 digits)
- commodity_name: Specific commodity name
- quantity: Numerical quantity
- unit: Unit of measurement (kg, ton, mt, unit, piece, liter, etc.)
- destination_country: Country code or full name
- origin_country: (optional) Country of origin
- delivery_deadline: Date in YYYY-MM-DD format
- budget_max: Maximum budget in USD
- quality_requirements: List of quality specs (organic, non-gmo, premium, etc.)
- certifications_required: ISO, FDA, HACCP, USDA, EU Organic, Fair Trade, etc.
- payment_terms: LC, TT, Advance, etc.
- shipping_method: Sea, Air, Land, Multi-modal
- min_order_quantity: Minimum acceptable quantity
- special_requirements: Custom requirements or notes

Guidelines:
- Always validate HS codes against the HS code pattern database
- Match products to standard commodity names when possible
- Convert all quantities to metric system (kg, ton, etc.)
- Be strict with quality requirements to ensure supplier filtering
- Flag any ambiguous or incomplete information
```

## Example Trade Item Parser Prompts

### Example 1: Natural Language Request
```
Input:
"I need to import 5000 kg of organic turmeric powder from India to Germany within 30 days. 
I have a budget of $75,000 and require USDA Organic and EU Organic certifications. 
I prefer sea freight with LC payment terms."

Expected Output:
{
  "product_name": "Organic Turmeric Powder",
  "product_category": "Spices",
  "hs_code": "0910300",
  "commodity_name": "Turmeric",
  "quantity": 5000,
  "unit": "kg",
  "destination_country": "Germany",
  "origin_country": "India",
  "delivery_deadline": "2026-04-06",
  "urgency_days": 30,
  "budget_max": 75000,
  "budget_currency": "USD",
  "quality_requirements": ["Organic", "High Purity"],
  "certifications_required": ["USDA Organic", "EU Organic"],
  "payment_terms": "LC",
  "shipping_method": "Sea freight",
  "confidence_score": 0.95,
  "parsed_at": "2026-03-06T10:30:00",
  "issues": []
}
```

### Example 2: Structured CSV Data
```
Input (CSV Row):
supplier_id, company_name, country, hs_code, commodity_name, category, ...
SUP0001, India Spice Exports, India, 0910300, Turmeric, Spices, ...

Expected Processing:
- Map to standardized product_category: "Spices"
- Validate HS code: 0910300 ✓
- Extract from matchmaker_master features:
  - Capacity: estimated_capacity field
  - Certifications: certification_iso, certification_haccp, certification_fda fields
  - Delivery ability: on_time_delivery_rate_percent
  - Quality: reliability_score, buyer_rating
```

## Integration with Matchmaker Agent

The Trade Item Parser output feeds directly into the Matchmaker Agent's 6-step pipeline:

```
Step 1: Request Parser
  ↓ (Parses raw trade request using this prompt)
Step 2: Preprocessing 
  ↓ (Normalizes and standardizes)
Step 3: Hard Constraints Filter
  ↓ (Filters suppliers using CSV data from suppliers_master)
Step 4: Feature Extraction
  ↓ (Calculates similarity scores)
Step 5: Trust Score Calculator
  ↓ (Weights: 30% similarity, 25% success rate, 20% on-time, 15% rating, 10% risk)
Step 6: ML Adjustment
  ↓ (Final ranking)
Recommendations
```

## Field Mapping: CSV Data → Trade Parser → Matchmaker

### Supplier Dataset (from CSV):
```
supplier_id → user_id
company_name → partner name
country → origin_country
hs_code → product hs_code
commodity_name → product_name / commodity_name
category → product_category
estimated_capacity → supplier_capacity
reliability_score → verification_level basis
on_time_delivery_rate_percent → success_rate metric
buyer_rating → rating score
certification_iso, certification_haccp, certification_fda → certifications list
min_order_quantity → quantity requirement check
avg_lead_time_days → delivery timeline
payment_terms → supported payment methods
```

## Quality Requirements - CSV Data Mapping

When trade request mentions quality requirements, match against supplier data:

```python
QUALITY_REQUIREMENTS_MAPPING = {
    "Organic": {
        "csv_field": "certification_iso",
        "csv_value": "Yes",
        "supplier_field": "certifications"
    },
    "Certified": {
        "csv_field": "certification_haccp",
        "csv_value": "Yes",
        "supplier_field": "certifications"
    },
    "FDA Certified": {
        "csv_field": "certification_fda",
        "csv_value": "Yes",
        "supplier_field": "certifications"
    },
    "High Reliability": {
        "csv_field": "reliability_score",
        "csv_value": "> 0.9",
        "supplier_field": "reliability"
    },
    "Proven Performance": {
        "csv_field": "on_time_delivery_rate_percent",
        "csv_value": "> 90",
        "supplier_field": "performance"
    }
}
```

## Trust Score Calculation (From CSV Data)

```
Trust Score = (0.4 × Success Rate) + (0.2 × On-time Delivery Rate) + 
              (0.2 × Average Rating) + (0.2 × Verification Level)

Where:
  Success Rate = on_time_delivery_rate_percent / 100
  On-time Delivery Rate = on_time_delivery_rate_percent / 100
  Average Rating = buyer_rating (1-5 scale)
  Verification Level = calculated from certifications + years_in_business
                       (1-5 scale, higher = more verified)
```

## Implementation Example

```python
# Using the Trade Item Parser with proper prompt
from app.api.trade_parser import TradeItemParser

parser = TradeItemParser()

# Natural language input
user_request = """
I want to source 10 tons of certified organic coffee beans from Vietnam to USA 
with budget of $35,000. Need delivered in 45 days with Fair Trade certification.
"""

parsed_result = parser.parse_trade_description(user_request)

# Output will include:
# - product_name: "Organic Coffee Beans"
# - product_category: "Agriculture" 
# - hs_code: "090111"
# - quantity: 10
# - unit: "ton"
# - certifications_required: ["Organic", "Fair Trade"]
# - confidence_score: 0.92

# This gets passed to matchmaker:
from app.services.matchmaker import matchmaker_agent

trade_request = convert_parsed_to_trade_request(parsed_result)
match_result = await matchmaker_agent.find_matches(trade_request)

# Returns top 10 supplier matches with trust scores from CSV data
```

## CSV Dataset Statistics (1000 Suppliers)

The matchmaker has access to 1000 pre-loaded suppliers with:
- **Countries**: 30+ major trading nations
- **Categories**: Agriculture, Spices, Grains, Textiles, Metals, Industrial, Chemical, Pharma, Electronics, Automobile, Energy
- **Reliability Scores**: 0.71-0.98 (normalized for filtering)
- **Certifications**: ISO 9001, HACCP, FDA variations
- **Capacity Range**: 1K-1M units monthly
- **On-time Delivery**: 80-97% rates
- **Company Sizes**: Micro SME, SME, Enterprise, Large

## Best Practices

1. **Always validate HS codes** - Reject if not 6-10 digits
2. **Standardize units** - Convert to metric (kg, ton, m³, liter)
3. **Be specific with certifications** - Use exact names (not "certified")
4. **Include urgency timeline** - Calculate days until deadline
5. **Flag incomplete data** - Note missing critical fields
6. **Use confidence scores** - Indicate parsing confidence (0-1)
7. **Preserve original input** - Store raw request for reference

## Error Handling

```
Common parsing issues:
- Ambiguous product name → Suggest category
- Missing unit → Assume "kg" for commodities
- Invalid date → Suggest today + 30 days
- Unclear destination → Request clarification
- No budget → Flag as optional but recommended
- Unclear certifications → List matching suppliers with/without
```

---

**Last Updated**: March 6, 2026
**Status**: ✅ Integration Complete - Using suppliers_master dataset
