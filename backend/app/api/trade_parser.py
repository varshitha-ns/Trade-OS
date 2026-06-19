"""
📦 Trade Item Parser API

This module parses user input to identify trade items and extract key information
for the Matchmaker Agent to work with.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import re
from datetime import datetime
from app.database import get_database
from app.core.events import event_bus
import uuid

router = APIRouter(tags=["Trade Parser"])

class TradeItemParser:
    """Intelligent trade item parser that extracts product information"""
    
    def __init__(self):
        # Product categories and their keywords
        self.product_categories = {
            "spices": ["turmeric", "pepper", "cinnamon", "clove", "cardamom", "ginger", "cumin", "coriander"],
            "beverages": ["coffee", "tea", "cocoa"],
            "grains": ["wheat", "rice", "corn", "barley", "oats", "millet", "sorghum", "quinoa"],
            "vegetables": ["tomato", "potato", "onion", "carrot", "cabbage", "lettuce", "spinach"],
            "fruits": ["apple", "banana", "orange", "mango", "grape", "strawberry", "pineapple"],
            "textiles": ["cotton", "silk", "wool", "linen", "polyester", "nylon", "denim", "fabric", "yarn"],
            "metals": ["steel", "aluminum", "aluminium", "copper", "zinc", "iron", "titanium", "lithium"],
            "chemicals": ["fertilizer", "urea", "pesticide", "herbicide", "solvent", "acid", "polyethylene", "chemicals"],
            "machinery": ["tractor", "harvester", "pump", "motor", "engine", "generator", "bearings"],
            "leather": ["leather", "vegan leather", "handbags", "shoes"],
            "medical": ["surgical mask", "mask", "gloves", "antibiotic", "aspirin", "amoxicillin", "pharmaceutical"],
            "electronics": ["semiconductor", "motherboard", "fiber optic", "cable", "display", "usb", "power bank", "phone case"],
            "energy": ["solar panel", "wind turbine", "battery"]
        }
        
        # HS Code patterns for common products
        self.hs_code_patterns = {
            "09": "Coffee, Tea, Spices",
            "07": "Edible Vegetables",
            "08": "Edible Fruit",
            "52": "Cotton",
            "72": "Steel",
            "28": "Inorganic Chemicals",
            "84": "Machinery"
        }
        
        # Common units for different product types
        self.product_units = {
            "spices": ["kg", "ton", "mt"],
            "grains": ["kg", "ton", "mt", "bushel"],
            "vegetables": ["kg", "ton", "mt", "crate"],
            "fruits": ["kg", "ton", "mt", "box", "carton"],
            "textiles": ["meter", "yard", "kg", "bale"],
            "metals": ["kg", "ton", "mt", "sheet", "coil"],
            "chemicals": ["kg", "ton", "mt", "liter", "gallon"],
            "machinery": ["unit", "piece", "set"]
        }

    def parse_trade_description(self, description: str) -> Dict[str, Any]:
        """
        Parse a natural language trade description into structured data
        
        Args:
            description: Natural language description of what user wants to trade
            
        Returns:
            Structured trade item information
        """
        
        # Convert to lowercase for processing
        desc_lower = description.lower()
        
        # Extract product information
        product_info = self._extract_product_info(desc_lower)
        
        # Extract quantity and unit
        quantity_info = self._extract_quantity(desc_lower)
        
        # Extract quality specifications
        quality_info = self._extract_quality_specs(desc_lower)
        
        # Extract destination/origin
        location_info = self._extract_locations(desc_lower)
        
        # Extract timing
        timing_info = self._extract_timing(desc_lower)
        
        # Generate HS code suggestion
        hs_suggestion = self._suggest_hs_code(product_info)
        
        return {
            "product_name": product_info.get("name", "Unknown Product"),
            "product_category": product_info.get("category", "Unknown"),
            "keywords": product_info.get("keywords", []),
            "quantity": quantity_info.get("quantity", 0),
            "unit": quantity_info.get("unit", "units"),
            "quality_requirements": quality_info.get("requirements", []),
            "certifications_required": quality_info.get("certifications", []),
            "destination_country": location_info.get("destination", ""),
            "origin_country": location_info.get("origin", ""),
            "delivery_deadline": timing_info.get("deadline", ""),
            "urgency_days": timing_info.get("urgency", 30),
            "hs_code_suggestion": hs_suggestion,
            "parsed_at": datetime.now().isoformat(),
            "confidence_score": self._calculate_confidence(product_info, quantity_info, quality_info)
        }

    def _extract_product_info(self, description: str) -> Dict[str, Any]:
        """Extract product name and category from description"""
        
        product_info = {"name": "", "category": "", "keywords": []}
        stopwords = {
            "i", "want", "need", "looking", "import", "export", "buy", "sell", "trade",
            "from", "to", "of", "for", "with", "and", "the", "a", "an", "in", "within"
        }
        
        # Find matching category
        for category, keywords in self.product_categories.items():
            for keyword in keywords:
                if keyword in description:
                    product_info["category"] = category
                    product_info["keywords"].append(keyword)
                    
                    # Extract product name (first matching keyword)
                    if not product_info["name"]:
                        product_info["name"] = keyword.title()
        
        # If no category found, extract product from common trade phrases
        if not product_info["name"]:
            phrase_patterns = [
                r'\b(?:import|export|buy|sell|trade)\s+(?:of\s+)?(?:\d+(?:[.,]\d+)?\s*(?:kg|kilograms?|tons?|mt|metric tons?|units?|pieces?|sets?|boxes|cartons?|crates?|bales?|meters?|yards?|liters?|gallons?)?\s+)?([a-z][a-z\s-]{2,})\b',
                r'\bof\s+([a-z][a-z\s-]{2,})\b',
            ]
            for pattern in phrase_patterns:
                match = re.search(pattern, description)
                if not match:
                    continue

                candidate = match.group(1).strip()
                # Truncate at separators to avoid capturing whole sentence tail.
                candidate = re.split(r'\b(?:from|to|within|with|for|in)\b', candidate)[0].strip()
                tokens = [t for t in re.findall(r'[a-z]+', candidate) if t not in stopwords]
                if tokens:
                    product_info["name"] = " ".join(tokens).title()
                    product_info["keywords"].extend(tokens)
                    break

        # If no category found, try to extract product name directly
        if not product_info["name"]:
            words = description.split()
            for word in words:
                if len(word) > 3 and word.isalpha() and word not in stopwords:
                    product_info["name"] = word.title()
                    product_info["keywords"].append(word)
                    break
        
        return product_info

    def _extract_quantity(self, description: str) -> Dict[str, Any]:
        """Extract quantity and unit from description"""
        
        # Pattern to match quantity and unit
        quantity_patterns = [
            r'(\d+(?:\.\d+)?)\s*(kg|kilogram|ton|tonne|mt|metric\s*ton|unit|piece|set|box|carton|crate|bale|meter|yard|liter|gallon)',
            r'(\d+(?:,\d+)*)\s*(kg|kilogram|ton|tonne|mt|metric\s*ton|unit|piece|set|box|carton|crate|bale|meter|yard|liter|gallon)',
        ]
        
        for pattern in quantity_patterns:
            match = re.search(pattern, description)
            if match:
                quantity = float(match.group(1).replace(',', ''))
                unit = match.group(2).lower()
                
                # Standardize units
                unit_mapping = {
                    'kilogram': 'kg', 'ton': 'ton', 'tonne': 'ton', 'metric ton': 'ton', 'mt': 'ton',
                    'piece': 'unit', 'set': 'set', 'box': 'box', 'carton': 'carton',
                    'crate': 'crate', 'bale': 'bale', 'meter': 'meter', 'yard': 'yard',
                    'liter': 'liter', 'gallon': 'gallon'
                }
                
                standardized_unit = unit_mapping.get(unit, unit)
                
                return {"quantity": quantity, "unit": standardized_unit}
        
        return {"quantity": 0, "unit": "units"}

    def _extract_quality_specs(self, description: str) -> Dict[str, Any]:
        """Extract quality requirements and certifications"""
        
        quality_keywords = {
            "organic": ["organic", "bio", "eco-friendly"],
            "non-gmo": ["non-gmo", "gmo-free", "no-gmo"],
            "certified": ["certified", "certificate", "certification"],
            "premium": ["premium", "high-quality", "grade-a", "top-quality"],
            "tested": ["tested", "lab-tested", "quality-tested"],
            "fresh": ["fresh", "new-crop", "recent-harvest"]
        }
        
        requirements = []
        certifications = []
        
        for quality, keywords in quality_keywords.items():
            for keyword in keywords:
                if keyword in description:
                    if quality in ["organic", "non-gmo", "certified"]:
                        certifications.append(quality.title())
                    requirements.append(quality.replace("-", " ").title())
        
        return {
            "requirements": list(set(requirements)),
            "certifications": list(set(certifications))
        }

    def _extract_locations(self, description: str) -> Dict[str, Any]:
        """Extract origin and destination countries"""
        
        # Common country names
        countries = {
            "usa": "United States", "america": "United States",
            "uk": "United Kingdom", "britain": "United Kingdom",
            "germany": "Germany", "france": "France", "italy": "Italy",
            "spain": "Spain", "netherlands": "Netherlands", "poland": "Poland",
            "india": "India", "china": "China", "japan": "Japan",
            "vietnam": "Vietnam", "thailand": "Thailand", "sri lanka": "Sri Lanka",
            "brazil": "Brazil", "argentina": "Argentina", "mexico": "Mexico",
            "uae": "UAE", "dubai": "Dubai", "emirates": "UAE", "saudi": "Saudi Arabia"
        }
        
        location_info = {"origin": "", "destination": ""}

        # Prioritize explicit "from <country>" and "to <country>" style patterns.
        keys_by_len = sorted(countries.keys(), key=len, reverse=True)
        country_pattern = "|".join(re.escape(k) for k in keys_by_len)

        from_match = re.search(rf"\bfrom\s+({country_pattern})\b", description)
        to_match = re.search(rf"\b(?:to|destination|ship to|import to)\s+({country_pattern})\b", description)

        if from_match:
            location_info["origin"] = countries.get(from_match.group(1), "")
        if to_match:
            location_info["destination"] = countries.get(to_match.group(1), "")
        
        return location_info

    def _extract_timing(self, description: str) -> Dict[str, Any]:
        """Extract timing information"""
        
        timing_info = {"deadline": "", "urgency": 30}
        
        # Date patterns
        date_patterns = [
            r'by\s*(\d{4}-\d{2}-\d{2})',
            r'before\s*(\d{4}-\d{2}-\d{2})',
            r'(\d{2}/\d{2}/\d{4})',
            r'within\s*(\d+)\s*days',
            r'urgent', r'immediate'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                if "day" in pattern:
                    timing_info["urgency"] = int(match.group(1))
                elif "urgent" in pattern or "immediate" in pattern:
                    timing_info["urgency"] = 7
                else:
                    timing_info["deadline"] = match.group(1)
                break
        
        return timing_info

    def _suggest_hs_code(self, product_info: Dict[str, Any]) -> str:
        """Suggest accurate HS code based on product and category"""
        
        name = f" {product_info.get('name', '').lower()} "
        category = product_info.get("category", "")
        
        # High-demand SME product specific mapping
        if " copper " in name: return "740311"
        if " aluminum " in name or " aluminium " in name: return "760110"
        if " pvc " in name or " plastic resin " in name: return "390410"
        if " semiconductor " in name or " ic " in name or " chip " in name: return "854110"
        if " api " in name or " pharmaceutical " in name: return "293339"
        if " polyester " in name: return "540233"
        if " silk " in name: return "500720"
        if " denim " in name: return "520942"
        if " textile machine " in name: return "844839"
        if " food machine " in name: return "843810"
        if " power tool " in name: return "846721"
        if " fastener " in name or " bolt " in name: return "731815"
        if " cocoa " in name: return "180100"
        
        # Category-level fallbacks
        if category == "spices":
            return "0910"  # Ginger, saffron, turmeric
        elif category == "beverages":
            return "0901"  # Coffee
        elif category == "grains":
            return "1001"  # Wheat
        elif category == "vegetables":
            return "0703"  # Onions, garlic
        elif category == "fruits":
            return "0803"  # Bananas
        elif category == "textiles":
            return "5201"  # Cotton
        elif category == "metals":
            return "7208"  # Iron/Steel fallback
        elif category == "chemicals":
            return "3102"  # Fertilizer fallback
        elif category == "machinery":
            return "8436"  # Agri machinery fallback
        
        return "0000"  # Unknown

    def _calculate_confidence(self, product_info: Dict, quantity_info: Dict, quality_info: Dict) -> float:
        """Calculate confidence score for the parsing result"""
        
        score = 0.0
        
        # Product identification (40% weight)
        if product_info.get("name"):
            score += 0.2
        if product_info.get("category"):
            score += 0.2
        
        # Quantity extraction (30% weight)
        if quantity_info.get("quantity", 0) > 0:
            score += 0.15
        if quantity_info.get("unit") != "units":
            score += 0.15
        
        # Quality specifications (30% weight)
        if quality_info.get("requirements"):
            score += 0.15
        if quality_info.get("certifications"):
            score += 0.15
        
        return round(score, 2)

# Initialize parser
trade_parser = TradeItemParser()

@router.post("/parse-item", response_model=Dict[str, Any])
async def parse_trade_item(description: str) -> Dict[str, Any]:
    """
    Parse a natural language trade description into structured data
    
    Example: "I want to import 5000 kg of organic turmeric powder from India to Germany within 30 days"
    """
    
    try:
        if not description or len(description.strip()) < 10:
            raise HTTPException(status_code=400, detail="Description too short. Please provide more details.")
        
        parsed_result = trade_parser.parse_trade_description(description)
        
        # Save RFQ to MongoDB and emit event
        parsed_result["request_id"] = f"RFQ-{uuid.uuid4().hex[:8]}"
        
        db = get_database()
        if db is not None:
            await db.trade_requests.insert_one(parsed_result.copy())
            
            # Fire event to the continuous intelligence event bus
            await event_bus.emit("RFQ_CREATED", parsed_result)
        
        return {
            "success": True,
            "parsed_item": parsed_result,
            "message": f"Successfully parsed: {parsed_result['product_name']} ({parsed_result['product_category']})"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

@router.get("/product-categories", response_model=Dict[str, List[str]])
async def get_product_categories():
    """Get all supported product categories and their keywords"""
    
    return {
        "categories": trade_parser.product_categories,
        "message": "Supported product categories for trade parsing"
    }

@router.get("/hs-codes", response_model=Dict[str, str])
async def get_hs_codes():
    """Get HS code patterns and descriptions"""
    
    return {
        "hs_codes": trade_parser.hs_code_patterns,
        "message": "HS code patterns for reference"
    }

@router.post("/validate-parsed-item", response_model=Dict[str, Any])
async def validate_parsed_item(parsed_item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and enhance a parsed trade item
    """
    
    try:
        validation_result = {
            "is_valid": True,
            "missing_fields": [],
            "suggestions": [],
            "enhanced_data": {}
        }
        
        # Check required fields
        required_fields = ["product_name", "quantity", "unit"]
        for field in required_fields:
            if not parsed_item.get(field):
                validation_result["is_valid"] = False
                validation_result["missing_fields"].append(field)
        
        # Add suggestions
        if parsed_item.get("confidence_score", 0) < 0.5:
            validation_result["suggestions"].append("Consider providing more specific product details")
        
        if not parsed_item.get("destination_country"):
            validation_result["suggestions"].append("Specify destination country for better matching")
        
        # Enhance data with defaults
        if not parsed_item.get("delivery_deadline"):
            from datetime import timedelta
            default_deadline = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            validation_result["enhanced_data"]["delivery_deadline"] = default_deadline
        
        return validation_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
