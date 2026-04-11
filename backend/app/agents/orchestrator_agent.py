import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain.tools import tool

# Load environment variables
load_dotenv()

# We securely wrap our deterministic Python agents into LangChain Tools
@tool
def trigger_matchmaker_search(commodity: str) -> str:
    """
    Use this tool to find suppliers for a specific commodity or product.
    Input should be the name of the product (e.g., 'coffee', 'cotton shirts').
    This triggers the deterministic TF-IDF Matchmaker Agent in the backend.
    """
    # In a real system, this would call `autonomous_matchmaker_service.run_matchmaker(...)`
    # and return the results. For the orchestrator demo, we simulate the routing.
    return f"ACTION_ROUTING: MATCHMAKER_TRIGGERED for {commodity}. Opening frontend Matchmaker Agent."

@tool
def fetch_live_commodity_price(commodity: str) -> str:
    """
    Use this tool if the user asks for the current market value or pricing 
    of a specific commodity (e.g. 'what is the current price of turmeric').
    This queries the deterministic Market Intelligence Agent.
    """
    from app.agents.market_agent import market_agent
    try:
        data = market_agent.analyze_market_price(commodity)
        price = data.get("market_price")
        source = data.get("data_source")
        trend = data.get("market_trend")
        return f"The current live price for {commodity} is ₹{price} INR per unit. This is sourced from {source}. The market is currently {trend}."
    except Exception as e:
        return f"Error fetching market price: {e}"

@tool
def trigger_negotiation_and_documents(supplier_name: str, commodity: str) -> str:
    """
    Use this tool to finalize a trade. This will trigger the Negotiation Agent to 
    secure a price, and subsequently trigger the Document Agent to mint the legal PDFs.
    Input needs to describe who to trade with and what commodity.
    """
    return f"ACTION_ROUTING: TRADE_FINALIZED for {commodity} with {supplier_name}. Autonomously executing Negotiation and Document Generation pipelines."

@tool
def assess_supplier_risk(supplier_id: str) -> str:
    """
    Use this tool to calculate the real-time aggregated risk profile of a supplier.
    This aggregates Supplier Risk, Financial Risk, Logistics Risk, Compliance Risk, and Market Risk.
    Input should be the ID or name of the supplier to assess.
    """
    return f"ACTION_ROUTING: RISK_ASSESSMENT_TRIGGERED for {supplier_id}. Triggering multi-pillar Risk Gatekeeper."

@tool
def plan_logistics(origin: str, destination: str, commodity: str) -> str:
    """
    Use this tool to finding the Pareto-optimal shipping routes balancing Sea/Air/Land costs, 
    transit time, and carbon footprints, powered by real-time Risk Agent weather assessments.
    Input should include the origin city, destination city, and product.
    """
    return f"ACTION_ROUTING: LOGISTICS_PLANNING_TRIGGERED for {commodity} from {origin} to {destination}. Opening full multi-modal route dashboard."

class TradeOSOrchestrator:
    """
    The Brain of the TradeOS Platform. 
    It parses unstructured natural language from the user, decides which deterministic 
    Python agents/tools to use, and returns structured execution plans or answers.
    """
    def __init__(self):
        # We require a GEMINI_API_KEY in the .env file.
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("⚠️ WARNING: GEMINI_API_KEY not found in environment. Orchestrator will fail if called.")
            
        try:
            # We must pass the key explicitly if it's not set as GOOGLE_API_KEY naturally in the env
            os.environ["GOOGLE_API_KEY"] = self.api_key or ""
            self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
        except Exception as e:
            print(f"Failed to initialize Gemini: {e}")
            self.llm = None
            
        self.tools = [
            trigger_matchmaker_search,
            fetch_live_commodity_price,
            trigger_negotiation_and_documents,
            assess_supplier_risk,
            plan_logistics
        ]
        
        if self.llm:
            try:
                # In modern langchain (1.x+) tools can often just be bound directly
                # to the LLM since the models natively support Tool Calling
                self.agent = self.llm.bind_tools(self.tools)
            except Exception as e:
                print(f"Failed to bind tools: {e}")
                self.agent = self.llm

    def process_query(self, query: str) -> dict:
        """
        Executes a natural language query against the LangChain Orchestrator.
        """
        if not self.api_key or not self.llm:
            return {
                "status": "error",
                "message": "Orchestrator strictly requires a GEMINI_API_KEY to function. Please configure the .env file."
            }
            
        try:
            print(f"\n🧠 [Orchestrator Agent] Processing natural language intent: '{query}'")
            
            # Use raw message invocation
            msg = HumanMessage(content=query)
            ai_msg = self.agent.invoke([msg])
            
            # Parse response
            # Since we bound tools, if the model wants to call a tool, it returns tool_calls
            response = ai_msg.content
            
            # NEW FALLBACK: Gemini 1.5/2.5 sometimes returns a list of content blocks instead of a flat string
            if isinstance(response, list):
                try:
                    text_parts = [b.get("text", "") for b in response if isinstance(b, dict) and b.get("type") == "text"]
                    response = " ".join(text_parts) if text_parts else str(response)
                except Exception:
                    response = str(response)
            
            # Check if tools were called
            if hasattr(ai_msg, 'tool_calls') and ai_msg.tool_calls:
                # The model *wanted* to call a tool. We will extract the routing from the tool name.
                tool_call = ai_msg.tool_calls[0]
                tool_name = tool_call['name']
                tool_args = tool_call['args']
                
                print(f"   [Orchestrator] Invoking tool: {tool_name} with {tool_args}")
                
                # Manually execute the tool since we dropped AgentExecutor
                action_type = "chat"
                action_target = None
                
                if tool_name == "trigger_matchmaker_search":
                    action_type = "navigate_matchmaker"
                    action_target = tool_args.get('commodity', '')
                    response = f"ACTION_ROUTING: MATCHMAKER_TRIGGERED for {action_target}. Opening frontend Matchmaker Agent."
                    
                elif tool_name == "trigger_negotiation_and_documents":
                    action_type = "execute_trade_pipeline"
                    response = f"ACTION_ROUTING: TRADE_FINALIZED for {tool_args.get('commodity')} with {tool_args.get('supplier_name')}. Autonomously executing Negotiation and Document Generation pipelines."
                    
                elif tool_name == "assess_supplier_risk":
                    action_type = "execute_risk_assessment"
                    response = f"ACTION_ROUTING: RISK_ASSESSMENT_TRIGGERED for {tool_args.get('supplier_id')}. Running multi-pillar Risk Analytics."
                    
                elif tool_name == "plan_logistics":
                    action_type = "execute_logistics_planning"
                    response = f"ACTION_ROUTING: LOGISTICS_PLANNING_TRIGGERED for {tool_args.get('commodity')} from {tool_args.get('origin')} to {tool_args.get('destination')}. Autonomously analyzing Sea/Air tradeoffs with CCT optimization."
                    
                elif tool_name == "fetch_live_commodity_price":
                    # Execute tool function directly
                    response = fetch_live_commodity_price.invoke({'commodity': tool_args.get('commodity')})
                
                return {
                    "status": "success",
                    "message": response,
                    "action_type": action_type,
                    "action_target": action_target
                }
            else:
                # Standard chat response
                return {
                    "status": "success",
                    "message": response,
                    "action_type": "chat",
                    "action_target": None
                }
                
            return {
                "status": "success",
                "message": response,
                "action_type": action_type,
                "action_target": action_target
            }
            
        except Exception as e:
            print(f"   [Orchestrator Agent] Execution failed: {str(e)}")
            return {
                "status": "error",
                "message": f"Orchestrator encounter an error: {str(e)}"
            }

# Singleton
orchestrator = TradeOSOrchestrator()
