"""
Browser regression test suite using Selenium Chrome Headless.
Validates:
1. Reproduction and fix of HTML5 decimal validation (stepMismatch on 0.7672)
2. District selection and environmental profile synchronization
3. Stale prediction result invalidation on district change or manual input
4. Scenario preset application preserving selected district context
5. Unsupported season (Rabi) enforcement disabling prediction
6. End-to-end form submission with full decimal precision
"""

import time
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://localhost:5173"


@pytest.fixture(scope="module")
def driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1400,1000")
    
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(5)
    yield driver
    driver.quit()


def navigate_to_predict(driver):
    """Helper to navigate to the Predict tab in the SPA."""
    driver.get(BASE_URL)
    # Wait for Predict nav button and click it
    predict_nav = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[text()='Predict']"))
    )
    predict_nav.click()
    # Wait for Predict page header
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Yield Prediction Studio')]"))
    )


def test_reproduce_and_verify_decimal_step_validation(driver):
    """
    Directly reproduces the HTML5 stepMismatch error in Chrome
    when step is constrained to 0.01 vs when step is 'any'.
    """
    driver.get(BASE_URL)
    
    # 1. Reproduce failure: create an input with step="0.01" and value="0.7672"
    repro_result = driver.execute_script("""
        const form = document.createElement('form');
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = '0.7672';
        form.appendChild(input);
        document.body.appendChild(form);
        
        const isStepMismatch = input.validity.stepMismatch;
        const isValid = input.validity.valid;
        const formValid = form.checkValidity();
        
        document.body.removeChild(form);
        return { isStepMismatch, isValid, formValid };
    """)
    
    print(f"\n[Reproduction Result with step='0.01'] {repro_result}")
    assert repro_result["isStepMismatch"] is True, "With step='0.01', 0.7672 MUST trigger stepMismatch"
    assert repro_result["isValid"] is False, "With step='0.01', input MUST be invalid"
    assert repro_result["formValid"] is False, "With step='0.01', form checkValidity MUST be False (form submission blocked)"
    
    # 2. Verify fix: create an input with step="any" and value="0.7672"
    fix_result = driver.execute_script("""
        const form = document.createElement('form');
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.value = '0.7672';
        form.appendChild(input);
        document.body.appendChild(form);
        
        const isStepMismatch = input.validity.stepMismatch;
        const isValid = input.validity.valid;
        const formValid = form.checkValidity();
        
        document.body.removeChild(form);
        return { isStepMismatch, isValid, formValid };
    """)
    
    print(f"[Fix Verification with step='any'] {fix_result}")
    assert fix_result["isStepMismatch"] is False, "With step='any', stepMismatch MUST be False"
    assert fix_result["isValid"] is True, "With step='any', input MUST be valid"
    assert fix_result["formValid"] is True, "With step='any', form checkValidity MUST be True"


def test_predict_page_loads_and_verifies_provenance_labels(driver):
    """
    Verifies PredictPage loads with calibrated benchmark provenance
    and crop-year labels reflecting benchmark status.
    """
    navigate_to_predict(driver)
    
    # Wait for profile badge: "Calibrated Benchmark Profile"
    badge = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Calibrated Benchmark Profile')]"))
    )
    assert badge is not None
    
    # Check Crop Year dropdown labels
    year_select = driver.find_element(By.XPATH, "//label[contains(text(), 'Crop Year')]/following-sibling::select")
    options = [opt.text for opt in Select(year_select).options]
    
    assert any("2020 (Calibrated Benchmark)" in opt for opt in options), "2020 should have Calibrated Benchmark label"
    assert not any("(Observed)" in opt for opt in options), "No year should have false '(Observed)' label"


def test_decimal_input_submission_with_precision(driver):
    """
    Tests that continuous variables have step='any' on the live form,
    allows setting multi-decimal NDVI '0.7672', and successfully submits
    to generate predictions.
    """
    navigate_to_predict(driver)
    
    # Locate Mean NDVI input
    ndvi_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//label[contains(text(), 'Mean NDVI')]/following-sibling::input"))
    )
    
    assert ndvi_input.get_attribute("step") == "any", "Mean NDVI step MUST be 'any'"
    
    # Set high-precision value: 0.7672
    ndvi_input.clear()
    ndvi_input.send_keys("0.7672")
    
    # Check browser validity in live DOM
    is_valid = driver.execute_script("return arguments[0].validity.valid;", ndvi_input)
    assert is_valid is True, "Live NDVI input with 0.7672 must have validity.valid = True"
    
    # Submit prediction
    submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
    assert submit_btn.is_enabled()
    submit_btn.click()
    
    # Wait for prediction result card
    result_heading = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Prediction Result')]"))
    )
    assert result_heading is not None
    
    # Verify result displays district Burdwan
    district_heading = driver.find_element(By.XPATH, "//*[contains(text(), 'Prediction Result')]/following-sibling::h2")
    assert "Burdwan" in district_heading.text


def test_district_change_synchronization_and_stale_invalidation(driver):
    """
    Tests that changing district:
    1. Invalidates previous prediction result immediately
    2. Fetches and populates the new district's profile
    3. Prediction displays the new district
    """
    navigate_to_predict(driver)
    
    # 1. Produce an initial prediction for Burdwan
    submit_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[@type='submit']"))
    )
    submit_btn.click()
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Prediction Result')]"))
    )
    
    # 2. Change target district to Ludhiana
    district_select = driver.find_element(By.XPATH, "//label[contains(text(), 'Target District')]/following-sibling::select")
    select_obj = Select(district_select)
    select_obj.select_by_value("Ludhiana")
    
    # 3. Check stale prediction result is IMMEDIATELY cleared
    results = driver.find_elements(By.XPATH, "//*[contains(text(), 'Prediction Result')]")
    assert len(results) == 0, "Previous prediction result card MUST be cleared when district changes"
    
    # 4. Wait for Ludhiana profile to load (State name changes to Punjab)
    state_input = driver.find_element(By.XPATH, "//label[contains(text(), 'State Name')]/following-sibling::input")
    WebDriverWait(driver, 10).until(
        lambda d: state_input.get_attribute("value") == "Punjab"
    )
    
    # 5. Submit prediction for Ludhiana
    submit_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[@type='submit']"))
    )
    submit_btn.click()
    
    # 6. Verify result card shows Ludhiana
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Prediction Result')]"))
    )
    district_heading = driver.find_element(By.XPATH, "//*[contains(text(), 'Prediction Result')]/following-sibling::h2")
    assert "Ludhiana" in district_heading.text


def test_scenario_presets_and_manual_edit_invalidation(driver):
    """
    Tests:
    1. Clicking Severe Drought preset updates weather/satellite fields
    2. Manual editing invalidates the result and sets status to 'Custom Modified'
    """
    navigate_to_predict(driver)
    
    # Click Drought preset
    drought_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Severe Drought & Heat Shock')]"))
    )
    drought_btn.click()
    
    # Verify rainfall anomaly updated to -35
    rain_anomaly_input = driver.find_element(By.XPATH, "//label[contains(text(), 'Rain Anomaly (%)')]/following-sibling::input")
    assert float(rain_anomaly_input.get_attribute("value")) == -35.0
    
    # Submit prediction
    submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
    submit_btn.click()
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Prediction Result')]"))
    )
    
    # Verify High Risk badge is shown
    high_risk_badge = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'High Risk')]"))
    )
    assert high_risk_badge is not None
    
    # Now manually edit an input (e.g. cumulative rain)
    rain_cum_input = driver.find_element(By.XPATH, "//label[contains(text(), 'Cumulative Rain (mm)')]/following-sibling::input")
    rain_cum_input.clear()
    rain_cum_input.send_keys("500")
    
    # Prediction result should be invalidated
    results = driver.find_elements(By.XPATH, "//*[contains(text(), 'Prediction Result')]")
    assert len(results) == 0, "Manual input edit MUST invalidate stale prediction"
    
    # Provenance indicator should update to 'Custom Modified'
    custom_badge = driver.find_element(By.XPATH, "//*[contains(text(), 'Custom Modified')]")
    assert custom_badge is not None


def test_unsupported_rabi_season_enforcement(driver):
    """
    Tests that selecting Rabi season:
    1. Displays model limitation banner
    2. Disables the Predict Yield button
    3. Prevents submission
    """
    navigate_to_predict(driver)
    
    season_select = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//label[contains(text(), 'Crop Season')]/following-sibling::select"))
    )
    
    # Select Rabi
    Select(season_select).select_by_value("Rabi")
    
    # Limitation banner should appear
    banner = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Model Limitation: Kharif-Calibrated Checkpoint')]"))
    )
    assert banner is not None
    
    # Submit button should be disabled
    submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
    assert not submit_btn.is_enabled(), "Submit button MUST be disabled when Rabi season is selected"
    
    # Switch back to Kharif
    Select(season_select).select_by_value("Kharif")
    
    # Submit button should become re-enabled
    WebDriverWait(driver, 10).until(
        lambda d: submit_btn.is_enabled()
    )
    assert submit_btn.is_enabled()
