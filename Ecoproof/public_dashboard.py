# public_dashboard.py

import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="EcoProof Public Dashboard", layout="wide")
st.title("🌱 EcoProof Public Dashboard")

uploaded_file = st.file_uploader("Upload sensor CSV", type="csv")

if uploaded_file:
    data = pd.read_csv(uploaded_file)

    plant_input = st.text_input("Enter Plant Name or Plant ID:")

    if plant_input:
        plant_data = data[(data['plant_name'].str.lower() == plant_input.lower()) |
                          (data['plant_id'].astype(str) == plant_input)]

        if plant_data.empty:
            st.warning("Plant not found.")
        else:
            latest = plant_data.iloc[-1]
            st.subheader("💨 Current Pollutant Levels")
            kpi_cols = st.columns(5)
            pollutants = ['pm2_5', 'pm10', 'so2_level', 'no2_level', 'aqi']
            severity_colors = {"Normal": "green","Moderate": "yellow","High": "orange","Violation": "red","Severe": "red"}

            for i, pollutant in enumerate(pollutants):
                value = latest[pollutant]
                kpi_cols[i].metric(label=pollutant.upper(), value=value)

            st.subheader("📊 Latest Pollutant Levels")
            bar_data = pd.DataFrame({"Pollutant": pollutants,"Value": [latest[p] for p in pollutants],
                                     "Severity": [latest['anomaly_severity'] if latest['anomaly_flag'] else "Normal"]*5})
            fig_bar = px.bar(bar_data, x="Pollutant", y="Value", color="Severity",
                             color_discrete_map=severity_colors, text="Value")
            st.plotly_chart(fig_bar, use_container_width=True)

            st.subheader("📈 Pollutant Levels Over Time")
            fig_line = px.line(plant_data, x="timestamp", y=pollutants,
                               title=f"{latest['plant_name']} Emission Trends")
            st.plotly_chart(fig_line, use_container_width=True)

            st.subheader("⚠️ Anomalies")
            anomalies = plant_data[plant_data['anomaly_flag']]
            if not anomalies.empty:
                st.dataframe(anomalies[['timestamp', 'pm2_5','pm10','so2_level','no2_level','aqi','anomaly_severity']])
                pie_data = anomalies['anomaly_severity'].value_counts().reset_index()
                pie_data.columns = ['Severity', 'Count']
                fig_pie = px.pie(pie_data, names='Severity', values='Count', color='Severity',
                                 color_discrete_map=severity_colors)
                st.plotly_chart(fig_pie, use_container_width=True)
            else:
                st.info("No anomalies detected for this plant.")

            st.subheader("🌡 Pollution Verdict")
            if anomalies.empty:
                st.success("Plant is operating normally ✅")
            else:
                severity_mapping = {"Normal":0, "Moderate":1, "High":2, "Violation":3, "Severe":4}
                max_severity = anomalies['anomaly_severity'].map(severity_mapping).max()
                if max_severity <= 1:
                    st.warning("Plant has moderate pollution ⚠️")
                else:
                    st.error("Plant is polluting more than allowed ❌")
else:
    st.info("Upload a CSV file to view plant data.")