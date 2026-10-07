import os
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

class StructuredCatalogItem(BaseModel):
    product_name: str = Field(description="Clean, generic name of the product")
    hs_code: str = Field(description="6-to-10 digit HS code for customs classification")
    quantity: float = Field(description="Numerical amount available for export")
    unit: str = Field(description="Unit of measurement, e.g., 'tons', 'kg', 'units'")
    category: str = Field(description="Broad industry category")
    compliance_requirements: list[str] = Field(description="Likely required compliance docs (e.g. FDA, Organic cert)")

class CatalogAgent:
    """
    Agent responsible for using Gemini to structure unformatted exporter 
    descriptions into a standardized marketplace product.
    """
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY not found. Catalog Agent will fail.")
        
        try:
            os.environ["GOOGLE_API_KEY"] = api_key or ""
            self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
            self.parser = JsonOutputParser(pydantic_object=StructuredCatalogItem)
            
            self.prompt = PromptTemplate(
                template="""You are an expert AI freight forwarder and trade compliance classifier.
Parse the following exporter description into a structured catalog item.

Description: {description}

{format_instructions}""",
                input_variables=["description"],
                partial_variables={"format_instructions": self.parser.get_format_instructions()},
            )
            self.chain = self.prompt | self.llm | self.parser
        except Exception as e:
            print(f"Failed to initialize Catalog Agent Gemini instance: {e}")
            self.llm = None

    async def generate_catalog(self, description: str) -> Dict[str, Any]:
        if not self.llm:
            return {"success": False, "message": "LLM not initialized."}
        
        try:
            print(f"\n[Catalog Agent] Classifying raw payload: '{description}'")
            # invoke synchronously since ChatGoogleGenerativeAI async invocation might have issues
            # Or use ainvoke if supported. We will use invoke.
            structured_data = self.chain.invoke({"description": description})
            
            # Enrich with origins or defaults if needed
            structured_data["origin_country"] = "Country Unspecified" # would be pulled from Exporter Profile
            
            print(f"   [Catalog Agent] Output: {structured_data}")
            return {"success": True, "catalog_item": structured_data}
        except Exception as e:
            print(f"[Catalog Agent] Failed: {e}")
            return {"success": False, "message": str(e)}

catalog_agent = CatalogAgent()
