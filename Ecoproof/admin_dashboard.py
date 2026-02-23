# admin_dashboard.py
import streamlit as st
import pandas as pd
import json
from blockchain import Blockchain

st.set_page_config(page_title="Admin Dashboard", layout="wide")
st.title("🌐 Admin Dashboard - Emissions Monitoring")

# -------------------------
# Initialize Blockchain
# -------------------------
bc = Blockchain()

# -------------------------
# Load Sensor Data
# -------------------------
st.subheader("📡 Sensor Data")
csv_path = "data/sensor_data.csv"  # input CSV
output_csv_path = "data/sensor_data_with_anomalies.csv"  # output CSV with anomalies

try:
    df = pd.read_csv(csv_path)
    if df.empty:
        st.warning("No data available.")
        st.stop()
    st.dataframe(df.tail(10), width='stretch')
except Exception as e:
    st.error(f"❌ Failed to load CSV: {e}")
    st.stop()

# -------------------------
# Threshold Settings
# -------------------------
st.sidebar.header("⚙ Set Thresholds")
thresholds = {
    "co_level": {"warning": 400, "critical": 500},
    "no2_level": {"warning": 50, "critical": 80},
    "pm2_5": {"warning": 35, "critical": 75},
    "pm10": {"warning": 50, "critical": 100}
}

for pollutant in thresholds:
    thresholds[pollutant]["warning"] = st.sidebar.number_input(
        f"{pollutant} warning threshold", value=thresholds[pollutant]["warning"]
    )
    thresholds[pollutant]["critical"] = st.sidebar.number_input(
        f"{pollutant} critical threshold", value=thresholds[pollutant]["critical"]
    )

# -------------------------
# Anomaly Detection
# -------------------------
anomaly_rows = []

# Make a copy of df to store anomaly flags
df_with_anomalies = df.copy()
df_with_anomalies["anomaly_flag"] = False
df_with_anomalies["critical_flag"] = False
df_with_anomalies["anomaly_details"] = ""

for idx, row in df.iterrows():
    anomaly_flag = False
    critical_flag = False
    alert_details = []

    for pollutant, vals in thresholds.items():
        if pollutant in row:
            if row[pollutant] > vals["warning"]:
                anomaly_flag = True
            if row[pollutant] > vals["critical"]:
                critical_flag = True
                alert_details.append(f"{pollutant}={row[pollutant]}")

    if anomaly_flag:
        anomaly_data = {
            "plant_id": row.get('plant_id'),
            "plant_name": row.get('plant_name'),
            "timestamp": row.get('timestamp'),
            "anomaly_details": alert_details,
            "alert_sent": critical_flag
        }

        if not bc.is_row_logged(anomaly_data):
            bc.add_block(anomaly_data)
            anomaly_rows.append(anomaly_data)

        # Update df_with_anomalies
        df_with_anomalies.at[idx, "anomaly_flag"] = True
        df_with_anomalies.at[idx, "critical_flag"] = critical_flag
        df_with_anomalies.at[idx, "anomaly_details"] = ", ".join(alert_details)

# -------------------------
# Display Anomalies
# -------------------------
if anomaly_rows:
    st.subheader("🚨 Latest Anomalies Detected")
    st.dataframe(pd.DataFrame(anomaly_rows), width='stretch')
else:
    st.success("✅ No new anomalies detected")

# -------------------------
# Save Anomalies to CSV
# -------------------------
try:
    df_with_anomalies.to_csv(output_csv_path, index=False)
    st.info(f"📄 Anomalies saved to `{output_csv_path}`")
except Exception as e:
    st.error(f"❌ Failed to save anomalies CSV: {e}")

# -------------------------
# Blockchain Tamper Check
# -------------------------
if not bc.is_chain_valid():
    st.error("⚠️ Blockchain integrity compromised!")

# -------------------------
# Download Blockchain
# -------------------------
chain_data = [block.to_dict() for block in bc.chain]
chain_json = json.dumps(chain_data, indent=4)

st.download_button(
    label="📥 Download Blockchain JSON",
    data=chain_json,
    file_name="blockchain_data.json",
    mime="application/json"
)