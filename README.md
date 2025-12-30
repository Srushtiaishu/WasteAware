# WasteAware – Web-Based Waste Management Awareness System

## Overview
WasteAware is a lightweight, client-side and optionally server-assisted web application designed to improve public awareness around waste segregation, recycling, composting, and sustainable environmental behaviour. Built using **HTML**, **CSS**, **JavaScript**, and an optional **Node.js + Express** backend, the platform supports **SDG 11: Sustainable Cities & Communities** by making waste information accessible, interactive, and easy for communities to understand.

The system includes five core modules:
- **Home** – Introductory waste information, global statistics, and an interactive sorting tool.
- **Learn** – Waste category explanations, compost calculator, educational video, and a Live Research Explorer using the Wikipedia API.
- **Quiz** – Interactive knowledge assessment with per-question explanations.
- **Local Info** – Community recycling guidance, drop-off points, and eco-friendly practices.
- **Feedback** – User feedback storage using browser `localStorage`.

The platform runs fully in the browser but includes a simple Node.js server to support the **Quiz API**.

---

## Features
### ✔ Client-Side Architecture
Modular design with separate HTML pages:
- `index.html`
- `learn.html`
- `quiz.html`
- `local.html`
- `feedback.html`

Shared assets:
- `styles.css` – global styling
- `app.js` – logic for sorting tool, quiz handling, feedback management, compost calculator, and Wikipedia API calls

### ✔ Quiz API via Node.js + Express
The quiz module retrieves questions from:

/api/quiz

This requires a lightweight backend built with Express.

### ✔ Live Research Explorer (Wikipedia API)
Uses the public Wikipedia REST API to retrieve real-time summaries:

https://en.wikipedia.org/api/rest_v1/page/summary/{topic}


### ✔ Mobile Responsive
Uses CSS Grid + Flexbox to ensure full usability on phones, tablets, and desktops.

---

## File Structure

📁 WasteAware
│
├── public/
│   ├── index.html
│   ├── learn.html
│   ├── quiz.html
│   ├── local.html
│   ├── feedback.html
│   ├── styles.css
│   └── app.js
│
├── server.js             # Express server for Quiz API
├── package.json
└── package-lock.json


---

## Installation & Setup (Node.js Required for Quiz API)
### 1. Initialise the project
npm init -y

### 2. Install dependencies
npm install express cors
npm install node-fetch


### 3. Start the server
Ensure `package.json` contains:
```json
"scripts": {
  "start": "node server.js"
}

Run the server: npm start

### 4. Open the application
Navigate to: http://localhost:4000

The full platform, including the quiz API, will now function correctly.

## Running Without Node.js
The platform **will run**, but the Quiz module **will not load questions**, because the `/api/quiz` endpoint requires the Express backend.

To use the full system, always run via: npm start

---

## Sustainability Alignment
WasteAware supports:
- **SDG 11** – sustainable cities through accessible waste education
- **SDG 3** – reducing pollution health risks
- **SDG 13** – climate action via waste reduction and composting

---

## Future Enhancements
- Municipal API integration for automatic recycling updates
- Full accessibility audit (WCAG 2.1)
- Multi-language support
- User accounts + progress tracking
- Gamification for increased engagement

---

## Author
**Srushti Lingaraju**  
MSc Advanced Computer Science, University of Strathclyde

---

## License
This project is open for personal, academic, and educational use.

