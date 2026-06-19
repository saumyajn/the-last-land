from firebase_functions import https_fn, options
from firebase_functions.params import SecretParam
from firebase_admin import initialize_app
from google import genai
from google.genai import types
import base64
import json
import os
import re

app = initialize_app()
GEMINI_API_KEY_SECRET = SecretParam("GEMINI_API_KEY")
DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite"
DEFAULT_GEMINI_BACKUP_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.5-flash",
]


def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY") or GEMINI_API_KEY_SECRET.value
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it as a Firebase Functions secret "
            "for production, or set it locally before starting the emulator."
        )

    return genai.Client(api_key=api_key)


def get_gemini_model_name():
    return os.environ.get("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)


def get_gemini_model_candidates() -> list:
    primary_model = get_gemini_model_name()
    backup_models = os.environ.get("GEMINI_BACKUP_MODELS", "")
    model_names = [
        primary_model,
        *[model.strip() for model in backup_models.split(",") if model.strip()],
        *DEFAULT_GEMINI_BACKUP_MODELS,
    ]

    seen = set()
    return [model for model in model_names if not (model in seen or seen.add(model))]


def should_try_backup_model(error: Exception) -> bool:
    error_text = str(error).lower()
    return any(
        marker in error_text
        for marker in [
            "not_found",
            "not found",
            "resource_exhausted",
            "quota",
            "rate limit",
            "rate_limit",
            "429",
            "503",
            "unavailable",
            "overloaded",
        ]
    )


def extract_retry_delay(error: Exception) -> str:
    error_text = str(error)
    retry_delay_match = re.search(r"retryDelay['\"]?:\s*['\"]?(\d+)s", error_text)
    if retry_delay_match:
        return f"{retry_delay_match.group(1)}s"

    retry_in_match = re.search(r"retry in ([\d.]+)s", error_text, re.IGNORECASE)
    if retry_in_match:
        seconds = float(retry_in_match.group(1))
        return f"{round(seconds)}s"

    return ""


def summarize_model_error(model_name: str, error: Exception) -> str:
    error_text = str(error)
    retry_delay = extract_retry_delay(error)

    if "RESOURCE_EXHAUSTED" in error_text or "quota" in error_text.lower() or "429" in error_text:
        summary = f"{model_name}: quota/rate limit hit"
    elif "UNAVAILABLE" in error_text or "503" in error_text or "high demand" in error_text.lower():
        summary = f"{model_name}: temporarily unavailable/high demand"
    elif "NOT_FOUND" in error_text or "not found" in error_text.lower():
        summary = f"{model_name}: model unavailable for this key/project"
    else:
        summary = f"{model_name}: {error_text[:160]}"

    if retry_delay:
        summary += f" (retry after {retry_delay})"

    return summary


def remove_negative_signs(value):
    if isinstance(value, dict):
        return {key: remove_negative_signs(nested_value) for key, nested_value in value.items()}
    if isinstance(value, list):
        return [remove_negative_signs(item) for item in value]
    if isinstance(value, str):
        return value.replace("-", "")
    if isinstance(value, (int, float)) and value < 0:
        return abs(value)
    return value


@https_fn.on_call(
    secrets=[GEMINI_API_KEY_SECRET],
    cors=options.CorsOptions(
        cors_origins=[
            "https://the-last-land-analytics.vercel.app",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ],
        cors_methods=["get", "post"],
    )
)
def process_image_extraction(req: https_fn.CallableRequest) -> dict:
    image_base64 = req.data.get("image")
    expected_type = req.data.get("expectedType", "STATS")

    if not image_base64:
        return {"success": False, "error": "No image provided"}

    prompt = """
    You are an expert data extraction assistant for a gaming application. 
    Analyze this screenshot and extract the statistics into a strict JSON format.
    Do NOT wrap the output in markdown blocks (e.g., ```json). Return ONLY the raw JSON object.
    Remove all commas, '%' signs, and minus signs from numbers. Always return positive values.
    Example: if the image shows -130.5%, return 130.5.
    Ensure values are integers or floats. If a value is missing, return 0 or "NA".
    """

    if expected_type == "REPORT":
        prompt += """
       Look for the table of troops and extract data into exactly this JSON structure. 
        Only use the keys listed here. If a troop type is not found in the image, omit it or set values to 0:
        {
          "T10_guards": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T10_cavalry": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T10_archer": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T10_siege": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T9_cavalry": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T9_archer": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T8_cavalry": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T8_archer": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T8_siege": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T7_cavalry": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 },
          "T7_archer": { "Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0 }
        }
        """
    else:
        prompt += """
      Extract the flat statistical attributes found in the image into this exact JSON structure. 
            Strip out all '%' signs and commas. Return values as integers or floats. If a stat is missing in the image, set its value to 0:
            {
              "Cavalry Attack": 0, "Cavalry Health": 0, "Cavalry Defense": 0, "Cavalry Damage": 0, "Cavalry Damage Received": 0, "Cavalry Attack Blessing": 0, "Cavalry Protection Blessing": 0,
              "Archer Attack": 0, "Archer Health": 0, "Archer Defense": 0, "Archer Damage": 0, "Archer Damage Received": 0, "Archer Attack Blessing": 0, "Archer Protection Blessing": 0,
              "Siege Attack": 0, "Siege Health": 0, "Siege Defense": 0, "Siege Damage": 0, "Siege Damage Received": 0, "Siege Attack Blessing": 0, "Siege Protection Blessing": 0,
              "Troop Attack": 0, "Troop Health": 0, "Troop Defense": 0, "Troop Damage": 0, "Troop Damage Received": 0, "Troop Attack Blessing": 0, "Troop Protection Blessing": 0,
              "Lethal Hit Rate": 0
            }
        """

    client = None
    try:
        client = get_gemini_client()
        image_bytes = base64.b64decode(image_base64)
        response = None
        model_errors = []
        for model_name in get_gemini_model_candidates():
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        prompt,
                        types.Part.from_bytes(
                            data=image_bytes,
                            mime_type="image/jpeg",
                        ),
                    ],
                )
                if model_name != get_gemini_model_name():
                    print(f"Gemini primary model failed; used backup model {model_name}.")
                break
            except Exception as model_error:
                model_errors.append(summarize_model_error(model_name, model_error))
                print(f"Gemini model {model_name} failed: {model_error}")
                if not should_try_backup_model(model_error):
                    raise

        if response is None:
            return {
                "success": False,
                "error": (
                    "Gemini is currently rate-limited or overloaded for all configured extraction models. "
                    "Try again after the retry delay, or set GEMINI_MODEL/GEMINI_BACKUP_MODELS to another available model. "
                    "Tried: "
                    + "; ".join(model_errors)
                ),
            }

        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        extracted_data = remove_negative_signs(json.loads(raw_text.strip()))

        return {"success": True, "data": extracted_data}

    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        return {"success": False, "error": "Model returned invalid JSON format."}
    except Exception as e:
        print(f"Extraction Error: {e}")
        if "NOT_FOUND" in str(e) and "models/" in str(e):
            return {
                "success": False,
                "error": (
                    f"Gemini model '{get_gemini_model_name()}' is not available for this API key. "
                    "Set GEMINI_MODEL or GEMINI_BACKUP_MODELS in .env.local to available models."
                ),
            }
        return {"success": False, "error": str(e)}
    finally:
        if client is not None:
            client.close()
