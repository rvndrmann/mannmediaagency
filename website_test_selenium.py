import time
import getpass
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException

# --- Configuration ---
WEBSITE_URL = "https://www.mannmediaagency.com"
USERNAME = "rvndr.mann@gmail.com"
# NOTE: You will be prompted to enter the password securely when the script runs.

# --- Locators (IMPORTANT: Update these based on the actual website structure) ---
# Login Page
USERNAME_FIELD_LOCATOR = (By.ID, "username") # Example ID, replace with actual
PASSWORD_FIELD_LOCATOR = (By.ID, "password") # Example ID, replace with actual
LOGIN_BUTTON_LOCATOR = (By.XPATH, "//button[contains(text(), 'Login')]") # Example XPath, replace

# Post-Login / Navigation
CANVAS_LINK_LOCATOR = (By.LINK_TEXT, "Canvas") # Example Link Text, replace
MULTI_AGENT_CHAT_LINK_LOCATOR = (By.LINK_TEXT, "Multi-agent Chat") # Example Link Text, replace
LOGOUT_BUTTON_LOCATOR = (By.ID, "logout-button") # Example ID, replace

# Feature Specific Elements (Examples - Add more specific checks)
CANVAS_ELEMENT_LOCATOR = (By.ID, "main-canvas") # Example ID for a canvas element
CHAT_INPUT_LOCATOR = (By.ID, "chat-input") # Example ID for chat input
CHAT_SEND_BUTTON_LOCATOR = (By.ID, "send-chat-button") # Example ID for send button
CHAT_MESSAGE_AREA_LOCATOR = (By.CLASS_NAME, "message-list") # Example Class for message area

# --- Helper Functions ---
def log_message(level, message):
    """Simple logging function."""
    print(f"[{level.upper()}] {message}")

def safe_find_element(driver, locator, timeout=10):
    """Safely find an element with explicit wait."""
    try:
        element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located(locator)
        )
        return element
    except TimeoutException:
        log_message("error", f"Element not found within {timeout}s: {locator}")
        return None
    except NoSuchElementException:
        log_message("error", f"Element not found: {locator}")
        return None

def safe_click(driver, locator, timeout=10):
    """Safely find and click an element."""
    element = safe_find_element(driver, locator, timeout)
    if element:
        try:
            WebDriverWait(driver, timeout).until(EC.element_to_be_clickable(locator)).click()
            log_message("info", f"Clicked element: {locator}")
            return True
        except Exception as e:
            log_message("error", f"Could not click element {locator}: {e}")
            return False
    return False

# --- Test Functions ---
def test_login(driver, password):
    """Tests the login functionality."""
    log_message("info", "Navigating to login page...")
    driver.get(WEBSITE_URL)
    time.sleep(2) # Allow page to load initially

    log_message("info", f"Attempting login as {USERNAME}...")
    username_field = safe_find_element(driver, USERNAME_FIELD_LOCATOR)
    password_field = safe_find_element(driver, PASSWORD_FIELD_LOCATOR)

    if not username_field or not password_field:
        log_message("error", "Login fields not found.")
        return False

    try:
        username_field.send_keys(USERNAME)
        password_field.send_keys(password)
        log_message("info", "Username and password entered.")
    except Exception as e:
        log_message("error", f"Failed to enter credentials: {e}")
        return False

    if safe_click(driver, LOGIN_BUTTON_LOCATOR):
        log_message("info", "Login button clicked.")
        # Add a check here to verify successful login, e.g., wait for a dashboard element
        time.sleep(5) # Wait for potential redirect/dashboard load
        # Example check: Check if logout button is now visible
        if safe_find_element(driver, LOGOUT_BUTTON_LOCATOR, timeout=15):
             log_message("success", "Login appears successful (Logout button found).")
             return True
        else:
             log_message("error", "Login failed or took too long (Logout button not found).")
             return False
    else:
        log_message("error", "Failed to click login button.")
        return False

def test_canvas_feature(driver):
    """Tests basic navigation and presence of the Canvas feature."""
    log_message("info", "Testing Canvas Feature...")
    if not safe_click(driver, CANVAS_LINK_LOCATOR):
        log_message("error", "Could not navigate to Canvas page.")
        return False

    time.sleep(3) # Allow canvas page to load

    # Basic check: Verify a key canvas element exists
    canvas_element = safe_find_element(driver, CANVAS_ELEMENT_LOCATOR)
    if canvas_element:
        log_message("success", "Canvas page loaded and main canvas element found.")
        # Add more specific canvas interactions here if needed
        return True
    else:
        log_message("error", "Main canvas element not found on the page.")
        return False

def test_multi_agent_chat_feature(driver):
    """Tests basic navigation and interaction with the Multi-agent Chat feature."""
    log_message("info", "Testing Multi-agent Chat Feature...")
    if not safe_click(driver, MULTI_AGENT_CHAT_LINK_LOCATOR):
        log_message("error", "Could not navigate to Multi-agent Chat page.")
        return False

    time.sleep(3) # Allow chat page to load

    # Basic check: Find chat input and send button
    chat_input = safe_find_element(driver, CHAT_INPUT_LOCATOR)
    send_button = safe_find_element(driver, CHAT_SEND_BUTTON_LOCATOR)

    if not chat_input or not send_button:
        log_message("error", "Chat input or send button not found.")
        return False

    log_message("info", "Chat elements found. Attempting to send a test message.")
    try:
        test_message = "Hello from Selenium test!"
        chat_input.send_keys(test_message)
        time.sleep(1)
        send_button.click()
        log_message("info", "Test message sent.")
        time.sleep(3) # Wait for message to potentially appear

        # Optional: Check if the message appeared in the chat area
        message_area = safe_find_element(driver, CHAT_MESSAGE_AREA_LOCATOR)
        if message_area and test_message in message_area.text:
            log_message("success", "Test message found in chat area.")
        else:
            log_message("warning", "Could not verify test message in chat area (or check not specific enough).")

        log_message("success", "Multi-agent Chat basic interaction successful.")
        return True

    except Exception as e:
        log_message("error", f"Failed during chat interaction: {e}")
        return False

def test_logout(driver):
    """Tests the logout functionality."""
    log_message("info", "Attempting logout...")
    if safe_click(driver, LOGOUT_BUTTON_LOCATOR):
        log_message("info", "Logout button clicked.")
        time.sleep(3) # Wait for logout process
        # Add check to verify logout, e.g., check if login fields are visible again
        if safe_find_element(driver, USERNAME_FIELD_LOCATOR, timeout=15):
            log_message("success", "Logout successful (Login field found).")
            return True
        else:
            log_message("warning", "Logout confirmation check failed (Login field not found).")
            return False # Still consider logout initiated
    else:
        log_message("error", "Failed to find or click logout button.")
        return False


# --- Main Execution ---
if __name__ == "__main__":
    driver = None # Initialize driver to None
    try:
        # Get password securely
        password = getpass.getpass(f"Enter password for user {USERNAME}: ")
        if not password:
            log_message("error", "Password not provided. Exiting.")
            exit()

        # --- WebDriver Setup (using Chrome in this example) ---
        log_message("info", "Setting up WebDriver (Chrome)...")
        # Optional: Specify webdriver path if not in PATH
        # service = webdriver.ChromeService(executable_path='/path/to/chromedriver')
        # driver = webdriver.Chrome(service=service)
        try:
            driver = webdriver.Chrome() # Assumes chromedriver is in PATH
            driver.implicitly_wait(5) # Implicit wait for elements
            driver.maximize_window()
            log_message("info", "WebDriver started.")
        except Exception as e:
            log_message("critical", f"Failed to start WebDriver: {e}")
            log_message("critical", "Ensure ChromeDriver is installed and in your system's PATH.")
            exit()


        # --- Run Tests ---
        login_successful = test_login(driver, password)

        if login_successful:
            test_canvas_feature(driver)
            # Navigate back or ensure state allows next test if needed
            # driver.back() # Example if navigation is needed
            time.sleep(2)

            test_multi_agent_chat_feature(driver)
            time.sleep(2)

            test_logout(driver)
        else:
            log_message("error", "Skipping feature tests due to login failure.")

    except Exception as e:
        log_message("critical", f"An unexpected error occurred: {e}")

    finally:
        if driver:
            log_message("info", "Closing WebDriver...")
            driver.quit()
            log_message("info", "WebDriver closed.")
        log_message("info", "Test script finished.")