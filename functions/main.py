from firebase_functions import https_fn, options, firestore_fn
import google.cloud.firestore
from firebase_admin import initialize_app, firestore
from google.cloud import vision
from google.api_core.exceptions import PermissionDenied
from google.auth.exceptions import DefaultCredentialsError
from google import genai
from google.genai import types
import base64
import json
import os
import re

app = initialize_app()
DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite"
DEFAULT_GEMINI_BACKUP_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.5-flash",
]


def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Start the emulator with "
            '`$env:GEMINI_API_KEY="your_key"` before `npm.cmd run emulators`.'
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
    cors=options.CorsOptions(
        # Use 'cors_origins' and 'cors_methods' (not 'origins'/'methods')
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

    # Base instructions for the model
    prompt = """
    You are an expert data extraction assistant for a gaming application. 
    Analyze this screenshot and extract the statistics into a strict JSON format.
    Do NOT wrap the output in markdown blocks (e.g., ```json). Return ONLY the raw JSON object.
    Remove all commas, '%' signs, and minus signs from numbers. Always return positive values.
    Example: if the image shows -130.5%, return 130.5.
    Ensure values are integers or floats. If a value is missing, return 0 or "NA".
    """

    # Contextual routing based on what page the user is uploading from
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
    else:  # STATS
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

        # Strip potential markdown formatting that LLMs sometimes include
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


def is_running_in_emulator() -> bool:
    return (
        os.environ.get("FUNCTIONS_EMULATOR") == "true"
        or os.environ.get("FIREBASE_EMULATOR_HUB") is not None
        or os.environ.get("FIREBASE_AUTH_EMULATOR_HOST") is not None
    )


def bounding_poly_to_box(bounding_poly) -> dict:
    vertices = bounding_poly.vertices or []
    xs = [vertex.x for vertex in vertices if vertex.x is not None]
    ys = [vertex.y for vertex in vertices if vertex.y is not None]

    if not xs or not ys:
        return {"x": 0, "y": 0, "width": 0, "height": 0}

    left = min(xs)
    top = min(ys)
    return {
        "x": left,
        "y": top,
        "width": max(xs) - left,
        "height": max(ys) - top,
    }


def collect_vision_words(full_text_annotation) -> list:
    words = []

    for page in full_text_annotation.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    text = "".join(symbol.text for symbol in word.symbols).strip()
                    if not text:
                        continue

                    box = bounding_poly_to_box(word.bounding_box)
                    words.append(
                        {
                            "text": text,
                            "x": box["x"],
                            "y": box["y"],
                            "width": box["width"],
                            "height": box["height"],
                        }
                    )

    return words


def extract_text_with_google_vision(
    base64_image: str, include_words: bool = False
) -> dict:
    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=base64_image)
        response = client.document_text_detection(image=image)
    except DefaultCredentialsError as exc:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message=(
                "Google Vision credentials are missing. For local emulator OCR, "
                "run `gcloud auth application-default login` or set "
                "GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file."
            ),
        ) from exc
    except PermissionDenied as exc:
        error_text = str(exc)
        if (
            "USER_PROJECT_DENIED" in error_text
            or "serviceusage.services.use" in error_text
        ):
            message = (
                "Google Vision permission denied for project image-to-data-9a90b. "
                "Grant the caller Service Usage Consumer on that Google Cloud project, "
                "then run `gcloud auth application-default set-quota-project image-to-data-9a90b`, "
                "or use a service account JSON with Vision access."
            )
        else:
            message = (
                "Google Vision permission denied. Grant the caller Cloud Vision API User "
                "or use a service account JSON with Vision access."
            )

        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message=message,
        ) from exc
    except Exception as exc:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Google Vision OCR failed: {str(exc)}",
        ) from exc

    full_text_annotation = response.full_text_annotation
    texts = full_text_annotation.text if full_text_annotation else ""
    result = {"text": texts if texts else "No text found."}

    if include_words and full_text_annotation:
        result["words"] = collect_vision_words(full_text_annotation)

    return result


@https_fn.on_request(min_instances=0)
def extract_text_from_image(req: https_fn.Request) -> https_fn.Response:
    # --- 1. STRICT CORS HEADERS ---
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "3600",
    }

    # Handle Pre-flight
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204, headers=cors_headers)

    # --- 2. PARSE REQUEST ---
    try:
        request_json = req.get_json(silent=True)
        if not request_json or "image" not in request_json:
            return https_fn.Response(
                json.dumps({"error": "Missing 'image' field"}),
                status=400,
                headers=cors_headers,
                content_type="application/json",
            )
        base64_image = request_json["image"]
        include_words = bool(request_json.get("includeWords"))
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": f"Request parsing failed: {str(e)}"}),
            status=400,
            headers=cors_headers,
            content_type="application/json",
        )

    # --- 3. GOOGLE VISION API ---
    try:
        response_data = extract_text_with_google_vision(base64_image, include_words)

        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            headers=cors_headers,
            content_type="application/json",
        )

    except https_fn.HttpsError as e:
        print(f"Vision API Error: {e.message}")
        return https_fn.Response(
            json.dumps({"error": e.message}),
            status=500,
            headers=cors_headers,
            content_type="application/json",
        )


@https_fn.on_call(
    cors=options.CorsOptions(
        # Use 'cors_origins' and 'cors_methods' (not 'origins'/'methods')
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
def process_image_ocr(req: https_fn.CallableRequest):
    is_emulator = is_running_in_emulator()

    if req.auth is None:
        if not is_emulator:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                message="Log in first!",
            )
    elif is_emulator:
        print("Functions emulator detected; treating OCR caller as local admin.")

    # Keep this list synchronized with src/utils/config.js until admin roles are moved
    # to Firebase custom claims or a Firestore-backed role document.
    allowed_admins = [
        "saums06@gmail.com",
        "sanketvazesvsv@gmail.com",
        "sanketvazesvsvsv@gmail.com",
        "saumyajn1994@gmail.com",
        "evil.micha.777@gmail.com",
        "selistongama194@gmail.com",
        "silenttkkiller2@gmail.com",
        "angelaquino621@gmail.com",
        "coemaincastle@gmail.com",
    ]

    user_email = req.auth.token.get("email") if req.auth is not None else None
    if not is_emulator and user_email not in allowed_admins:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED, message="Admins only!"
        )

    return extract_text_with_google_vision(
        req.data["image"],
        bool(req.data.get("includeWords")),
    )
