from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd

app = Flask(__name__)
CORS(app)

with open("complication_model.pkl", "rb") as f:
    model = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    df = pd.DataFrame(data, index=[0])

    expected_columns = [
        'Age', 'Height', 'Weight', 'BP', 'BloodSugar',
        'Hemoglobin', 'HeartRate', 'Nausea', 'Vomiting',
        'BlurredVision', 'Headache'
    ]

    if not all(col in df.columns for col in expected_columns):
        return jsonify({"error": "Missing features"}), 400

    prediction = model.predict(df)

    complications = {
        0: "Anaemia",
        1: "None",
        2: "Preeclampsia",
        3: "Hypertension",
        4: "Gestational Diabetes",
        5: "Miscarriage",
        6: "Preterm Labour"
    }

    return jsonify({
        "prediction": complications.get(int(prediction[0]), "Unknown")
    })
