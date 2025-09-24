import pandas as pd
import os

# -------------------------------
# 1. Auto-detect dataset file
# -------------------------------
folder_path = r"C:\Users\A V Cusnatsova\OneDrive\Desktop\GitHub\DS_ML\DS_and_ML\Thyroid Diet Recommendation"
csv_file = None

for f in os.listdir(folder_path):
    if f.lower().endswith(".csv"):
        csv_file = os.path.join(folder_path, f)
        break

if not csv_file:
    print("❌ ERROR: No CSV file found in folder.")
    exit()

print(f"✅ Found dataset file: {os.path.basename(csv_file)}")

# -------------------------------
# 2. Load dataset
# -------------------------------
try:
    data = pd.read_csv(csv_file)
    print("✅ Dataset loaded successfully!\n")
    print("✅ Columns found:", list(data.columns), "\n")
except Exception as e:
    print("❌ ERROR loading dataset:", e)
    exit()

# -------------------------------
# 3. Search by Name
# -------------------------------
while True:
    name = input("Enter patient name (or 'exit' to quit): ").strip()
    if name.lower() == "exit":
        print("👋 Exiting program.")
        break

    # Case-insensitive & partial match
    result = data[data['Name'].str.lower().str.contains(name.lower(), na=False)]

    if not result.empty:
        print("\n📋 Patient details:\n")
        print(result.to_string(index=False))  # show rows without index numbers
        print("\n" + "-"*100 + "\n")
    else:
        print(f"❌ No patient found with name containing '{name}'. Try again.\n")
