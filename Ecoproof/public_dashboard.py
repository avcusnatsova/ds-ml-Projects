import streamlit as st
import pandas as pd
import plotly.express as px
import os

st.set_page_config(page_title="EcoProof Public Dashboard", layout="wide")
st.title("🌱 EcoProof Public Dashboard")

# -------------------------------------------------
# Safe Path Handling
# -------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

processed_csv = os.path.join(DATA_DIR, "sensor_data_with_anomalies.csv")

# -------------------------------------------------
# Cached Loader
# -------------------------------------------------
@st.cache_data
def load_data(path):
    return pd.read_csv(path)

# -------------------------------------------------
# Load Data Automatically
# -------------------------------------------------
if not os.path.exists(processed_csv):
    st.error("❌ Processed data file not found in data folder.")
    st.stop()

data = load_data(processed_csv)

# Convert timestamp
if "timestamp" in data.columns:
    data["timestamp"] = pd.to_datetime(data["timestamp"], errors="coerce")

st.success("✅ Live Data Loaded Successfully")

# -------------------------------------------------
# Overall System Summary
# -------------------------------------------------
st.subheader("📊 Overall Pollution Overview")

total_plants = data["plant_id"].nunique()
total_records = len(data)
total_anomalies = data["anomaly_flag"].sum() if "anomaly_flag" in data.columns else 0

col1, col2, col3 = st.columns(3)
col1.metric("Total Plants", total_plants)
col2.metric("Total Records", total_records)
col3.metric("Total Anomalies", total_anomalies)

# -------------------------------------------------
# Plant Dropdown (Auto-populated)
# -------------------------------------------------
st.subheader("🏭 Select Plant")

plant_list = sorted(data["plant_name"].unique())
selected_plant = st.selectbox("Choose a Plant", plant_list)

plant_data = data[data["plant_name"] == selected_plant].sort_values("timestamp")
latest = plant_data.iloc[-1]

# -------------------------------------------------
# KPI Section
# -------------------------------------------------
st.subheader("💨 Current Pollutant Levels")

pollutants = ['pm2_5', 'pm10', 'so2_level', 'no2_level', 'aqi']
kpi_cols = st.columns(len(pollutants))

for i, pollutant in enumerate(pollutants):
    kpi_cols[i].metric(pollutant.upper(), latest.get(pollutant, "N/A"))

# -------------------------------------------------
# Bar Chart
# -------------------------------------------------
st.subheader("📊 Latest Pollutant Levels")

severity = latest.get('anomaly_severity', "Normal")

bar_data = pd.DataFrame({
    "Pollutant": pollutants,
    "Value": [latest.get(p, 0) for p in pollutants]
})

fig_bar = px.bar(
    bar_data,
    x="Pollutant",
    y="Value",
    text="Value"
)

st.plotly_chart(fig_bar, use_container_width=True)

# -------------------------------------------------
# Line Chart
# -------------------------------------------------
st.subheader("📈 Emission Trends Over Time")

fig_line = px.line(
    plant_data,
    x="timestamp",
    y=pollutants,
    title=f"{selected_plant} Emission Trends"
)

st.plotly_chart(fig_line, use_container_width=True)

# -------------------------------------------------
# Anomaly Section
# -------------------------------------------------
st.subheader("⚠️ Anomalies")

if "anomaly_flag" in plant_data.columns:
    anomalies = plant_data[plant_data["anomaly_flag"] == True]
else:
    anomalies = pd.DataFrame()

if not anomalies.empty:
    st.dataframe(
        anomalies[['timestamp','pm2_5','pm10','so2_level','no2_level','aqi','anomaly_severity']],
        use_container_width=True
    )
else:
    st.success("No anomalies detected for this plant.")

# -------------------------------------------------
# Pollution Verdict
# -------------------------------------------------
st.subheader("🌡 Pollution Verdict")

if anomalies.empty:
    st.success("Plant is operating normally ✅")
else:
    st.error("Plant is exceeding safe pollution limits ❌")
