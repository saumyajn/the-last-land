🏰 The Last Land - Alliance Stats & Match Report Tracker
A high-performance React application designed to manage, extract, and analyze player statistics and battle reports for alliance members. Built with React, Material-UI, and Firebase, this tool uses Google Cloud Vision OCR and OpenCV to automatically extract data from game screenshots, transforming them into actionable, color-coded data tables.

✨ Key Features
📸 Automated OCR Data Extraction: * Upload or paste screenshots of player stat pages or battle reports.

Uses Google Cloud Vision (Document Text Detection) via Firebase Cloud Functions for highly accurate, column-aware text extraction.

Uses OpenCV Multi-Scale Template Matching to accurately find specific troop icons (T10 Cavalry, T9 Archer, etc.) regardless of screen size or device resolution.

📊 Advanced Stats & Damage Calculator:

Automatically parses 30+ game attributes (Attack, Health, Defense, Damage, Lethal Hit Rate).

Calculates derived stats such as Final Archer Damage based on customizable Multipliers and Atlantis levels.

⚡ High-Performance Data Table:

Optimized to handle dozens of players and over 1,200 individual data points simultaneously without lag using React.memo and parallel data fetching.

Spreadsheet-like interface with invisible inputs for a clean reading experience.

🎨 Customizable Thresholds: * Set custom color-coded limits (e.g., Green/Yellow/Red) to easily spot top performers and weak points across the alliance.

🔐 Admin Controls & Cloud Sync: * Live synchronization using Firebase Firestore.

Role-based access ensures only Admins can edit data, rename players, or adjust threshold settings.

📋 Quick Export: Copy entire tables to the clipboard in a TSV format for instant pasting into Excel or Google Sheets.

🛠️ Tech Stack
Frontend: React.js, Material-UI (MUI)

Backend / Database: Firebase Firestore

Serverless Functions: Firebase Cloud Functions (Python)

Image Processing: Google Cloud Vision API, OpenCV.js

State Management: React Context API

🚀 Getting Started
Prerequisites
Node.js (v16 or higher recommended)

Firebase CLI (npm install -g firebase-tools)

A Firebase Project with Firestore and Cloud Functions enabled.

Google Cloud Vision API enabled in your Google Cloud Console.

1. Clone the Repository
Bash
git clone https://github.com/your-username/the-last-land.git
cd the-last-land
2. Install Dependencies
Install the frontend React dependencies:

Bash
npm install
Install the backend Python Cloud Function dependencies:

Bash
cd functions
pip install -r requirements.txt
cd ..
3. Environment Variables
Create a .env file in the root of your React project and add your Firebase configuration keys:

Code snippet
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
4. Deploying Cloud Functions
The OCR extraction relies on a Python-based Firebase Cloud Function. To deploy it to your live Firebase environment:

Bash
firebase deploy --only functions
(Ensure the FUNCTION_URL in src/components/stats/ImageUpload.jsx matches your deployed function's URL).

5. Run the App Locally
Start the React development server:

Bash
npm start
The app will be available at http://localhost:3000.

🏗️ Recent Architecture Optimizations
To handle heavy data loads and large alliances, this app was recently overhauled for maximum performance:

Removed Tesseract.js: Migrated all client-side OCR processing to the Google Vision API backend, saving ~25MB of client-side language data downloads and stopping browser freezes.

React.memo Integration: The massive DataTable component uses memoized rows (PlayerRow) to prevent thousands of text inputs from re-rendering when a single value is changed.

Parallel Fetching: Replaced waterfall database queries with Promise.all() to load player stats, settings, and thresholds simultaneously, resulting in near-instant page loads.

Memory Leak Fixes: Ensured all cv.Mat objects are properly garbage-collected after OpenCV image processing, and fixed event-listener duplication on clipboard paste events.

🤝 Contributing
Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request
