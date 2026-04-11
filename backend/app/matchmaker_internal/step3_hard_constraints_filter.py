"""
🔹 STEP 3: Hard Constraints Filter (Initial Filtering)

This layer applies strict business rules to filter out ineligible suppliers.
It reduces the search space from thousands to hundreds before AI processing.
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import asyncio
from abc import ABC, abstractmethod

from .step1_request_parser import TradeRequest
from .step2_preprocessing_engine import PreprocessedRequest

@dataclass
class Supplier:
    """Internal supplier representation"""
    supplier_id: str
    company_name: str
    country: str
    business_type: str  # 'exporter', 'manufacturer', 'trader'
    
    # Product capabilities
    hs_codes: List[str]
    products: List[str]
    categories: List[str]
    
    # Capacity and logistics
    production_capacity: float  # Annual capacity in units
    capacity_unit: str
    min_order_quantity: float
    delivery_countries: List[str]
    
    # Quality and compliance
    verification_level: int  # 0-5 scale
    certifications: List[str]
    quality_standards: List[str]
    
    # Performance metrics
    total_trades: int
    success_rate: float
    on_time_delivery_rate: float
    average_rating: float
    
    # Business details
    years_in_business: int
    company_size: str  # 'micro', 'small', 'medium', 'large'
    response_time_hours: float
    
    # Risk and compliance
    risk_score: float  # 0-1, lower is better
    compliance_status: str  # 'compliant', 'restricted', 'sanctioned'
    
    # Metadata
    last_updated: datetime
    active: bool

class FilterRule(ABC):
    """Abstract base class for filter rules"""
    
    def __init__(self, name: str, weight: float = 1.0, mandatory: bool = True):
        self.name = name
        self.weight = weight
        self.mandatory = mandatory
        self.filter_stats = {
            "total_checked": 0,
            "passed": 0,
            "failed": 0,
            "failure_reasons": {}
        }
    
    @abstractmethod
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """
        Apply filter rule to supplier
        
        Returns:
            Tuple[bool, str]: (passed, reason_if_failed)
        """
        pass
    
    def update_stats(self, passed: bool, reason: str = ""):
        """Update filter statistics"""
        self.filter_stats["total_checked"] += 1
        if passed:
            self.filter_stats["passed"] += 1
        else:
            self.filter_stats["failed"] += 1
            self.filter_stats["failure_reasons"][reason] = \
                self.filter_stats["failure_reasons"].get(reason, 0) + 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get filter statistics"""
        return self.filter_stats.copy()

class HSCodeFilter(FilterRule):
    """Filter suppliers by HS code compatibility"""
    
    def __init__(self):
        super().__init__("HS Code Filter", weight=1.0, mandatory=True)
    
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """Check if supplier can handle the requested HS code"""
        requested_hs = request.original_request.hs_code
        
        # Direct match
        if requested_hs in supplier.hs_codes:
            self.update_stats(True)
            return True, ""
        
        # Category match (first 2 digits)
        if requested_hs[:2] in [hs[:2] for hs in supplier.hs_codes]:
            self.update_stats(True)
            return True, "Category match"
        
        self.update_stats(False, f"HS code {requested_hs} not supported")
        return False, f"HS code {requested_hs} not supported"

class GeographicFilter(FilterRule):
    """Filter suppliers by geographic capabilities"""
    
    def __init__(self):
        super().__init__("Geographic Filter", weight=1.0, mandatory=True)
    
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """Check if supplier can ship to destination country"""
        destination = request.original_request.destination_country
        
        # Direct shipping capability
        if destination in supplier.delivery_countries:
            self.update_stats(True)
            return True, ""
        
        # Check if supplier is in same region (might be able to arrange shipping)
        destination_region = self._get_region(destination)
        supplier_region = self._get_region(supplier.country)
        
        if destination_region == supplier_region and destination_region != "unknown":
            self.update_stats(True)
            return True, "Regional shipping possible"
        
        self.update_stats(False, f"Cannot ship to {destination}")
        return False, f"Cannot ship to {destination}"
    
    def _get_region(self, country_code: str) -> str:
        """Get region from country code"""
        regions = {
            'europe': ['de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'se', 'no', 'dk', 'fi', 'gb', 'pl', 'cz'],
            'north_america': ['us', 'ca', 'mx'],
            'asia': ['cn', 'in', 'jp', 'kr', 'sg', 'th', 'vn', 'my', 'id', 'ph'],
            'middle_east': ['ae', 'sa', 'qa', 'kw', 'bh', 'om', 'il'],
            'south_america': ['br', 'ar', 'cl', 'pe', 'co', 've', 'uy', 'py'],
            'africa': ['za', 'ng', 'ke', 'eg', 'ma', 'tz', 'gh', 'tn']
        }
        
        for region, countries in regions.items():
            if country_code.lower() in countries:
                return region
        
        return "unknown"

class CapacityFilter(FilterRule):
    """Filter suppliers by production capacity"""
    
    def __init__(self):
        super().__init__("Capacity Filter", weight=1.0, mandatory=True)
    
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """Check if supplier has sufficient capacity"""
        requested_qty = request.original_request.quantity
        
        # Check minimum order quantity
        if requested_qty < supplier.min_order_quantity:
            self.update_stats(False, f"Below minimum order quantity ({supplier.min_order_quantity})")
            return False, f"Below minimum order quantity ({supplier.min_order_quantity})"
        
        # Check production capacity (annual capacity should be at least 10x order)
        annual_capacity = supplier.production_capacity
        if annual_capacity < requested_qty * 10:
            self.update_stats(False, f"Insufficient production capacity")
            return False, f"Insufficient production capacity"
        
        self.update_stats(True)
        return True, ""

class VerificationFilter(FilterRule):
    """Filter suppliers by verification level"""
    
    def __init__(self, min_verification_level: int = 2):
        super().__init__("Verification Filter", weight=1.0, mandatory=True)
        self.min_verification_level = min_verification_level
    
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """Check if supplier meets minimum verification requirements"""
        if supplier.verification_level < self.min_verification_level:
            self.update_stats(False, f"Insufficient verification level ({supplier.verification_level})")
            return False, f"Insufficient verification level ({supplier.verification_level})"
        
        self.update_stats(True)
        return True, ""

class CertificationFilter(FilterRule):
    """Filter suppliers by required certifications"""
    
    def __init__(self):
        super().__init__("Certification Filter", weight=0.8, mandatory=False)  # Not mandatory for flexibility
    
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """Check if supplier has required certifications"""
        required_certs = request.original_request.certifications_required
        
        if not required_certs:
            self.update_stats(True)
            return True, "No certifications required"
        
        supplier_certs = [cert.lower() for cert in supplier.certifications]
        
        # Check if all required certifications are available
        missing_certs = []
        for req_cert in required_certs:
            req_cert_lower = req_cert.lower()
            found = False
            
            # Direct match
            if req_cert_lower in supplier_certs:
                found = True
            else:
                # Partial match (e.g., 'organic' matches 'certified organic')
                for supplier_cert in supplier_certs:
                    if req_cert_lower in supplier_cert or supplier_cert in req_cert_lower:
                        found = True
                        break
            
            if not found:
                missing_certs.append(req_cert)
        
        if missing_certs:
            self.update_stats(False, f"Missing certifications: {', '.join(missing_certs)}")
            return False, f"Missing certifications: {', '.join(missing_certs)}"
        
        self.update_stats(True)
        return True, ""

class PerformanceFilter(FilterRule):
    """Filter suppliers by performance metrics"""
    
    def __init__(self, min_success_rate: float = 0.7, min_rating: float = 3.0):
        super().__init__("Performance Filter", weight=0.9, mandatory=False)
        self.min_success_rate = min_success_rate
        self.min_rating = min_rating
    
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """Check if supplier meets minimum performance standards"""
        
        # Success rate check
        if supplier.success_rate < self.min_success_rate:
            self.update_stats(False, f"Low success rate ({supplier.success_rate:.2f})")
            return False, f"Low success rate ({supplier.success_rate:.2f})"
        
        # Rating check
        if supplier.average_rating < self.min_rating:
            self.update_stats(False, f"Low rating ({supplier.average_rating:.1f})")
            return False, f"Low rating ({supplier.average_rating:.1f})"
        
        # Minimum trades check (avoid new suppliers with no track record)
        if supplier.total_trades < 5:
            self.update_stats(False, f"Insufficient trade history ({supplier.total_trades} trades)")
            return False, f"Insufficient trade history ({supplier.total_trades} trades)"
        
        self.update_stats(True)
        return True, ""

class RiskFilter(FilterRule):
    """Filter suppliers by risk assessment"""
    
    def __init__(self, max_risk_score: float = 0.5):
        super().__init__("Risk Filter", weight=1.0, mandatory=True)
        self.max_risk_score = max_risk_score
    
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """Check if supplier risk score is acceptable"""
        if supplier.risk_score > self.max_risk_score:
            self.update_stats(False, f"High risk score ({supplier.risk_score:.2f})")
            return False, f"High risk score ({supplier.risk_score:.2f})"
        
        self.update_stats(True)
        return True, ""

class ComplianceFilter(FilterRule):
    """Filter suppliers by compliance status"""
    
    def __init__(self):
        super().__init__("Compliance Filter", weight=1.0, mandatory=True)
    
    def apply(self, supplier: Supplier, request: PreprocessedRequest) -> Tuple[bool, str]:
        """Check if supplier is compliant with regulations"""
        if supplier.compliance_status != 'compliant':
            self.update_stats(False, f"Non-compliant status: {supplier.compliance_status}")
            return False, f"Non-compliant status: {supplier.compliance_status}"
        
        self.update_stats(True)
        return True, ""

class HardConstraintsFilter:
    """
    🔹 STEP 3: Hard Constraints Filter
    
    Applies multiple filter rules to reduce supplier pool.
    This is the efficiency layer that eliminates obvious mismatches.
    """
    
    def __init__(self):
        # Initialize all filter rules
        self.filters = [
            HSCodeFilter(),
            GeographicFilter(),
            CapacityFilter(),
            VerificationFilter(min_verification_level=2),
            CertificationFilter(),  # Optional filter
            PerformanceFilter(min_success_rate=0.7, min_rating=3.0),  # Optional filter
            RiskFilter(max_risk_score=0.5),
            ComplianceFilter()
        ]
        
        # Overall statistics
        self.filtering_stats = {
            "total_suppliers_checked": 0,
            "suppliers_passed": 0,
            "suppliers_failed": 0,
            "filter_efficiency": 0.0,
            "processing_time_ms": 0.0
        }
    
    def filter_suppliers(
        self, 
        request: PreprocessedRequest,
        suppliers: List[Supplier]
    ) -> Tuple[List[Supplier], Dict[str, Any]]:
        """
        Apply all filter rules to supplier list
        
        Args:
            suppliers: List of all potential suppliers
            request: Preprocessed trade request
            
        Returns:
            Tuple[List[Supplier], Dict]: (filtered_suppliers, filtering_report)
        """
        start_time = datetime.now()
        
        print(f"🔍 Starting hard constraints filtering...")
        print(f"   Input suppliers: {len(suppliers)}")
        
        eligible_suppliers = []
        filtering_report = {
            "initial_count": len(suppliers),
            "filter_results": {},
            "elimination_reasons": {},
            "final_count": 0
        }
        
        for supplier in suppliers:
            self.filtering_stats["total_suppliers_checked"] += 1
            
            # Apply all mandatory filters first
            passed_mandatory = True
            mandatory_failures = []
            
            for filter_rule in self.filters:
                if filter_rule.mandatory:
                    passed, reason = filter_rule.apply(supplier, request)
                    if not passed:
                        passed_mandatory = False
                        mandatory_failures.append(f"{filter_rule.name}: {reason}")
                        break
            
            # If passed mandatory filters, apply optional filters
            if passed_mandatory:
                passed_optional = True
                optional_failures = []
                
                for filter_rule in self.filters:
                    if not filter_rule.mandatory:
                        passed, reason = filter_rule.apply(supplier, request)
                        if not passed:
                            passed_optional = False
                            optional_failures.append(f"{filter_rule.name}: {reason}")
                
                # Include supplier if passed all mandatory filters
                # (optional filters are for scoring, not elimination)
                eligible_suppliers.append(supplier)
                
                # Record any optional filter failures for later use
                if optional_failures:
                    filtering_report["elimination_reasons"][supplier.supplier_id] = {
                        "mandatory_failures": [],
                        "optional_failures": optional_failures,
                        "status": "passed_with_concerns"
                    }
                else:
                    filtering_report["elimination_reasons"][supplier.supplier_id] = {
                        "mandatory_failures": [],
                        "optional_failures": [],
                        "status": "passed_clean"
                    }
            else:
                # Record elimination reason
                filtering_report["elimination_reasons"][supplier.supplier_id] = {
                    "mandatory_failures": mandatory_failures,
                    "optional_failures": [],
                    "status": "eliminated"
                }
        
        # Update statistics
        self.filtering_stats["suppliers_passed"] = len(eligible_suppliers)
        self.filtering_stats["suppliers_failed"] = len(suppliers) - len(eligible_suppliers)
        self.filtering_stats["filter_efficiency"] = (
            self.filtering_stats["suppliers_failed"] / len(suppliers) if suppliers else 0
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        self.filtering_stats["processing_time_ms"] = processing_time
        
        # Complete filtering report
        filtering_report["final_count"] = len(eligible_suppliers)
        filtering_report["elimination_rate"] = self.filtering_stats["filter_efficiency"]
        filtering_report["processing_time_ms"] = processing_time
        
        # Individual filter statistics
        filtering_report["filter_stats"] = {}
        for filter_rule in self.filters:
            filtering_report["filter_stats"][filter_rule.name] = filter_rule.get_stats()
        
        print(f"✅ Filtering completed:")
        print(f"   Passed: {len(eligible_suppliers)} suppliers")
        print(f"   Eliminated: {len(suppliers) - len(eligible_suppliers)} suppliers")
        print(f"   Efficiency: {self.filtering_stats['filter_efficiency']:.1%}")
        print(f"   Processing time: {processing_time:.2f}ms")
        
        return eligible_suppliers, filtering_report
    
    def get_filtering_stats(self) -> Dict[str, Any]:
        """Get overall filtering statistics"""
        return self.filtering_stats.copy()
    
    def reset_stats(self):
        """Reset all statistics"""
        self.filtering_stats = {
            "total_suppliers_checked": 0,
            "suppliers_passed": 0,
            "suppliers_failed": 0,
            "filter_efficiency": 0.0,
            "processing_time_ms": 0.0
        }
        
        for filter_rule in self.filters:
            filter_rule.filter_stats = {
                "total_checked": 0,
                "passed": 0,
                "failed": 0,
                "failure_reasons": {}
            }

# Example Usage
if __name__ == "__main__":
    from .step1_request_parser import TradeRequestParser
    from step2_preprocessing_engine import PreprocessingEngine
    
    # Create sample suppliers
    sample_suppliers = [
        Supplier(
            supplier_id="sup_001",
            company_name="Global Spices Ltd",
            country="IN",
            business_type="exporter",
            hs_codes=["091030", "091020"],
            products=["Turmeric Powder", "Curry Powder", "Spice Mix"],
            categories=["Spices"],
            production_capacity=50000,
            capacity_unit="kg/year",
            min_order_quantity=100,
            delivery_countries=["DE", "FR", "IT", "US", "GB"],
            verification_level=4,
            certifications=["Organic", "FDA Approved", "ISO 9001"],
            quality_standards=["GMP", "HACCP"],
            total_trades=150,
            success_rate=0.95,
            on_time_delivery_rate=0.92,
            average_rating=4.7,
            years_in_business=15,
            company_size="medium",
            response_time_hours=12,
            risk_score=0.15,
            compliance_status="compliant",
            last_updated=datetime.now(),
            active=True
        ),
        Supplier(
            supplier_id="sup_002",
            company_name="Low Quality Export",
            country="CN",
            business_type="trader",
            hs_codes=["091010"],
            products=["Tea"],
            categories=["Beverages"],
            production_capacity=10000,
            capacity_unit="kg/year",
            min_order_quantity=1000,
            delivery_countries=["DE", "FR"],
            verification_level=1,
            certifications=["Basic"],
            quality_standards=["Basic"],
            total_trades=3,
            success_rate=0.33,
            on_time_delivery_rate=0.67,
            average_rating=2.1,
            years_in_business=2,
            company_size="micro",
            response_time_hours=72,
            risk_score=0.8,
            compliance_status="restricted",
            last_updated=datetime.now(),
            active=True
        )
    ]
    
    # Initialize components
    parser = TradeRequestParser()
    preprocessor = PreprocessingEngine()
    filter_engine = HardConstraintsFilter()
    
    # Process sample request
    raw_request = {
        "user_id": "user_123",
        "product_name": "Organic Turmeric Powder",
        "product_description": "Premium quality organic turmeric powder",
        "hs_code": "091030",
        "quantity": 5000,
        "unit": "kg",
        "destination_country": "Germany",
        "delivery_deadline": "2026-05-01",
        "budget_max": 12000,
        "certifications_required": ["Organic", "FDA Approved"]
    }
    
    try:
        # Step 1: Parse
        trade_request = parser.parse_request(raw_request)
        
        # Step 2: Preprocess
        preprocessed = preprocessor.preprocess_request(trade_request)
        
        # Step 3: Filter
        eligible_suppliers, report = filter_engine.filter_suppliers(sample_suppliers, preprocessed)
        
        print(f"\n📊 Filtering Results:")
        print(f"   Initial suppliers: {report['initial_count']}")
        print(f"   Final suppliers: {report['final_count']}")
        print(f"   Elimination rate: {report['elimination_rate']:.1%}")
        
        for supplier in eligible_suppliers:
            print(f"   ✅ {supplier.company_name} ({supplier.supplier_id})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
