import cv2
import numpy as np
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import geopandas as gpd
import os
import sys

# ---------- Helper Functions ----------
def load_and_resize(img_path, max_dim=500):
    if not os.path.isfile(img_path):
        print(f"ERROR: file not found: {img_path}")
        sys.exit(1)
    img_bgr = cv2.imread(img_path)
    if img_bgr is None:
        print(f"ERROR: OpenCV couldn't read the image: {img_path}")
        sys.exit(1)
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w = img_rgb.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        img_resized = cv2.resize(img_rgb, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_AREA)
    else:
        img_resized = img_rgb.copy()
    return img_rgb, img_resized

def segment_kmeans(img_resized, n_clusters=3):
    pixels = img_resized.reshape(-1, 3).astype(np.float32)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(pixels)
    labels = kmeans.labels_
    centers = kmeans.cluster_centers_.astype(np.uint8)
    segmented = centers[labels].reshape(img_resized.shape)
    return segmented, labels.reshape(img_resized.shape[:2]), centers

def calculate_risk(soil_fragility, soil_fraction, slope_deg, rainfall_mm):
    scaled_slope = min(slope_deg / 45.0, 1.0)
    scaled_rain = min(rainfall_mm / 300.0, 1.0)
    vegetation_cover = 1.0 - soil_fraction
    w1, w2, w3, w4, w5 = 0.25,0.30,0.25,0.15,0.15
    risk = (w1*soil_fragility + w2*scaled_slope + w3*scaled_rain
            + w4*soil_fraction - w5*vegetation_cover)
    risk_class = "High" if risk >= 0.7 else ("Medium" if risk >= 0.4 else "Low")
    return risk, risk_class

# ---------- Main ----------
def main():
    # --- Paths ---
    img_path = r"C:\Users\bhava\OneDrive\Desktop\PANIMALAR\lanslide project\dataset-dem\soil img\pixeled.png"   # replace with your soil image
    geojson_path = r"C:\Users\bhava\Documents\landslide-prj-data.geojson"
    output_geojson = "landslide_risk.geojson"

    # --- Load & resize soil image ---
    orig_full, img = load_and_resize(img_path, max_dim=500)
    print(f"Original shape: {orig_full.shape} | Resized for processing: {img.shape}")

    # --- K-means segmentation ---
    segmented_img, labels2d, centers = segment_kmeans(img, n_clusters=3)
    soil_cluster = int(np.argmax(centers[:,0]))  # soil = cluster with highest red channel
    soil_fraction = float(np.mean(labels2d == soil_cluster))
    print(f"Soil cluster index: {soil_cluster} | Soil fraction: {soil_fraction:.3f}")

    # --- Soil type & fragility ---
    soil_type = "clay"  # placeholder, can update later
    soil_fragility_map = {"clay":0.8, "laterite":0.6, "sandy":0.7, "rock":0.2}
    soil_fragility = soil_fragility_map.get(soil_type, 0.5)

# --- Default slope & rainfall ---
    slope_deg = 32.0        # degrees
    rainfall_mm = 210.0     # mm over 72h

# --- Risk formula ---
    scaled_slope = min(slope_deg / 45.0, 1.0)
    scaled_rain = min(rainfall_mm / 300.0, 1.0)
    vegetation_cover = 1.0 - soil_fraction
    w1, w2, w3, w4, w5 = 0.25,0.30,0.25,0.15,0.15

    risk = (w1*soil_fragility + w2*scaled_slope + w3*scaled_rain
        + w4*soil_fraction - w5*vegetation_cover)
    risk_class = "High" if risk >= 0.7 else ("Medium" if risk >= 0.4 else "Low")

    print("\n--- Landslide Risk Prediction ---")
    print(f"Soil Type: {soil_type}")
    print(f"Slope: {slope_deg}° | Rainfall (72h): {rainfall_mm} mm")
    print(f"Exposed Soil Fraction: {soil_fraction:.3f}")
    print(f"Risk Score: {risk:.3f} → Risk Level: {risk_class}")


    # --- Show original + segmented images ---
    plt.figure(figsize=(10,5))
    plt.subplot(1,2,1)
    plt.imshow(img)
    plt.title("Original (resized)")
    plt.axis("off")
    plt.subplot(1,2,2)
    plt.imshow(segmented_img)
    plt.title("Segmented (K-Means)")
    plt.axis("off")
    plt.tight_layout()
    plt.show()

    # --- Save segmented image ---
    out_path = "segmented_output.png"
    cv2.imwrite(out_path, cv2.cvtColor(segmented_img, cv2.COLOR_RGB2BGR))
    print(f"Segmented image saved to: {out_path}")

    # --- Load GeoJSON ---
    if not os.path.isfile(geojson_path):
        print(f"GeoJSON not found: {geojson_path}")
        sys.exit(1)
    gdf = gpd.read_file(geojson_path)

    # --- Soil fragility (placeholder, can integrate CNN later) ---
    soil_type = "clay"  # placeholder
    soil_fragility_map = {"clay":0.8, "laterite":0.6, "sandy":0.7, "rock":0.2}
    soil_fragility = soil_fragility_map.get(soil_type, 0.5)

    # --- Calculate risk for each polygon ---
    risk_scores = []
    risk_levels = []
    for idx, row in gdf.iterrows():
        slope_deg = float(row.get('slope', 32.0))
        rainfall_mm = float(row.get('rainfall', 210.0))
        risk, risk_class = calculate_risk(soil_fragility, soil_fraction, slope_deg, rainfall_mm)
        risk_scores.append(risk)
        risk_levels.append(risk_class)

    gdf['risk_score'] = risk_scores
    gdf['risk_level'] = risk_levels

    # --- Save new GeoJSON ---
    gdf.to_file(output_geojson, driver='GeoJSON')
    print(f"New GeoJSON with risk saved: {output_geojson}")

    # --- Print summary ---
    print("\n--- Landslide Risk Summary ---")
    for idx, row in gdf.iterrows():
        print(f"Polygon {idx}: Risk Score={row['risk_score']:.3f}, Level={row['risk_level']}")

if _name_ == "_main_":
    main()