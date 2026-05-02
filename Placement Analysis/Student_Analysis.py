# streamlit_placement_dashboard.py
import streamlit as st
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import seaborn as sns

# --- Page Config ---
st.set_page_config(page_title="Placement Readiness Dashboard", layout="wide")

# --- Custom CSS for tan & coffee theme ---
st.markdown(
    """
    <style>
    /* Background gradient: tan to coffee */
    .stApp {
        background: linear-gradient(to bottom right, #D2B48C, #6F4E37);
        color: #3E2723;
    }
    /* Header */
    h1 {
        color: #4E342E;
        text-align: center;
    }
    /* Sidebar */
    .css-1d391kg .stSidebar {
        background-color: #D2B48C;
    }
    /* Buttons and sliders */
    .stButton>button {
        background-color: #6F4E37;
        color: #FFFFFF;
    }
    .stSlider>div>div>div>div {
        background-color: #8B4513;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# --- Title ---
st.title("Student Placement Readiness Dashboard")

# --- Load Excel dataset ---
try:
    df = pd.read_excel(r"Students_Dataset.xlsx")
    st.success("Dataset loaded successfully!")
except FileNotFoundError:
    st.error("Students_Dataset.xlsx not found. Make sure it is in the same folder as this script.")

# --- Proceed if dataset loaded ---
if 'df' in locals():
    # Features for clustering
    features = [
        'num_easy_problems_solved', 'num_medium_problems_solved', 'num_hard_problems_solved',
        'num_contests_participated', 'average_time_per_problem', 'accuracy', 'topics_mastered',
        'num_projects_done', 'linkedin_score', 'leetcode_frequency', 'github_proficiency',
        'communication_score', 'group_discussion_score'
    ]

    X = df[features]

    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K-Means clustering
    kmeans = KMeans(n_clusters=3, random_state=42)
    df['Cluster'] = kmeans.fit_predict(X_scaled)

    # Reduce dimensions for visualization
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)

    # --- Scatter Plot ---
    st.subheader("Cluster Visualization (PCA 2D)")
    plt.figure(figsize=(10,6))
    palette = sns.color_palette("dark:#D2B48C_r", 3)  # custom tan/coffee palette
    sns.scatterplot(x=X_pca[:,0], y=X_pca[:,1], hue=df['Cluster'], palette=palette, s=100)
    plt.xlabel("PCA1")
    plt.ylabel("PCA2")
    plt.title("Placement Readiness Clusters")
    st.pyplot(plt)

    # --- Cluster Summary ---
    st.subheader("Cluster Summary")
    cluster_summary = df.groupby('Cluster')[features].mean()
    st.dataframe(cluster_summary)

    # --- Top Students by Cluster ---
    st.subheader("Top Students in Each Cluster")
    cluster_selected = st.selectbox("Select Cluster", sorted(df['Cluster'].unique()))
    top_students = df[df['Cluster']==cluster_selected].sort_values(by='placement_score', ascending=False)
    st.dataframe(top_students[['candidate_id','name','placement_score'] + features])
