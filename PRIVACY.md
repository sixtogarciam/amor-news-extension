# Privacy Policy for AMOR News Analyzer

Last updated: June 2026

AMOR News Analyzer ("the extension") is committed to protecting your privacy. This Privacy Policy explains how the extension handles data.

### 1. Data Collection
AMOR News Analyzer does **not** collect, store, or transmit any personal identification information (names, emails, etc.) or browsing history.

### 2. OpenAI API and BYOK Model
This extension operates under a "Bring Your Own Key" (BYOK) model. Users are required to input their own OpenAI API Key within the extension settings.
- The API key provided by the user is stored locally on the user's browser using the `chrome.storage` API.
- We do not have access to your API key.
- Your news data is sent directly from your browser to the OpenAI API for analysis. No data is stored, processed, or logged on any developer-owned servers.

### 3. Permissions
The extension uses the following permissions:
- `activeTab` / `host_permissions`: To extract the text content of the article you are currently reading in your browser. This action is only triggered when you explicitly interact with the extension.
- `storage`: To save your local preferences (API Key, chart settings) locally on your machine.

### 4. Contact
If you have any questions regarding this Privacy Policy, you can contact the developer:
Sixto García Merinero
Email: sixto.gmerinero@alumnos.upm.es
