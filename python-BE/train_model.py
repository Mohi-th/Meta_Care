import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pickle

# Load the dataset
df = pd.read_csv("maternal_complications_data.csv")

# Handle missing values (assuming no missing values here, but just in case)
numerical_cols = df.select_dtypes(include=['float64', 'int64']).columns
categorical_cols = df.select_dtypes(include=['object']).columns

df[numerical_cols] = df[numerical_cols].fillna(df[numerical_cols].mean())
df[categorical_cols] = df[categorical_cols].fillna(df[categorical_cols].mode().iloc[0])

# Encode the target variable 'Complication' into numeric labels
le = LabelEncoder()
df['Complication'] = le.fit_transform(df['Complication'])

# Features and target variable
X = df.drop("Complication", axis=1)
y = df["Complication"]

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train the RandomForestClassifier model
model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

# Save the trained model to a file
with open("complication_model.pkl", "wb") as f:
    pickle.dump(model, f)

# Check the model accuracy (optional)
print("Model accuracy on test set:", model.score(X_test, y_test))

print("\nModel trained and saved as complication_model.pkl")
