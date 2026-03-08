from firebase_functions import https_fn, options, db_fn
from firebase_admin import initialize_app, firestore
from google.cloud import vision
import json

initialize_app()


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
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=base64_image)

        # Call Google Cloud to detect text
        response = client.document_text_detection(image=image)
        texts = response.full_text_annotation.text

        if not texts:
            response_data = {"text": "No text found."}
        else:
            # The first element contains the full text
            response_data = {"text": texts}

        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            headers=cors_headers,
            content_type="application/json",
        )

    except Exception as e:
        print(f"Vision API Error: {e}")
        return https_fn.Response(
            json.dumps({"error": f"Server Error: {str(e)}"}),
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
        ],
        cors_methods=["get", "post"],
    )
)
def process_image_ocr(req: https_fn.CallableRequest):
    if req.auth is None:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED, message="Log in first!"
        )

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

    user_email = req.auth.token.get("email")
    if user_email not in allowed_admins:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED, message="Admins only!"
        )

    # 3. OCR LOGIC: Call Google Vision
    client = vision.ImageAnnotatorClient()
    # req.data["image"] is the base64 string sent from your frontend
    image = vision.Image(content=req.data["image"])
    response = client.document_text_detection(image=image)

    texts = response.full_text_annotation.text
    return {"text": texts if texts else "No text found."}


@db_fn.on_document_created(document="reports/{reportId}")
def update_kpt_on_new_report(event: db_fn.Event[db_fn.DocumentSnapshot]):
    db = firestore.client()
    new_report = event.data.to_dict()

    # Reference to the summary document
    summary_ref = db.collection("analytics").document("troop_type_kpt")

    # Use a transaction to ensure data consistency
    @firestore.transactional
    def update_in_transaction(transaction, summary_ref, new_report):
        snapshot = summary_ref.get(transaction=transaction)
        current_totals = snapshot.to_dict() if snapshot.exists else {}

        troop_types = [
            "T10_guards",
            "T10_cavalry",
            "T10_archer",
            "T10_siege",
            "T9_cavalry",
            "T9_archer",
            "T8_cavalry",
            "T8_archer",
            "T8_siege",
            "T7_cavalry",
            "T7_archer",
        ]

        for t_type in troop_types:
            if t_type in new_report:
                report_stats = new_report[t_type]
                existing = current_totals.get(
                    t_type, {"Kills": 0, "Losses": 0, "Wounded": 0, "Survivors": 0}
                )

                # Increment totals
                existing["Kills"] += int(report_stats.get("Kills", 0))
                existing["Losses"] += int(report_stats.get("Losses", 0))
                existing["Wounded"] += int(report_stats.get("Wounded", 0))
                existing["Survivors"] += int(report_stats.get("Survivors", 0))

                # Recalculate KPT
                total_troops = (
                    existing["Survivors"] + existing["Losses"] + existing["Wounded"]
                )
                existing["KPT"] = (
                    f"{(existing['Kills'] / total_troops):.2f}"
                    if total_troops > 0
                    else "0.00"
                )

                current_totals[t_type] = existing

        transaction.set(summary_ref, current_totals)

    update_in_transaction(db.transaction(), summary_ref, new_report)
