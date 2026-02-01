from firebase_functions import https_fn
from firebase_admin import initialize_app
from google.cloud import vision
import json

initialize_app()

@https_fn.on_request(min_instances=0)
def extract_text_from_image(req: https_fn.Request) -> https_fn.Response:
    # --- 1. STRICT CORS HEADERS ---
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '3600'
    }

    # Handle Pre-flight
    if req.method == 'OPTIONS':
        return https_fn.Response('', status=204, headers=cors_headers)

    # --- 2. PARSE REQUEST ---
    try:
        request_json = req.get_json(silent=True)
        if not request_json or 'image' not in request_json:
            return https_fn.Response(
                json.dumps({"error": "Missing 'image' field"}), 
                status=400, 
                headers=cors_headers,
                content_type='application/json'
            )
        base64_image = request_json['image']
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": f"Request parsing failed: {str(e)}"}), 
            status=400, 
            headers=cors_headers,
            content_type='application/json'
        )

    # --- 3. GOOGLE VISION API ---
    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=base64_image)
        
        # Call Google Cloud to detect text
        response = client.text_detection(image=image)
        texts = response.text_annotations

        if not texts:
            response_data = {"text": "No text found."}
        else:
            # The first element contains the full text
            response_data = {"text": texts[0].description}

        return https_fn.Response(
            json.dumps(response_data), 
            status=200, 
            headers=cors_headers,
            content_type='application/json'
        )

    except Exception as e:
        print(f"Vision API Error: {e}")
        return https_fn.Response(
            json.dumps({"error": f"Server Error: {str(e)}"}), 
            status=500, 
            headers=cors_headers,
            content_type='application/json'
        )