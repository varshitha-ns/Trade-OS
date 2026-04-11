"""
🔹 STEP 2: Preprocessing Engine (Text Cleaning & Vectorization)

This layer takes the structured TradeRequest and prepares it for AI processing.
It converts text to vectors, normalizes values, and validates all data.
"""

from typing import Dict, List, Any, Tuple
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sentence_transformers import SentenceTransformer
import pickle
import os
from datetime import datetime

from .step1_request_parser import TradeRequest

class PreprocessedRequest:
    """
    Preprocessed trade request ready for AI processing
    Contains all vectors and normalized values
    """
    
    def __init__(self, original_request: TradeRequest):
        self.original_request = original_request
        self.request_id = original_request.request_id
        
        # Text vectors
        self.product_name_vector: np.ndarray = None
        self.description_vector: np.ndarray = None
        self.requirements_vector: np.ndarray = None
        self.combined_text_vector: np.ndarray = None
        
        # Normalized numeric values
        self.normalized_quantity: float = None
        self.normalized_budget: float = None
        self.normalized_urgency: float = None
        
        # Feature engineering results
        self.product_keywords: List[str] = []
        self.certification_flags: Dict[str, bool] = {}
        self.geographic_features: Dict[str, Any] = {}
        
        # Processing metadata
        self.processing_timestamp = datetime.now()
        self.vector_dimensions = 0

class TextPreprocessor:
    """Handles all text cleaning and normalization"""
    
    def __init__(self):
        self.stop_words = {
            'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were',
            'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'for', 'of', 'to', 'in', 'it', 'with',
            'by', 'from', 'or', 'but', 'not', 'no', 'yes', 'if', 'then', 'else', 'when',
            'where', 'why', 'how', 'what', 'who', 'whom', 'whose', 'which', 'that'
        }
    
    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text for vectorization
        
        Steps:
        1. Convert to lowercase
        2. Remove special characters
        3. Remove extra whitespace
        4. Remove stop words
        5. Normalize common terms
        """
        if not text:
            return ""
        
        # Step 1: Lowercase
        text = text.lower()
        
        # Step 2: Remove special characters (keep letters, numbers, spaces)
        text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
        
        # Step 3: Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Step 4: Remove stop words
        words = text.split()
        filtered_words = [word for word in words if word not in self.stop_words]
        
        # Step 5: Normalize common terms
        normalized_words = []
        for word in filtered_words:
            # Common trade term normalizations
            if word in ['organic', 'bio', 'natural']:
                normalized_words.append('organic')
            elif word in ['premium', 'high-quality', 'top-quality']:
                normalized_words.append('premium')
            elif word in ['certified', 'approved', 'verified']:
                normalized_words.append('certified')
            else:
                normalized_words.append(word)
        
        return ' '.join(normalized_words)
    
    def extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """Extract important keywords from text"""
        cleaned_text = self.clean_text(text)
        words = cleaned_text.split()
        
        # Simple keyword extraction based on word frequency and length
        word_freq = {}
        for word in words:
            if len(word) > 3:  # Only consider words longer than 3 characters
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top keywords
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:max_keywords]]

class Vectorizer:
    """Handles text vectorization using multiple approaches"""
    
    def __init__(self):
        # Initialize different vectorization models
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),  # Use bigrams as well
            stop_words='english',
            min_df=2,
            max_df=0.8
        )
        
        # Initialize sentence transformer for semantic embeddings
        try:
            self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        except:
            print("Warning: Sentence transformers not available, using TF-IDF only")
            self.sentence_model = None
        
        self.is_fitted = False
        self.vocab_size = 0
    
    def fit_on_corpus(self, corpus: List[str]):
        """Fit vectorizer on a corpus of documents"""
        if not corpus:
            return
        
        # Fit TF-IDF
        self.tfidf_vectorizer.fit(corpus)
        self.is_fitted = True
        self.vocab_size = len(self.tfidf_vectorizer.vocabulary_)
    
    def vectorize_text(self, text: str, method: str = 'tfidf') -> np.ndarray:
        """
        Convert text to vector
        
        Args:
            text: Input text
            method: 'tfidf' or 'sentence' or 'combined'
            
        Returns:
            Vector representation
        """
        if not text:
            return np.zeros(self.vocab_size if self.is_fitted else 1000)
        
        if method == 'tfidf':
            return self._vectorize_tfidf(text)
        elif method == 'sentence' and self.sentence_model:
            return self._vectorize_sentence(text)
        elif method == 'combined':
            return self._vectorize_combined(text)
        else:
            return self._vectorize_tfidf(text)
    
    def _vectorize_tfidf(self, text: str) -> np.ndarray:
        """TF-IDF vectorization"""
        if not self.is_fitted:
            # If not fitted, create a simple bag-of-words vector
            words = text.split()
            vocab = list(set(words))
            vector = np.zeros(len(vocab))
            for i, word in enumerate(vocab):
                vector[i] = words.count(word) / len(words)
            return vector
        
        try:
            vector = self.tfidf_vectorizer.transform([text]).toarray()[0]
            return vector
        except:
            return np.zeros(self.vocab_size)
    
    def _vectorize_sentence(self, text: str) -> np.ndarray:
        """Sentence transformer vectorization"""
        if not self.sentence_model:
            return np.zeros(384)  # Default dimension for MiniLM
        
        try:
            vector = self.sentence_model.encode(text)
            return vector
        except:
            return np.zeros(384)
    
    def _vectorize_combined(self, text: str) -> np.ndarray:
        """Combine TF-IDF and sentence embeddings"""
        tfidf_vector = self._vectorize_tfidf(text)
        sentence_vector = self._vectorize_sentence(text)
        
        # Concatenate both vectors
        combined = np.concatenate([tfidf_vector, sentence_vector])
        return combined

class NumericNormalizer:
    """Handles normalization of numeric values"""
    
    def __init__(self):
        self.scalers = {}
        self.fitted_ranges = {}
    
    def fit_quantity_scaler(self, quantities: List[float]):
        """Fit scaler on quantity data"""
        if not quantities:
            return
        
        scaler = MinMaxScaler()
        scaler.fit(np.array(quantities).reshape(-1, 1))
        self.scalers['quantity'] = scaler
        self.fitted_ranges['quantity'] = (min(quantities), max(quantities))
    
    def fit_budget_scaler(self, budgets: List[float]):
        """Fit scaler on budget data"""
        if not budgets:
            return
        
        scaler = MinMaxScaler()
        scaler.fit(np.array(budgets).reshape(-1, 1))
        self.scalers['budget'] = scaler
        self.fitted_ranges['budget'] = (min(budgets), max(budgets))
    
    def normalize_quantity(self, quantity: float) -> float:
        """Normalize quantity to 0-1 range"""
        if 'quantity' in self.scalers:
            return float(self.scalers['quantity'].transform([[quantity]])[0][0])
        else:
            # Simple log normalization if no scaler fitted
            return np.log1p(quantity) / 10  # Rough normalization
    
    def normalize_budget(self, budget: float) -> float:
        """Normalize budget to 0-1 range"""
        if 'budget' in self.scalers:
            return float(self.scalers['budget'].transform([[budget]])[0][0])
        else:
            # Simple log normalization if no scaler fitted
            return np.log1p(budget) / 15  # Rough normalization
    
    def normalize_urgency(self, urgency_days: int) -> float:
        """Normalize urgency (inverse - more urgent = higher value)"""
        if urgency_days <= 0:
            return 1.0  # Very urgent
        elif urgency_days >= 365:
            return 0.0  # Not urgent at all
        else:
            # Linear scale: 0 days = 1.0, 365 days = 0.0
            return 1.0 - (urgency_days / 365)

class FeatureEngineer:
    """Engineers additional features from the request"""
    
    def __init__(self):
        self.certification_types = [
            'organic', 'fda', 'iso', 'halal', 'kosher', 'gmp', 'haccp',
            'fair-trade', 'rainforest', 'non-gmo', 'gluten-free'
        ]
        
        self.regions = {
            'europe': ['de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'se', 'no', 'dk', 'fi'],
            'north_america': ['us', 'ca', 'mx'],
            'asia': ['cn', 'in', 'jp', 'kr', 'sg', 'th', 'vn', 'my', 'id'],
            'middle_east': ['ae', 'sa', 'qa', 'kw', 'bh', 'om'],
            'south_america': ['br', 'ar', 'cl', 'pe', 'co', 've'],
            'africa': ['za', 'ng', 'ke', 'eg', 'ma', 'tz']
        }
    
    def extract_certification_flags(self, certifications: List[str]) -> Dict[str, bool]:
        """Extract binary flags for different certification types"""
        flags = {}
        cert_text = ' '.join(certifications).lower()
        
        for cert_type in self.certification_types:
            flags[cert_type] = cert_type in cert_text
        
        return flags
    
    def extract_geographic_features(self, origin: str, destination: str) -> Dict[str, Any]:
        """Extract geographic features"""
        features = {
            'same_continent': False,
            'origin_region': 'unknown',
            'destination_region': 'unknown',
            'trade_distance': 'unknown'
        }
        
        # Determine regions
        origin_lower = origin.lower()[:2] if origin else ''
        dest_lower = destination.lower()[:2] if destination else ''
        
        for region, countries in self.regions.items():
            if origin_lower in countries:
                features['origin_region'] = region
            if dest_lower in countries:
                features['destination_region'] = region
        
        # Check if same continent
        features['same_continent'] = (
            features['origin_region'] == features['destination_region'] and 
            features['origin_region'] != 'unknown'
        )
        
        # Simple distance categorization
        if features['same_continent']:
            features['trade_distance'] = 'short'
        elif features['origin_region'] in ['europe', 'north_america'] and \
             features['destination_region'] in ['europe', 'north_america']:
            features['trade_distance'] = 'medium'
        else:
            features['trade_distance'] = 'long'
        
        return features

class PreprocessingEngine:
    """
    🔹 STEP 2: Main Preprocessing Engine
    
    Orchestrates all preprocessing steps:
    1. Text cleaning and normalization
    2. Vectorization
    3. Numeric normalization
    4. Feature engineering
    """
    
    def __init__(self):
        self.text_processor = TextPreprocessor()
        self.vectorizer = Vectorizer()
        self.numeric_normalizer = NumericNormalizer()
        self.feature_engineer = FeatureEngineer()
        
        # Processing statistics
        self.processing_stats = {
            "total_processed": 0,
            "avg_processing_time": 0,
            "vector_dimensions": 0
        }
    
    def preprocess_request(self, trade_request: TradeRequest) -> PreprocessedRequest:
        """
        Complete preprocessing pipeline for a trade request
        
        Args:
            trade_request: Structured trade request from Step 1
            
        Returns:
            PreprocessedRequest: Request ready for AI processing
        """
        start_time = datetime.now()
        
        # Create preprocessed request object
        preprocessed = PreprocessedRequest(trade_request)
        
        # Step 2.1: Text preprocessing
        cleaned_name = self.text_processor.clean_text(trade_request.product_name)
        cleaned_description = self.text_processor.clean_text(trade_request.product_description or "")
        cleaned_requirements = ' '.join([
            self.text_processor.clean_text(req) 
            for req in trade_request.special_requirements
        ])
        
        # Step 2.2: Extract keywords
        preprocessed.product_keywords = self.text_processor.extract_keywords(
            f"{cleaned_name} {cleaned_description}"
        )
        
        # Step 2.3: Vectorization
        preprocessed.product_name_vector = self.vectorizer.vectorize_text(cleaned_name, method='tfidf')
        preprocessed.description_vector = self.vectorizer.vectorize_text(cleaned_description, method='tfidf')
        preprocessed.requirements_vector = self.vectorizer.vectorize_text(cleaned_requirements, method='tfidf')
        
        # Combined text vector
        combined_text = f"{cleaned_name} {cleaned_description} {cleaned_requirements}"
        preprocessed.combined_text_vector = self.vectorizer.vectorize_text(combined_text, method='combined')
        
        # Step 2.4: Numeric normalization
        preprocessed.normalized_quantity = self.numeric_normalizer.normalize_quantity(trade_request.quantity)
        preprocessed.normalized_budget = self.numeric_normalizer.normalize_budget(trade_request.budget_max)
        preprocessed.normalized_urgency = self.numeric_normalizer.normalize_urgency(
            trade_request.urgency_days or 30
        )
        
        # Step 2.5: Feature engineering
        preprocessed.certification_flags = self.feature_engineer.extract_certification_flags(
            trade_request.certifications_required
        )
        preprocessed.geographic_features = self.feature_engineer.extract_geographic_features(
            trade_request.origin_country, trade_request.destination_country
        )
        
        # Set vector dimensions
        preprocessed.vector_dimensions = len(preprocessed.combined_text_vector)
        
        # Update processing stats
        processing_time = (datetime.now() - start_time).total_seconds()
        self.processing_stats["total_processed"] += 1
        self.processing_stats["avg_processing_time"] = (
            (self.processing_stats["avg_processing_time"] * (self.processing_stats["total_processed"] - 1) + 
             processing_time) / self.processing_stats["total_processed"]
        )
        self.processing_stats["vector_dimensions"] = preprocessed.vector_dimensions
        
        return preprocessed
    
    def fit_on_historical_data(self, historical_requests: List[TradeRequest]):
        """Fit preprocessing models on historical data"""
        print("🔧 Fitting preprocessing models on historical data...")
        
        # Extract text corpus for TF-IDF fitting
        corpus = []
        quantities = []
        budgets = []
        
        for req in historical_requests:
            # Add to corpus
            text = f"{req.product_name} {req.product_description or ''} {' '.join(req.special_requirements)}"
            corpus.append(text)
            
            # Add numeric data
            quantities.append(req.quantity)
            budgets.append(req.budget_max)
        
        # Fit models
        self.vectorizer.fit_on_corpus(corpus)
        self.numeric_normalizer.fit_quantity_scaler(quantities)
        self.numeric_normalizer.fit_budget_scaler(budgets)
        
        print(f"✅ Fitted on {len(corpus)} historical requests")
        print(f"   Vocabulary size: {self.vectorizer.vocab_size}")
        print(f"   Quantity range: {min(quantities)} - {max(quantities)}")
        print(f"   Budget range: {min(budgets)} - {max(budgets)}")
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get preprocessing statistics"""
        return self.processing_stats.copy()

# Example Usage
if __name__ == "__main__":
    from .step1_request_parser import TradeRequestParser
    
    # Initialize components
    parser = TradeRequestParser()
    preprocessor = PreprocessingEngine()
    
    # Example raw request
    raw_request = {
        "user_id": "user_123",
        "product_name": "Organic Turmeric Powder",
        "product_description": "Premium quality organic turmeric powder with high curcumin content",
        "hs_code": "091030",
        "quantity": 5000,
        "unit": "kg",
        "destination_country": "Germany",
        "delivery_deadline": "2026-05-01",
        "budget_max": 12000,
        "certifications_required": ["Organic", "FDA Approved"],
        "special_requirements": ["Moisture content < 10%", "High curcumin content"]
    }
    
    try:
        # Step 1: Parse request
        trade_request = parser.parse_request(raw_request)
        print(f"✅ Step 1: Parsed request {trade_request.request_id}")
        
        # Step 2: Preprocess
        preprocessed = preprocessor.preprocess_request(trade_request)
        print(f"✅ Step 2: Preprocessed request")
        print(f"   Keywords: {preprocessed.product_keywords}")
        print(f"   Vector dimensions: {preprocessed.vector_dimensions}")
        print(f"   Normalized quantity: {preprocessed.normalized_quantity:.3f}")
        print(f"   Normalized budget: {preprocessed.normalized_budget:.3f}")
        print(f"   Certification flags: {preprocessed.certification_flags}")
        print(f"   Geographic features: {preprocessed.geographic_features}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
