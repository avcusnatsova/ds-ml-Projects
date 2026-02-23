# admin_dashboard.py
import streamlit as st
import pandas as pd
import os
import json
from blockchain import Blockchain

st.set_page_config(page_title="Admin Dashboard", layout="wide")
st.title("🌐 Admin Dashboard - Emissions Monitoring")

# -------------------------
# Initialize Blockchain
# -------------------------
bc = Blockchain()

# -------------------------
# Safe Path Handling
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

csv_path = os.path.join(DATA_DIR, "sensor_data.csv")
output_csv_path = os.path.join(DATA_DIR, "sensor_data_with_anomalies.csv")

# -------------------------
# Load Sensor Data
# -------------------------
st.subheader("📡 Sensor Data")

@st.cache_data
def load_data(path):
    return pd.read_csv(path)

try:
    if not os.path.exists(csv_path):
        st.error(f"❌ File not found: {csv_path}")
        st.stop()

    df = load_data(csv_path)

    if df.empty:
        st.warning("No data available.")
        st.stop()

    st.dataframe(df.tail(10), use_container_width=True)

except Exception as e:
    st.error(f"❌ Failed to load CSV: {e}")
    st.stop()
