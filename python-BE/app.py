from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd

# Initialize the Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS

# Load the trained model
with open("complication_model.pkl", "rb") as f:
    model = pickle.load(f)

# Define the route for predictions
@app.route('/predict', methods=['POST'])
def predict():
    # Get the input data from the POST request
    data = request.get_json()
    print("Request received")

    # Convert the input data to a pandas DataFrame
    df = pd.DataFrame(data, index=[0])

    # Check if the required columns exist in the input
    expected_columns = ['Age', 'Height', 'Weight', 'BP', 'BloodSugar',
                        'Hemoglobin', 'HeartRate', 'Nausea', 'Vomiting',
                        'BlurredVision', 'Headache']
    if not all(col in df.columns for col in expected_columns):
        return jsonify({"error": "Missing one or more required features"}), 400

    # Make prediction using the model
    prediction = model.predict(df)

    # Define the complication dictionary
    complications = {
        0: "Anaemia",
        1: "None",
        2: "Preeclampsia",
        3: "Hypertension",
        4: "Gestational Diabetes",
        5: "Miscarriage",
        6: "Preterm Labour"
    }

    # Map prediction to complication name
    complication_name = complications.get(prediction[0], "Unknown")
    print("hello", complication_name)

    # Return the result as a JSON response
    return jsonify({"prediction": complication_name})

# Run the app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
