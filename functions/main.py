from firebase_functions import https_fn, options, firestore_fn
import google.cloud.firestore
from firebase_admin import initialize_app, firestore
from google.cloud import vision
from google.api_core.exceptions import PermissionDenied
from google.auth.exceptions import DefaultCredentialsError
import json
import os

app = initialize_app()


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


def extract_text_with_google_vision(base64_image: str, include_words: bool = False) -> dict:
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
        if "USER_PROJECT_DENIED" in error_text or "serviceusage.services.use" in error_text:
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
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": f"Request parsing failed: {str(e)}"}),
            status=400,
            headers=cors_headers,
            content_type="application/json",
        )

    # --- 3. GOOGLE VISION API ---
    try:
        response_data = extract_text_with_google_vision(base64_image)

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
                code=https_fn.FunctionsErrorCode.UNAUTHENTICATED, message="Log in first!"
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


# @firestore_fn.on_document_created(document="reports/{reportId}")
# def update_kpt_on_new_report(
#     event: firestore_fn.Event[firestore_fn.DocumentSnapshot],
# ) -> None:
#     """Automatically updates troop KPT summary when a new report is added."""
#     db = firestore.client()
#     new_report = event.data.to_dict()
#     if not new_report:
#         return

#     summary_ref = db.collection("analytics").document("troop_type_kpt")

#     # Define the troop types you track
#     troop_types = [
#         "T10_guards",
#         "T10_cavalry",
#         "T10_archer",
#         "T10_siege",
#         "T9_cavalry",
#         "T9_archer",
#         "T8_cavalry",
#         "T8_archer",
#         "T8_siege",
#         "T7_cavalry",
#         "T7_archer",
#     ]

#     # Use a transaction for data integrity
#     @google.cloud.firestore.transactional
#     def update_in_transaction(transaction, summary_ref, new_report):
#         snapshot = summary_ref.get(transaction=transaction)
#         current_totals = snapshot.to_dict() if snapshot.exists else {}

#         for t_type in troop_types:
#             if t_type in new_report:
#                 report_stats = new_report[t_type]
#                 existing = current_totals.get(
#                     t_type, {"Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0}
#                 )

#                 # Sum the values
#                 existing["Kills"] += int(report_stats.get("Kills", 0))
#                 existing["Losses"] += int(report_stats.get("Losses", 0))
#                 existing["Wounded"] += int(report_stats.get("Wounded", 0))
#                 existing["Survivors"] += int(report_stats.get("Survivors", 0))

#                 # Calculate KPT ( (Kills - Losses - Wounded) / Total Troops)
#                 total = existing["Survivors"] + existing["Losses"] + existing["Wounded"]
#                 kills = existing["Kills"]
#                 losses = existing["Losses"]
#                 wounded = existing["Wounded"]
#                 existing["KPT"] = (
#                     f"{((kills - losses - wounded) / total):.2f}" if total > 0 else "0.00"
#                 )

#                 current_totals[t_type] = existing

#         transaction.set(summary_ref, current_totals)

#     update_in_transaction(db.transaction(), summary_ref, new_report)
