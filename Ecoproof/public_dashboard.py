import streamlit as st
import pandas as pd
import plotly.express as px
from anomaly_model import detect_anomalies
import os

st.set_page_config(page_title="EcoProof Public Dashboard", layout="wide")
st.title("🌱 EcoProof Public Dashboard")

# -------------------------------------------------
# Safe Path Handling (Deployment Safe)
# -------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

raw_csv = os.path.join(DATA_DIR, "sensor_data_raw.csv")
processed_csv = os.path.join(DATA_DIR, "sensor_data_with_anomalies.csv")

# -------------------------------------------------
# Cached CSV Loader
# -------------------------------------------------
@st.cache_data
def load_csv(path):
    return pd.read_csv(path)

# -------------------------------------------------
# Load or Create Processed Data
# -------------------------------------------------
if not os.path.exists(raw_csv):
    st.error("❌ Raw data file not found. Make sure 'data' folder is uploaded to GitHub.")
    st.stop()

if not os.path.exists(processed_csv):
    raw_df = load_csv(raw_csv)
    processed_df = detect_anomalies(raw_df)
    processed_df.to_csv(processed_csv, index=False)
else:
    processed_df = load_csv(processed_csv)

data = processed_df.copy()

# Convert timestamp safely
if "timestamp" in data.columns:
    data["timestamp"] = pd.to_datetime(data["timestamp"], errors="coerce")

# -------------------------------------------------
# Plant Selection
# -------------------------------------------------
st.subheader("🔍 Search Plant")

plant_input = st.text_input("Enter Plant Name or Plant ID:")

if plant_input:
    plant_data = data[
        (data['plant_name'].astype(str).str.lower() == plant_input.lower()) |
        (data['plant_id'].astype(str) == plant_input)
    ]

    if plant_data.empty:
        st.warning("⚠️ Plant not found.")
    else:
        plant_data = plant_data.sort_values("timestamp")
        latest = plant_data.iloc[-1]

        # ---------------- KPI Section ----------------
        st.subheader("💨 Current Pollutant Levels")
        kpi_cols = st.columns(5)

        pollutants = ['pm2_5', 'pm10', 'so2_level', 'no2_level', 'aqi']

        for i, pollutant in enumerate(pollutants):
            value = latest.get(pollutant, "N/A")
            kpi_cols[i].metric(label=pollutant.upper(), value=value)

        # ---------------- Bar Chart ----------------
        st.subheader("📊 Latest Pollutant Levels")

        severity = latest.get('anomaly_severity', "Normal") if latest.get('anomaly_flag', False) else "Normal"

        bar_data = pd.DataFrame({
            "Pollutant": pollutants,
            "Value": [latest.get(p, 0) for p in pollutants],
            "Severity": [severity] * len(pollutants)
        })

        severity_colors = {
            "Normal": "green",
            "Moderate": "yellow",
            "High": "orange",
            "Violation": "red",
            "Severe": "red"
        }

        fig_bar = px.bar(
            bar_data,
            x="Pollutant",
            y="Value",
            color="Severity",
            color_discrete_map=severity_colors,
            text="Value"
        )

        st.plotly_chart(fig_bar, use_container_width=True)

        # ---------------- Line Chart ----------------
        st.subheader("📈 Pollutant Levels Over Time")

        fig_line = px.line(
            plant_data,
            x="timestamp",
            y=pollutants,
            title=f"{latest['plant_name']} Emission Trends"
        )

        st.plotly_chart(fig_line, use_container_width=True)

        # ---------------- Anomaly Section ----------------
        st.subheader("⚠️ Anomalies")

        anomalies = plant_data[plant_data.get('anomaly_flag', False)]

        if not anomalies.empty:
            st.dataframe(
                anomalies[['timestamp', 'pm2_5','pm10','so2_level','no2_level','aqi','anomaly_severity']],
                use_container_width=True
            )

            pie_data = anomalies['anomaly_severity'].value_counts().reset_index()
            pie_data.columns = ['Severity', 'Count']

            fig_pie = px.pie(
                pie_data,
                names='Severity',
                values='Count',
                color='Severity',
                color_discrete_map=severity_colors
            )

            st.plotly_chart(fig_pie, use_container_width=True)
        else:
            st.success("✅ No anomalies detected for this plant.")

        # ---------------- Pollution Verdict ----------------
        st.subheader("🌡 Pollution Verdict")

        if anomalies.empty:
            st.success("Plant is operating normally ✅")
        else:
            severity_mapping = {
                "Normal": 0,
                "Moderate": 1,
                "High": 2,
                "Violation": 3,
                "Severe": 4
            }

            max_severity = anomalies['anomaly_severity'].map(severity_mapping).max()

            if max_severity <= 1:
                st.warning("Plant has moderate pollution ⚠️")
            else:
                st.error("Plant is polluting more than allowed ❌")

else:
    st.info("Enter a Plant Name or Plant ID to view data.")
