import os
import base64
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

class ProductIntelligenceResult(BaseModel):
    product_name: str = Field(description="Detected name of the product")
    category: str = Field(description="Broad industry category")
    hs_code: str = Field(description="Predicted 6-digit HS Code for customs")
    confidence: float = Field(description="Confidence score of detection (0.0 to 100.0)")
    certifications: List[str] = Field(description="List of detected certifications (e.g. Organic, ISO, FSSAI)")
    quality_score: float = Field(description="Estimated product/packaging quality score (0.0 to 100.0)")
    verification_score: float = Field(description="Confidence score that the image is a real, valid product (0.0 to 100.0)")
    trade_readiness_score: float = Field(description="Overall trade readiness score combining quality, certs, and verification (0.0 to 100.0)")
    extracted_text: str = Field(description="Any notable text extracted via OCR from the packaging")
    image_url: str = Field(description="Path to the image")

class ProductIntelligenceAgent:
    """
    Agent responsible for using Gemini Vision to analyze a product image,
    extract OCR data, predict HS codes, and generate a verified product profile.
    """
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️ WARNING: GEMINI_API_KEY not found. Product Intelligence Agent will fail.")
        
        try:
            self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1)
            self.parser = JsonOutputParser(pydantic_object=ProductIntelligenceResult)
        except Exception as e:
            print(f"Failed to initialize Product Intelligence Agent: {e}")
            self.llm = None

    async def analyze_product_image(self, image_bytes: bytes, image_url: str = "") -> Dict[str, Any]:
        if not self.llm:
            return {"success": False, "message": "Vision LLM not initialized."}
        
        try:
            image_data = base64.b64encode(image_bytes).decode("utf-8")
            
            prompt = """You are an expert TradeOS Product Intelligence Agent, specializing in international trade compliance, computer vision, OCR, and HS code classification.
Analyze the provided product image and generate a complete verified trade-ready product profile.

Perform the following tasks:
1. Identify the product name and broad category.
2. Predict the most accurate 6-digit HS Code for this product.
3. Extract any text visible on the packaging (Brand, Weight, Details).
4. Detect any certification logos (e.g., Organic, ISO, FSSAI, Global GAP, CE).
5. Estimate the visual quality score of the product/packaging (0-100).
6. Provide a verification score indicating how likely this is a genuine product photo (0-100).
7. Calculate an overall Trade Readiness Score (0-100) based on the presence of certs and quality.

Respond ONLY with valid JSON matching the following schema. Do not include markdown code blocks.
"""
            format_instructions = self.parser.get_format_instructions()
            
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt + "\n" + format_instructions},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
                ]
            )
            
            response = self.llm.invoke([message])
            
            try:
                # Sometimes the LLM wraps it in ```json ... ``` despite instructions
                response_text = response.content
                if response_text.startswith("```json"):
                    response_text = response_text[7:-3]
                elif response_text.startswith("```"):
                    response_text = response_text[3:-3]
                
                structured_data = self.parser.parse(response_text.strip())
                structured_data["image_url"] = image_url
                
                print(f"🧠 [Product Intelligence] Analyzed: {structured_data['product_name']} | HS: {structured_data['hs_code']} | Readiness: {structured_data['trade_readiness_score']}")
                
                return {"success": True, "profile": structured_data}
            except Exception as parse_error:
                print(f"JSON Parse Error in Product Intelligence: {parse_error}\nResponse was: {response.content}")
                return {"success": False, "message": f"Failed to parse vision response: {parse_error}"}
                
        except Exception as e:
            print(f"❌ [Product Intelligence Agent] Failed: {e}")
            return {"success": False, "message": str(e)}

product_intelligence_agent = ProductIntelligenceAgent()
