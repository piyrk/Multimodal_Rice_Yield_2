# Future Research and Engineering Directions: ClimateRice-AI

To maintain strict research scope and prevent project fragmentation, several promising avenues were deliberately scoped for future research.

---

## 1. Remote Sensing & Sensor Advances

1. **Synthetic Aperture Radar (SAR) Cloud Penetration:**
   Integrating dual-polarized Sentinel-1 C-band SAR ($VV$ and $VH$ backscatter). SAR microwave pulses penetrate persistent monsoon cloud cover, offering uninterrupted weekly observations of paddy field flooding, transplanting hydro-periods, and canopy surface roughness.
2. **High-Resolution Sentinel-2 & PlanetScope Scaling:**
   Scaling the spatial pipeline from district-level aggregation down to parcel-level ($10\text{ m} - 3\text{ m}$) field boundaries using deep super-resolution and agricultural field segmentation masks.

---

## 2. Modeling & Hybrid Physics-Guided AI

3. **Coupling Crop Growth Process Models (APSIM / DSSAT) with Deep Networks:**
   Developing Physics-Informed Neural Networks (PINNs) where physiological crop growth dynamics (leaf area index expansion, nitrogen assimilation, biomass partitioning) act as inductive biases or regularizing constraints on multimodal neural embeddings.
4. **Hierarchical Spatial-Temporal Graph Neural Networks (ST-GNN):**
   Modeling spatial autocorrelation across adjacent river basins and agro-ecological zones through geographic graph convolutions, capturing trans-district weather front propagation and hydrological connectivity.

---

## 3. Operational Agricultural Deployment (Out of Main Scope)

5. **Field-Level IoT Telemetry:**
   Interfacing the cloud prediction platform with edge loT soil probes (capacitive soil moisture, electrical conductivity, canopy temperature sensors) for localized precision irrigation scheduling.
6. **Agronomic Decision Support & Pest/Disease Alerts:**
   Extending the system into an end-to-end climate-smart advisory engine incorporating localized disease vulnerability warnings triggered when prolonged relative humidity ($> 85\%$) and warm temperatures coincide during heading stages.
