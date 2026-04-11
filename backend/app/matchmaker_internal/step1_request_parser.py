"""
🔹 STEP 1: Trade Request Parser (Input Layer)

This is the first layer of the Matchmaker Agent.
It receives raw trade requests and converts them into structured TradeRequest objects.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, validator
import re
import uuid

class TradeRequest(BaseModel):
    """
    Internal representation of a trade request
    This is what the agent works with internally
    """
    
    # Core identifiers
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Product information
    product_name: str
    product_description: Optional[str] = ""
    hs_code: str
    product_category: Optional[str] = ""
    
    # Quantity and specifications
    quantity: float
    unit: str = "units"
    quality_requirements: list[str] = []
    certifications_required: list[str] = []
    
    # Geographic information
    origin_country: Optional[str] = ""
    destination_country: str
    
    # Timing
    delivery_deadline: str
    urgency_days: Optional[int] = None
    
    # Financial
    budget_max: float
    budget_currency: str = "USD"
    payment_terms: Optional[str] = ""
    
    # Additional requirements
    special_requirements: list[str] = []
    preferred_shipping_method: Optional[str] = ""
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    processed_at: Optional[datetime] = None
    
    @validator('hs_code')
    def validate_hs_code(cls, v):
        """Validate HS code format"""
        if not re.match(r'^\d{6,10}$', v):
            raise ValueError('HS code must be 6-10 digits')
        return v
    
    @validator('delivery_deadline')
    def validate_deadline(cls, v):
        """Validate delivery deadline format"""
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('Deadline must be in YYYY-MM-DD format')
        return v
    
    @validator('quantity')
    def validate_quantity(cls, v):
        """Validate quantity is positive"""
        if v <= 0:
            raise ValueError('Quantity must be positive')
        return v

class TradeRequestParser:
    """
    🔹 STEP 1: Request Parser Component
    
    This component:
    1. Receives raw JSON trade requests
    2. Validates and cleans the data
    3. Converts to internal TradeRequest object
    4. Extracts initial metadata
    """
    
    def __init__(self):
        self.parsing_stats = {
            "total_requests": 0,
            "successful_parses": 0,
            "failed_parses": 0,
            "common_errors": {}
        }
    
    def parse_request(self, raw_request: Dict[str, Any]) -> TradeRequest:
        """
        Parse raw trade request into structured TradeRequest object
        
        Args:
            raw_request: Raw JSON request from API
            
        Returns:
            TradeRequest: Structured internal representation
            
        Raises:
            ValueError: If request is invalid
        """
        self.parsing_stats["total_requests"] += 1
        
        try:
            # Step 1.1: Clean and normalize input
            cleaned_request = self._clean_input(raw_request)
            
            # Step 1.2: Extract and validate fields
            parsed_request = self._extract_fields(cleaned_request)
            
            # Add user_id to parsed request
            parsed_request['user_id'] = raw_request.get('user_id', '')
            
            # Step 1.3: Create TradeRequest object
            trade_request = TradeRequest(**parsed_request)
            
            # Step 1.4: Add derived fields
            trade_request = self._add_derived_fields(trade_request)
            
            self.parsing_stats["successful_parses"] += 1
            return trade_request
            
        except Exception as e:
            self.parsing_stats["failed_parses"] += 1
            error_msg = str(e)
            self.parsing_stats["common_errors"][error_msg] = \
                self.parsing_stats["common_errors"].get(error_msg, 0) + 1
            raise ValueError(f"Failed to parse trade request: {error_msg}")
    
    def _clean_input(self, raw_request: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and normalize raw input data"""
        
        cleaned = {}
        
        # Text fields - strip whitespace and normalize
        text_fields = [
            'product_name', 'product_description', 'hs_code',
            'origin_country', 'destination_country', 'unit',
            'budget_currency', 'payment_terms', 'preferred_shipping_method'
        ]
        
        for field in text_fields:
            value = raw_request.get(field, '')
            if isinstance(value, str):
                cleaned[field] = value.strip().title() if field != 'hs_code' else value.strip()
            else:
                cleaned[field] = str(value) if value else ''
        
        # Numeric fields - ensure proper types
        numeric_fields = ['quantity', 'budget_max']
        for field in numeric_fields:
            value = raw_request.get(field, 0)
            try:
                cleaned[field] = float(value)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid {field}: must be a number")
        
        # List fields - ensure list type
        list_fields = [
            'quality_requirements', 'certifications_required',
            'special_requirements'
        ]
        for field in list_fields:
            value = raw_request.get(field, [])
            if isinstance(value, str):
                # Split comma-separated strings
                cleaned[field] = [item.strip() for item in value.split(',') if item.strip()]
            elif isinstance(value, list):
                cleaned[field] = [str(item).strip() for item in value if str(item).strip()]
            else:
                cleaned[field] = []
        
        # Required fields validation (check after cleaning)
        # This will be checked in _extract_fields instead
        
        # Copy remaining fields
        for key, value in raw_request.items():
            if key not in cleaned and key != 'user_id':  # user_id handled separately
                cleaned[key] = value
        
        return cleaned
    
    def _extract_fields(self, cleaned_request: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and validate all required fields"""
        
        # Required fields validation
        required_fields = ['product_name', 'hs_code', 'quantity', 'destination_country', 'delivery_deadline', 'budget_max']
        for field in required_fields:
            if not cleaned_request.get(field):
                raise ValueError(f"Missing required field: {field}")
        
        # Core fields mapping
        field_mapping = {
            'product_name': 'product_name',
            'product_description': 'product_description',
            'hs_code': 'hs_code',
            'quantity': 'quantity',
            'unit': 'unit',
            'destination_country': 'destination_country',
            'delivery_deadline': 'delivery_deadline',
            'budget_max': 'budget_max',
            'budget_currency': 'budget_currency',
            'origin_country': 'origin_country',
            'payment_terms': 'payment_terms',
            'preferred_shipping_method': 'preferred_shipping_method'
        }
        
        extracted = {}
        for json_field, model_field in field_mapping.items():
            if json_field in cleaned_request:
                extracted[model_field] = cleaned_request[json_field]
        
        # List fields
        extracted['quality_requirements'] = cleaned_request.get('quality_requirements', [])
        extracted['certifications_required'] = cleaned_request.get('certifications_required', [])
        extracted['special_requirements'] = cleaned_request.get('special_requirements', [])
        
        return extracted
    
    def _add_derived_fields(self, trade_request: TradeRequest) -> TradeRequest:
        """Add derived fields based on request analysis"""
        
        # Calculate urgency in days
        deadline = datetime.strptime(trade_request.delivery_deadline, '%Y-%m-%d')
        today = datetime.now()
        urgency = (deadline - today).days
        
        trade_request.urgency_days = max(0, urgency)
        
        # Extract product category from HS code (simplified)
        if trade_request.hs_code.startswith('09'):
            trade_request.product_category = "Coffee, Tea, Spices"
        elif trade_request.hs_code.startswith('07'):
            trade_request.product_category = "Vegetables"
        elif trade_request.hs_code.startswith('08'):
            trade_request.product_category = "Fruits"
        else:
            trade_request.product_category = "General Merchandise"
        
        return trade_request
    
    def get_parsing_stats(self) -> Dict[str, Any]:
        """Get parsing statistics for monitoring"""
        return self.parsing_stats.copy()
    
    def reset_stats(self):
        """Reset parsing statistics"""
        self.parsing_stats = {
            "total_requests": 0,
            "successful_parses": 0,
            "failed_parses": 0,
            "common_errors": {}
        }

# Example Usage
if __name__ == "__main__":
    parser = TradeRequestParser()
    
    # Example raw request
    raw_request = {
        "user_id": "user_123",
        "product_name": "Organic Turmeric Powder",
        "product_description": "Premium quality organic turmeric powder for cooking",
        "hs_code": "091030",
        "quantity": 5000,
        "unit": "kg",
        "destination_country": "Germany",
        "delivery_deadline": "2026-05-01",
        "budget_max": 12000,
        "budget_currency": "USD",
        "certifications_required": ["Organic", "FDA Approved"],
        "special_requirements": ["Moisture content < 10%"]
    }
    
    try:
        trade_request = parser.parse_request(raw_request)
        print(f"✅ Successfully parsed request: {trade_request.request_id}")
        print(f"   Product: {trade_request.product_name}")
        print(f"   Category: {trade_request.product_category}")
        print(f"   Urgency: {trade_request.urgency_days} days")
        
    except ValueError as e:
        print(f"❌ Parsing failed: {e}")
