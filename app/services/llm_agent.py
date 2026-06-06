"""
llm_agent.py — Production-Style tool-calling voice copilot agent using Paytm Inference API.
This is the heart of the AI Munshi CFO assistant.
Never generates SQL raw queries. Uses structured python tools.
"""

import os
import json
import inspect
import requests
from datetime import datetime, date
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.services import business_tools
from app.services.knowledge_base import retrieve_knowledge

# --- OPENAI SCHEMAS FOR ALL BUSINESS COPILOT TOOLS ---

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_today_revenue",
            "description": "Get today's total sales/revenue."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenue",
            "description": "Get total revenue for a specific period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "description": "The time period (today, yesterday, this_week, last_week, this_month, last_month, this_year)"
                    }
                },
                "required": ["period"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_breakdown",
            "description": "Get sales/revenue breakdown by category and payment mode."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_best_sales_day",
            "description": "Get the best sales day (highest revenue day) in history."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenue_trend",
            "description": "Get monthly revenue growth trend."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_profile",
            "description": "Get customer details, visit count, spend, outstanding udhar, relationship type, and late repayment count.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the customer"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_spend",
            "description": "Get total spending of a specific customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the customer"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_visit_count",
            "description": "Get total visit count of a specific customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the customer"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_customer",
            "description": "Get the highest spending/best customer."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_customers",
            "description": "Get a list of the top customers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of customers to return (default is 5)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_count",
            "description": "Get total count of unique active customers."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_vip_customers",
            "description": "Get list of VIP and loyal customers."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_at_risk_customers",
            "description": "Get list of at-risk customers (high credit risk)."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_udhar",
            "description": "Get outstanding udhar amount, days pending, and risk level for a customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the customer"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_total_udhar",
            "description": "Get total outstanding udhar in the store."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pending_customers",
            "description": "Get list of all customers with pending outstanding credit."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_risky_customers",
            "description": "Get list of customers with risky payment profiles."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_udhar_report",
            "description": "Get overall credit report including recovery rate and top debtors."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_udhar",
            "description": "Record/add new credit (udhar) given to a customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the customer"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Amount of credit extended"
                    }
                },
                "required": ["name", "amount"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "repay_udhar",
            "description": "Record payment (repayment) received from a customer. If amount is omitted, clears their entire balance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the customer"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Amount repaid (omit to clear full outstanding)"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "clear_udhar",
            "description": "Clear all outstanding udhar balance for a specific customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the customer"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_reminder",
            "description": "Send a WhatsApp payment reminder message to a specific customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the customer"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_bulk_reminders",
            "description": "Send collection reminders to all customers with pending udhar."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_expenses",
            "description": "Get total expenses for a specific period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "description": "The time period (today, yesterday, this_week, last_week, this_month, last_month, this_year)"
                    }
                },
                "required": ["period"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_expense_breakdown",
            "description": "Get category-wise expense breakdown for a specific period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "description": "The time period"
                    }
                },
                "required": ["period"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_expense_category",
            "description": "Get highest expense category for a period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "description": "The period (default is this_month)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_supplier_due",
            "description": "Get pending due amount, due date, category, and reliability score for a supplier.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the supplier"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_supplier_payments",
            "description": "Get payment history/ledger entries for a supplier.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the supplier"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_all_supplier_dues",
            "description": "Get outstanding dues to all suppliers/vendors."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pending_bills",
            "description": "Get outstanding utility or service bills."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_bill_by_type",
            "description": "Get utility bills by type (e.g. Electricity, Water, Internet).",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "description": "Type of bill"
                    }
                },
                "required": ["type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_bills",
            "description": "Get upcoming pending bills sorted by due date."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_gst_status",
            "description": "Get GST registration status and legal recommendations."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_gst_turnover",
            "description": "Get GST taxable vs exempt turnover breakdown."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_gst_threshold_progress",
            "description": "Get progress towards the ₹40 Lakh mandatory GST registration threshold."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_loan_score",
            "description": "Get CFO loan readiness score and details."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_loan_eligibility",
            "description": "Get loan eligibility decision and risk analysis."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_eligible_loan_amount",
            "description": "Get maximum estimated loan amount you can borrow."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_loan_recommendations",
            "description": "Get recommendations to improve your loan eligibility score."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "simulate_loan_score",
            "description": "Simulate what happens to your loan score if you clear customer udhars.",
            "parameters": {
                "type": "object",
                "properties": {
                    "simulated_repayments": {
                        "type": "number",
                        "description": "The amount of customer udhar recovered/paid back"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_business_health",
            "description": "Get general high-level business health summary."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_biggest_business_problem",
            "description": "Analyze metrics and identify the biggest pain point in the business right now."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_next_best_action",
            "description": "Identify the immediate next action recommended by the CFO advisor."
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_cashflow",
            "description": "Get monthly net cash flow (inflow vs outflow)."
        }
    }
]

# --- SYSTEM ROLE PROMPT ---

SYSTEM_PROMPT = """\
You are "AI Munshi" — the official AI assistant, CFO, accountant, business advisor, credit manager, and operations assistant for small Indian merchants (kirana stores, chai stalls, salons, pharmacies).
You connect directly to their store database to perform analysis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 LANGUAGE & TONE RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Speak and answer in the SAME language the user speaks.
  * If the user asks in HINDI (Devanagari), reply in warm, clear Hindi.
  * If the user asks in ROMAN HINGLISH, reply in friendly, conversational Hinglish.
  * If the user asks in MARATHI, reply in Marathi.
  * If the user asks in ENGLISH, reply in English.
- Hinglish tone: A natural, friendly mix of Hindi and English. Never formal/robotic.
  Example: "Haan bilkul! Aapka aaj ka total revenue 8,450 rupaye tha — kal se 12% zyada. Kafi accha din raha!"
- End answers with a light check: "Aur kuch help chahiye?" or "Koi aur sawal?".
- Do not repeat long list items unless asked. Keep responses brief (2-4 lines).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 FINANCIAL GUARDRAILS & FAILURE BEHAVIORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NEVER hallucinate or invent numbers.
2. If data is unavailable or missing:
   Reply: "Mere paas is jaankari ka data uplabdh nahi hai." (or the equivalent in the user's language)
3. If a tool fails or throws an error:
   Reply: "Is samay data retrieve nahi ho pa raha."
4. You MUST call tools to answer any business metric/data query. Never quote static answers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ MULTI-STEP / COMPOUND INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- If the user asks multiple actions (e.g. "Mohan ko 500 udhar do aur usko reminder bhejo"), call both `add_udhar` and `send_reminder` sequentially before giving the final answer.
- If the user asks a simulation (e.g. "Agar Mohan aur Ravi paise de dein toh score kitna badhega?"), first check Mohan's udhar, check Ravi's udhar, sum them, call `simulate_loan_score(simulated_repayments=...)` with the sum, then reply with the simulation result.

Current Date context: {current_date}
"""

# --- INFERENCE CLIENTS ---

def _call_paytm_inference(api_key: str, model: str, messages: list, tools: list = None) -> dict:
    url = "https://api.inference.paytm.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.1,
    }
    if tools:
        payload["tools"] = tools
        
    res = requests.post(url, headers=headers, json=payload, timeout=25)
    if res.status_code != 200:
        raise Exception(f"Paytm completions endpoint returned {res.status_code}: {res.text}")
    return res.json()

def _call_gemini_fallback(api_key: str, messages: list, tools: list = None) -> dict:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    # Translate OpenAI schema to Gemini format
    contents = []
    system_instruction = None
    
    for m in messages:
        if m["role"] == "system":
            system_instruction = {"parts": [{"text": m["content"]}]}
        elif m["role"] == "user":
            contents.append({"role": "user", "parts": [{"text": m["content"]}]})
        elif m["role"] == "assistant":
            parts = []
            if m.get("content"):
                parts.append({"text": m["content"]})
            if m.get("tool_calls"):
                for tc in m["tool_calls"]:
                    parts.append({
                        "functionCall": {
                            "name": tc["function"]["name"],
                            "args": json.loads(tc["function"]["arguments"])
                        }
                    })
            contents.append({"role": "model", "parts": parts})
        elif m["role"] == "tool":
            contents.append({
                "role": "tool",
                "parts": [{
                    "functionResponse": {
                        "name": m.get("name", "tool_call"),
                        "response": {"output": m["content"]}
                    }
                }]
            })
            
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": 0.1}
    }
    if system_instruction:
        payload["system_instruction"] = system_instruction
        
    if tools:
        gemini_tools = []
        for t in tools:
            f = t["function"]
            gemini_tools.append({
                "name": f["name"],
                "description": f["description"],
                "parameters": f.get("parameters", {"type": "OBJECT", "properties": {}})
            })
        payload["tools"] = [{"functionDeclarations": gemini_tools}]
        
    res = requests.post(url, headers=headers, json=payload, timeout=25)
    if res.status_code != 200:
        raise Exception(f"Gemini fallback error: {res.text}")
        
    res_data = res.json()
    part = res_data["candidates"][0]["content"]["parts"][0]
    
    # Format back into OpenAI shape
    response_msg = {"role": "assistant", "content": None}
    if "text" in part:
        response_msg["content"] = part["text"]
    if "functionCall" in part:
        fc = part["functionCall"]
        response_msg["tool_calls"] = [{
            "id": f"call_{int(datetime.now().timestamp())}",
            "type": "function",
            "function": {
                "name": fc["name"],
                "arguments": json.dumps(fc.get("args", {}))
            }
        }]
    return {"choices": [{"message": response_msg}]}

def _call_groq_fallback(api_key: str, messages: list, tools: list = None) -> dict:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.1
    }
    if tools:
        payload["tools"] = tools
        
    res = requests.post(url, headers=headers, json=payload, timeout=25)
    if res.status_code != 200:
        raise Exception(f"Groq fallback error: {res.text}")
    return res.json()

# --- TOOL EXECUTOR ---

def _execute_tool(tool_name: str, args: dict, db: Session, merchant_id: str) -> str:
    try:
        func = getattr(business_tools, tool_name, None)
        if not func:
            return json.dumps({"error": f"Tool '{tool_name}' not found."})
            
        sig = inspect.signature(func)
        func_params = {}
        if "db" in sig.parameters:
            func_params["db"] = db
        if "merchant_id" in sig.parameters:
            func_params["merchant_id"] = merchant_id
            
        for param in sig.parameters:
            if param in args:
                func_params[param] = args[param]
                
        res = func(**func_params)
        return json.dumps(res, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})

# --- MAIN AGENT LOOP ---

def process_voice_llm(
    transcript: str, db: Session, merchant_id: str = "merchant_001"
) -> dict | None:
    if os.getenv("TESTING") != "true":
        load_dotenv(override=True)
    if os.getenv("TESTING") == "true" and os.getenv("ALLOW_LLM_TEST") != "true":
        return None
        
    paytm_key = os.getenv("PAYTM_INFERENCE_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    
    if not paytm_key and not gemini_key and not groq_key:
        return None  # No LLM keys -> run rule-based fallback
        
    # Check if this is a product support question and fetch RAG help context
    help_keywords = ["use", "add", "kaise", "kya hai", "matlab", "karta hoon", "karoon", "karu", "reminder", "backup", "security", "vyapar", "tally", "margin"]
    rag_context = ""
    if any(kw in transcript.lower() for kw in help_keywords):
        rag_context = retrieve_knowledge(transcript, top_n=3)
        
    current_date_str = date.today().strftime("%d %B %Y")
    sys_prompt = SYSTEM_PROMPT.format(current_date=current_date_str)
    
    if rag_context:
        sys_prompt += f"\n\n📖 RETRIEVED HELP DOCUMENTATION:\n{rag_context}\nUse this guide/documentation to answer the user's question accurately."
        
    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": transcript}
    ]
    
    MAX_TURNS = 6
    for turn in range(MAX_TURNS):
        try:
            response_json = None
            if paytm_key and paytm_key != "your_paytm_inference_api_key_here":
                try:
                    response_json = _call_paytm_inference(paytm_key, "moonshotai.kimi-k2.5", messages, TOOLS_SCHEMA)
                except Exception as e:
                    print(f"[Paytm Primary Model] Failed: {e}. Falling back to versatile...")
                    try:
                        response_json = _call_paytm_inference(paytm_key, "llama-3.3-70b-versatile", messages, TOOLS_SCHEMA)
                    except Exception as e2:
                        print(f"[Paytm Versatile Model] Failed: {e2}. Falling back to Gemini/Groq fallback providers...")
                        response_json = None
            
            if response_json is None:
                if gemini_key and gemini_key != "your_gemini_api_key_here":
                    try:
                        response_json = _call_gemini_fallback(gemini_key, messages, TOOLS_SCHEMA)
                    except Exception as gemini_err:
                        print(f"[Gemini Fallback] Failed: {gemini_err}. Trying Groq fallback...")
                
                if response_json is None:
                    if groq_key and groq_key != "your_grok_or_groq_api_key_here" and groq_key != "your_groq_api_key_here":
                        try:
                            response_json = _call_groq_fallback(groq_key, messages, TOOLS_SCHEMA)
                        except Exception as groq_err:
                            print(f"[Groq Fallback] Failed: {groq_err}.")
                
                if response_json is None:
                    return {"intent": "general", "response_text": "Maaf kijiye, main server se contact nahi kar paa raha hoon."}
        except Exception as e:
            print(f"[LLM Agent Error] Turn {turn} api call failed: {e}")
            return {"intent": "general", "response_text": "Is samay data retrieve nahi ho pa raha."}
            
        message = response_json["choices"][0]["message"]
        messages.append(message)
        
        # Check for tool calling
        if "tool_calls" in message and message["tool_calls"]:
            for tool_call in message["tool_calls"]:
                tool_name = tool_call["function"]["name"]
                try:
                    tool_args = json.loads(tool_call["function"]["arguments"])
                except Exception:
                    tool_args = {}
                print(f"[LLM Agent] Executing tool: {tool_name}({tool_args})")
                tool_output = _execute_tool(tool_name, tool_args, db, merchant_id)
                print(f"[LLM Agent] Tool output: {tool_output[:200]}")
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.get("id"),
                    "name": tool_name,
                    "content": tool_output
                })
        else:
            # Done! Return the assistant's final response text
            res_content = message.get("content", "")
            return {"intent": "general", "response_text": res_content}
            
    return {"intent": "general", "response_text": "Is samay data retrieve nahi ho pa raha."}
