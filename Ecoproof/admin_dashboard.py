import streamlit as st
import pandas as pd
import json
import hashlib
from blockchain import Blockchain


def reset_session():
    """Reset all session state variables"""
    for key in list(st.session_state.keys()):
        del st.session_state[key]
    st.rerun()  # FIX: st.experimental_rerun() is deprecated, use st.rerun()


def show_admin():
    # -----------------------------
    # Page config (only set if not already configured)
    # -----------------------------
    try:
        st.set_page_config(page_title="Real-Time Admin Dashboard", layout="wide")
    except st.errors.StreamlitAPIException:
        pass  # Already configured

    st.title("🌐 Real-Time Admin Dashboard - Emissions Monitoring & Alerts")

    # FIX: Reset button must be inside show_admin() so it only renders when the function is called,
    # not at module import time. Moved from module level to here.
    if st.sidebar.button("🔄 Reset Session", key="reset_session"):
        reset_session()

    # -----------------------------
    # Initialize all session states
    # -----------------------------
    if "uploaded_file" not in st.session_state:
        st.session_state.uploaded_file = None
    if "uploaded_file_data" not in st.session_state:
        st.session_state.uploaded_file_data = None
    if "uploaded_file_hash" not in st.session_state:
        st.session_state.uploaded_file_hash = None
    if "blockchain_instance" not in st.session_state:
        st.session_state.blockchain_instance = Blockchain()

    # -----------------------------
    # Sidebar: Thresholds with keys for persistence
    # -----------------------------
    st.sidebar.header("⚙ Set Thresholds")
    thresholds = {
        "co_level": {
            "warning": st.sidebar.number_input("CO Warning Level", value=400, key="co_warning"),
            "critical": st.sidebar.number_input("CO Critical Level", value=500, key="co_critical")
        },
        "no2_level": {
            "warning": st.sidebar.number_input("NO2 Warning Level", value=50, key="no2_warning"),
            "critical": st.sidebar.number_input("NO2 Critical Level", value=80, key="no2_critical")
        },
        "pm2_5": {
            "warning": st.sidebar.number_input("PM2.5 Warning Level", value=35, key="pm25_warning"),
            "critical": st.sidebar.number_input("PM2.5 Critical Level", value=75, key="pm25_critical")
        },
        "pm10": {
            "warning": st.sidebar.number_input("PM10 Warning Level", value=50, key="pm10_warning"),
            "critical": st.sidebar.number_input("PM10 Critical Level", value=100, key="pm10_critical")
        }
    }

    # -----------------------------
    # Upload CSV with persistent storage
    # -----------------------------
    st.subheader("📂 Upload Sensor Data")
    uploaded_file = st.file_uploader("Choose a CSV file", type="csv", key="csv_uploader")

    # Handle file upload and persistence
    if uploaded_file is not None:
        file_contents = uploaded_file.read()
        file_hash = hashlib.md5(file_contents).hexdigest()
        uploaded_file.seek(0)  # Reset file pointer

        # Only process if it's a new file or first upload
        if st.session_state.uploaded_file_hash != file_hash:
            try:
                # FIX: Limit to 300 rows for prototype performance
                df = pd.read_csv(uploaded_file).head(300)
                st.session_state.uploaded_file_data = df.to_dict('records')
                st.session_state.uploaded_file_hash = file_hash
                st.session_state.uploaded_file = uploaded_file.name
                st.success(f"✅ Successfully uploaded: {uploaded_file.name}")
            except Exception as e:
                st.error(f"❌ Failed to read CSV: {e}")
                return

    # Check if we have data to work with
    if st.session_state.uploaded_file_data is None:
        st.info("📋 Please upload a CSV file to view sensor data and blockchain logs.")
        st.markdown("**Expected CSV columns:** `co_level`, `no2_level`, `pm2_5`, `pm10`")
        return

    # -----------------------------
    # Load data from session state
    # -----------------------------
    try:
        df = pd.DataFrame(st.session_state.uploaded_file_data)

        # Normalize column names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')

        # Validate required columns exist
        required_columns = list(thresholds.keys())
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            st.warning(f"⚠️ Missing columns: {missing_columns}")
            st.info("Available columns: " + ", ".join(df.columns.tolist()))

    except Exception as e:
        st.error(f"❌ Error processing data: {e}")
        return

    # -----------------------------
    # Get blockchain instance
    # -----------------------------
    bc = st.session_state.blockchain_instance

    # -----------------------------
    # Process data and detect anomalies
    # -----------------------------
    anomaly_rows = []
    new_blocks_added = 0

    with st.spinner("🔍 Processing data and detecting anomalies..."):
        for idx, row in df.iterrows():
            anomaly_flag = False
            critical_flag = False
            alert_details = []

            for pollutant, thresh in thresholds.items():
                if pollutant in row and pd.notna(row[pollutant]):
                    try:
                        value = float(row[pollutant])
                        if value > thresh["warning"]:
                            anomaly_flag = True
                        if value > thresh["critical"]:
                            critical_flag = True
                            alert_details.append(f"{pollutant.upper()}={value}")
                    except (ValueError, TypeError):
                        continue

            row_dict = row.to_dict()
            row_dict["anomaly_flag"] = anomaly_flag
            row_dict["critical_flag"] = critical_flag
            row_dict["alert_details"] = alert_details
            row_dict["row_index"] = idx

            if not bc.is_row_logged(row_dict):
                bc.add_block(row_dict)
                new_blocks_added += 1

                if anomaly_flag:
                    anomaly_rows.append(row_dict)

    # -----------------------------
    # Display statistics
    # -----------------------------
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("📊 Total Records", len(df))
    with col2:
        st.metric("🔗 Blockchain Blocks", len(bc.chain))
    with col3:
        st.metric("⚠️ New Anomalies", len(anomaly_rows))
    with col4:
        st.metric("📦 New Blocks Added", new_blocks_added)

    # -----------------------------
    # Enhanced threshold highlighting
    # -----------------------------
    def highlight_thresholds(val, col_name):
        """Apply color coding based on threshold values"""
        if col_name not in thresholds or pd.isna(val):
            return ""
        try:
            value = float(val)
            thresh = thresholds[col_name]
            if value > thresh["critical"]:
                return "background-color: #ff4444; color: white; font-weight: bold;"
            elif value > thresh["warning"]:
                return "background-color: #ffaa00; color: black; font-weight: bold;"
            else:
                return "background-color: #44ff44; color: black;"
        except (ValueError, TypeError):
            return ""

    # -----------------------------
    # Display data with highlighting
    # -----------------------------
    st.subheader("📈 Sensor Data Preview")

    display_df = df.head(100).copy()

    styled_df = display_df.style
    for col in thresholds.keys():
        if col in display_df.columns:
            # FIX: applymap() is deprecated in newer pandas; use map() instead
            styled_df = styled_df.map(
                lambda x, c=col: highlight_thresholds(x, c),
                subset=[col]
            )

    numeric_columns = display_df.select_dtypes(include=['float64', 'int64']).columns
    for col in numeric_columns:
        if col in thresholds:
            styled_df = styled_df.format({col: "{:.2f}"})

    st.dataframe(styled_df, use_container_width=True, height=400)

    st.markdown("""
    **Color Legend:**
    🟢 **Normal** | 🟡 **Warning** | 🔴 **Critical**
    """)

    # -----------------------------
    # Display anomalies
    # -----------------------------
    if anomaly_rows:
        st.subheader("🚨 Latest Anomalies Detected")
        st.error(f"⚠️ {len(anomaly_rows)} new anomalies found in this session!")

        anomaly_df = pd.DataFrame(anomaly_rows)
        display_cols = [col for col in anomaly_df.columns
                        if col not in ['anomaly_flag', 'critical_flag', 'row_index']]

        st.dataframe(anomaly_df[display_cols], use_container_width=True)

        critical_anomalies = [row for row in anomaly_rows if row.get('critical_flag', False)]
        if critical_anomalies:
            st.error(f"🚨 **CRITICAL ALERTS:** {len(critical_anomalies)} readings exceed critical thresholds!")
            for alert in critical_anomalies[:5]:
                if alert.get('alert_details'):
                    st.error(f"Row {alert.get('row_index', 'N/A')}: {', '.join(alert['alert_details'])}")
    else:
        st.success("✅ No new anomalies detected in this session!")

    # -----------------------------
    # Blockchain operations
    # -----------------------------
    st.subheader("🔗 Blockchain Operations")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("🔍 Validate Blockchain", key="validate_blockchain"):
            with st.spinner("Validating blockchain integrity..."):
                is_valid = bc.is_chain_valid()
                if is_valid:
                    st.success("✅ Blockchain is valid and secure!")
                else:
                    st.error("❌ Blockchain validation failed!")

    with col2:
        if len(bc.chain) > 1:
            st.info(f"📊 Blockchain contains {len(bc.chain)} blocks")
            st.info(f"🔐 Latest block hash: {bc.last_block.hash[:16]}...")

    if len(bc.chain) > 1:
        try:
            chain_data = [block.to_dict() for block in bc.chain]
            chain_json = json.dumps(chain_data, indent=2, default=str)

            st.download_button(
                label="📥 Download Blockchain Data",
                data=chain_json,
                file_name=f"blockchain_emissions_{st.session_state.uploaded_file_hash[:8]}.json",
                mime="application/json",
                key="download_blockchain"
            )
        except Exception as e:
            st.error(f"Error preparing blockchain download: {e}")

    # -----------------------------
    # Data export options
    # -----------------------------
    if len(anomaly_rows) > 0:
        st.subheader("📤 Export Options")

        col1, col2 = st.columns(2)

        with col1:
            anomaly_csv = pd.DataFrame(anomaly_rows).to_csv(index=False)
            st.download_button(
                label="📊 Download Anomalies CSV",
                data=anomaly_csv,
                file_name="anomalies_detected.csv",
                mime="text/csv",
                key="download_anomalies"
            )

        with col2:
            summary_data = {
                "total_records": len(df),
                "anomalies_found": len(anomaly_rows),
                "critical_alerts": len([r for r in anomaly_rows if r.get('critical_flag', False)]),
                "thresholds_used": thresholds,
                "file_processed": st.session_state.uploaded_file
            }
            summary_json = json.dumps(summary_data, indent=2, default=str)

            st.download_button(
                label="📋 Download Summary Report",
                data=summary_json,
                file_name="analysis_summary.json",
                mime="application/json",
                key="download_summary"
            )
