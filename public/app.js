const API_BASE = "http://localhost:4000";

/* -------------------------
  Local dataset
------------------------- */
const LOCAL_DATA = [
  {
    city: "Sample City",
    recycling_rules:
      "Separate organics, recyclables, hazardous and residual. Clean recyclables and flatten cardboard.",
    drop_off: "Main Recycling Center, 123 Green Road",
    notes: "E-waste accepted on weekends."
  },
  {
    city: "Green Town",
    recycling_rules:
      "Curbside collection for plastics 1 & 2 and metals every Tuesday.",
    drop_off: "Community transfer station",
    notes: "Batteries drop-off at supermarket."
  }
];

/* -------------------------
  Storage Keys
------------------------- */
const LS_QUIZ_KEY = "wasteaware_quiz_results";
const LS_FEEDBACK_KEY = "wasteaware_feedback";

/* -------------------------
  QUIZ
------------------------- */
let apiQuiz = [];

async function loadQuizFromApi() {
  const quizArea = document.getElementById("quizArea");
  if (!quizArea) return;

  quizArea.innerHTML = "<p>Loading quiz...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/quiz`);
    if (!res.ok) throw new Error(`Quiz API error: ${res.status}`);

    const data = await res.json();
    apiQuiz = data.questions.slice(0, 10);  // show only first 10 questions

    renderQuizUI();
  } catch (err) {
    console.error("Quiz load error:", err);
    quizArea.innerHTML = `<p style="color:red;">Failed: ${err.message}</p>`;
  }
}

function renderQuizUI() {
  const area = document.getElementById("quizArea");
  if (!area) return;

  area.innerHTML = "";
  apiQuiz.forEach((q, index) => {
    const div = document.createElement("div");
    div.className = "question";

    // question text
    div.innerHTML = `<h4>${index + 1}. ${q.question}</h4>`;

    // options
    q.options.forEach((opt, i) => {
      div.innerHTML += `
        <label style="display:block;margin:4px 0;">
          <input type="radio" name="q${index}" value="${i}" data-id="${q.id}">
          ${opt}
        </label>`;
    });

    // ⭐ FEEDBACK LINE (this is the NEW part)
    div.innerHTML += `
      <p id="fb-${index}" 
         style="font-weight:bold; margin-top:6px;"></p>
    `;

    area.appendChild(div);
  });
}

function setupQuizActions() {
  const submit = document.getElementById("submitQuiz");
  const restart = document.getElementById("restartQuiz");
  const resultBox = document.getElementById("quizResult");
  if (!submit) return;
submit.onclick = async () => {
  const answers = [];
  apiQuiz.forEach((_, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (selected) {
      answers.push({
        questionId: parseInt(selected.dataset.id),
        answerIndex: parseInt(selected.value)
      });
    }
  });

  if (!answers.length) {
    alert("Please answer at least one question.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers })
    });

    const result = await res.json();

    // ⭐ CLEAR OLD FEEDBACK
    document.querySelectorAll("[id^='fb-']").forEach(el => {
      el.textContent = "";
    });

    // ⭐ FILL FEEDBACK UNDER EACH QUESTION
    result.results.forEach((item, i) => {
      const fb = document.getElementById(`fb-${i}`);

      if (!fb) return;

      if (item.correct) {
        fb.textContent = `✔ Correct — ${item.explanation}`;
        fb.style.color = "green";
      } else {
        fb.textContent = `✘ Incorrect — ${item.explanation}`;
        fb.style.color = "red";
      }
    });

    // ⭐ SHOW SCORE AT BOTTOM
    resultBox.innerHTML = `<h3>Your Score: ${result.correctCount}/${result.gradedCount} (${result.score}%)</h3>`;

    submit.style.display = "none";
    restart.style.display = "inline-block";

    localStorage.setItem(LS_QUIZ_KEY, JSON.stringify(result));

  } catch (err) {
    console.error("Quiz submit error:", err);
    resultBox.textContent = "Submit failed.";
  }
};
 
  restart.onclick = () => {
    document
      .querySelectorAll("input[type=radio]")
      .forEach((i) => (i.checked = false));
    resultBox.textContent = "";
    submit.style.display = "inline-block";
    restart.style.display = "none";
    // ⭐ Load a NEW set of random questions
  loadQuizFromApi();
  };
}

/* -------------------------
  Feedback
------------------------- */
function setupFeedbackForm() {
  const form = document.getElementById("feedbackForm");
  if (!form) return;

  form.onsubmit = (e) => {
    e.preventDefault();
    const msg = document.getElementById("message").value.trim();
    if (!msg) return;

    const list = JSON.parse(localStorage.getItem(LS_FEEDBACK_KEY) || "[]");
    list.push({ msg, time: new Date().toISOString() });
    localStorage.setItem(LS_FEEDBACK_KEY, JSON.stringify(list));
    alert("Thank you — feedback stored locally.");
    form.reset();
  };
}

/* ------------------------------------
  ARTICLE SUMMARY FORMATTER (FULL SUMMARY)
------------------------------------ */
function formatArticle(text, title) {
  if (!text) {
    return `<p>No content available for <strong>${title}</strong>.</p>`;
  }

  const rawSentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((line) => line.length > 25);

  if (!rawSentences.length) {
    return `<p>No content available for <strong>${title}</strong>.</p>`;
  }

  const definition = rawSentences[0];

  const impacts = [];
  const government = [];
  const otherFacts = [];

  rawSentences.slice(1).forEach((s) => {
    const lower = s.toLowerCase();

    if (
      lower.includes("impact") ||
      lower.includes("pollution") ||
      lower.includes("hazard") ||
      lower.includes("risk") ||
      lower.includes("health") ||
      lower.includes("disease")
    ) {
      impacts.push(s);
    } else if (
      lower.includes("government") ||
      lower.includes("mission") ||
      lower.includes("policy") ||
      lower.includes("scheme") ||
      lower.includes("program") ||
      lower.includes("regulation") ||
      lower.includes("law")
    ) {
      government.push(s);
    } else {
      otherFacts.push(s);
    }
  });

  const keyFacts = otherFacts.slice(0, 6);

  const sec = (titleText, items) =>
    items && items.length
      ? `
    <section>
      <h3>${titleText}</h3>
      <ul>${items.map((p) => `<li>${p}</li>`).join("")}</ul>
    </section>`
      : "";

  return `
    <div class="article-wrapper fade">
      <h2>📌 ${title}</h2>

      <section>
        <h3>Definition</h3>
        <p>${definition}</p>
      </section>

      ${sec("Key Facts", keyFacts)}
      ${sec("⚠ Impact / Risks", impacts)}
      ${sec("🏛 Government / Policy / Programs", government)}

      <footer class="readnote">📌 Auto-generated learning summary based on live article content.</footer>
    </div>
  `;
}

/* ------------------------------------
  SEARCH + SUMMARY LOGIC
------------------------------------ */
let textSearchResults = [];
let activeCard = null;

// Make sure we always get some usable title string
function extractTitle(item) {
  return (
    item.title ||
    item.text ||
    item.display ||
    item.query ||
    item.phrase ||
    item.normalized_title ||
    "Unknown Topic"
  );
}

// Render search results as small cards (landscape pills)
function renderSearchResults() {
  const container = document.getElementById("textResultsList");
  if (!container) return;

  container.innerHTML = "";
  activeCard = null; // reset highlight on new search

  textSearchResults.forEach((item, index) => {
    const title = extractTitle(item);

    const card = document.createElement("div");
    card.className = "search-card";
    card.dataset.title = title;

    card.innerHTML = `
      <h4>${index + 1}. ${title}</h4>
      <p>Tap to view summary</p>
    `;

    card.addEventListener("click", () => {
      handleResultClick(card);
    });

    container.appendChild(card);
  });
}

// Handle click on a result card
function handleResultClick(card) {
  // highlight
  if (activeCard) {
    activeCard.classList.remove("active-card");
  }
  activeCard = card;
  activeCard.classList.add("active-card");

  const title = card.dataset.title;
  loadTextArticleByTitle(title);
}

// Load article summary for a given title
async function loadTextArticleByTitle(title) {
  const contentEl = document.getElementById("textArticleContent");
  if (!contentEl) return;

  const standaloneTitleEl = document.getElementById("textArticleTitle");
  if (standaloneTitleEl) {
    standaloneTitleEl.textContent = title;
  }

  // Clear old summary + show loading
  contentEl.innerHTML = "<p>Loading summary...</p>";

  try {
    const res = await fetch(
      `${API_BASE}/api/text-article?title=${encodeURIComponent(title)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Render fresh summary
    contentEl.innerHTML = formatArticle(data.content, data.title || title);

    // Smooth scroll summary into view
    contentEl.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("Article load error:", err);
    contentEl.innerHTML = `<p style="color:red;">Failed to load article: ${err.message}</p>`;
  }
}

// Perform the search call
async function performTextSearch(query) {
  const statusEl = document.getElementById("textSearchStatus");
  if (statusEl) statusEl.textContent = "Searching...";

  try {
    const res = await fetch(
      `${API_BASE}/api/text-search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    textSearchResults = data.results || [];
    renderSearchResults();

    if (statusEl) {
      statusEl.textContent = `${textSearchResults.length} result(s) found`;
    }
  } catch (err) {
    console.error("Search error:", err);
    if (statusEl) statusEl.textContent = "Error searching.";
  }
}

// Setup search form handler
function setupTextSearchExplorer() {
  const form = document.getElementById("textSearchForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("textSearchInput");
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;

    await performTextSearch(q);

    const explorer = document.getElementById("research-explorer");
    if (explorer) {
      explorer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

/* -------------------------
  INIT
------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  setupFeedbackForm();
  setupQuizActions();
  setupTextSearchExplorer();
  loadQuizFromApi();
});
function showDetails(type) {
  const details = {
    Recyclable: {
      title: "Recyclable Waste",
      description: "Recyclables are materials that can be processed and turned into new products. Proper cleaning and sorting helps ensure successful recycling.",
      can: [
        "Paper & cardboard",
        "Plastic bottles & clean containers",
        "Metal cans (tin, aluminium)",
        "Glass jars & bottles"
      ],
      cannot: [
        "Food-contaminated items",
        "Plastic bags & wrappers",
        "Ceramics, mirrors, or light bulbs",
        "Broken or dirty glass"
      ],
      tips: "Rinse containers before recycling. Flatten cardboard.",
      impact: "Recycling reduces landfill waste and cuts greenhouse gas emissions."
    },

    organic: {
      title: "Organic Waste",
      description: "Biodegradable materials that can be decomposed naturally or composted.",
      can: [
        "Fruit & vegetable scraps",
        "Coffee grounds & tea bags",
        "Leaves, grass & garden waste",
        "Eggshells"
      ],
      cannot: [
        "Meat & bones",
        "Oily foods",
        "Dairy products",
        "Pet waste"
      ],
      tips: "Use a compost bin. Balance dry and wet materials.",
      impact: "Composting reduces methane in landfills and enriches soil."
    },

    Hazardous: {
      title: "Hazardous Waste",
      description: "Toxic materials that require special handling and disposal.",
      can: [
        "Batteries & power cells",
        "Electronic waste",
        "Paints, thinners, solvents",
        "Expired medicines"
      ],
      cannot: [
        "Household waste",
        "Food waste",
        "Recyclables",
        "Garden waste"
      ],
      tips: "Take hazardous waste to authorized drop-off centers.",
      impact: "Improper disposal contaminates soil, water, and air."
    },

    General: {
      title: "General Waste",
      description: "Anything that cannot be recycled or composted.",
      can: [
        "Used tissues & wipes",
        "Sanitary waste",
        "Food-contaminated packaging",
        "Broken non-recyclable items"
      ],
      cannot: [
        "Recyclables",
        "Organic waste",
        "E-waste & batteries",
        "Hazardous chemicals"
      ],
      tips: "Reduce by choosing reusable products.",
      impact: "Ends up in landfills contributing to pollution."
    }
  };

  // 🔵 Update Title
  document.getElementById("detail-title").innerText = details[type].title;

  // 🟢 Update Description
  document.getElementById("detail-description").innerText = details[type].description;

  // 🟡 Update CAN list
  const canList = document.getElementById("detail-can");
  canList.innerHTML = "";
  details[type].can.forEach(item => {
    canList.innerHTML += `<p>✔ ${item}</p>`;
  });

  // 🔴 Update CANNOT list
  const cannotList = document.getElementById("detail-cannot");
  cannotList.innerHTML = "";
  details[type].cannot.forEach(item => {
    cannotList.innerHTML += `<p>✘ ${item}</p>`;
  });

  // 💡 Tips
  document.getElementById("detail-tips").innerText = details[type].tips;

  // 🌍 Environmental impact
  document.getElementById("detail-impact").innerText = details[type].impact;

  // Show box
  const box = document.getElementById("details-box");
  box.classList.remove("hidden");

  box.scrollIntoView({ behavior: "smooth" });
}

function calculateCompost() {
  const kitchen = parseFloat(document.getElementById("kitchenWaste").value) || 0;
  const garden = parseFloat(document.getElementById("gardenWaste").value) || 0;

  // Monthly waste (kg)
  const monthlyWaste = (kitchen + garden) * 4;

  // Compost conversion: ~40% becomes usable compost
  const compostProduced = (monthlyWaste * 0.40).toFixed(1);

  // CO₂ savings: 1kg compost = 2.1kg CO₂ prevented
  const co2 = (compostProduced * 2.1).toFixed(1);

  // Display output
  document.getElementById("compostAmount").innerHTML =
    `<strong>${compostProduced} kg compost</strong> per month`;

  document.getElementById("co2Saved").innerHTML =
    `<strong>${co2} kg CO₂</strong> saved per month`;

  document.getElementById("compostResult").classList.remove("hidden");
}

const wasteData = {
  recyclable: {
    keywords: ["plastic", "bottle", "glass", "paper", "can", "cardboard", "metal"],
    color: "#168aad",
    icon: "♻️",
    explanation: "This item can be recycled. Clean it and place it in your recycling bin.",
    link: "#recycling"
  },
  organic: {
    keywords: ["banana", "food", "peel", "vegetable", "fruit", "leftover", "coffee"],
    color: "#2d6a4f",
    icon: "🌱",
    explanation: "This item is organic and can be composted.",
    link: "#composting"
  },
  hazardous: {
    keywords: ["battery", "paint", "chemical", "medicine", "lighter"],
    color: "#bb3e03",
    icon: "⚠️",
    explanation: "This item is hazardous and needs special handling.",
    link: "https://www.epa.gov/hw/household-hazardous-waste-hhw"
  },
  residual: {
    keywords: ["wrapper", "chips", "sanitary", "styrofoam", "mixed waste"],
    color: "#6c757d",
    icon: "🗑️",
    explanation: "This item cannot be recycled or composted.",
    link: "#separation"
  }
};

// EXTRA smart organic detection (handles leaf, leaves, grass, flower, plant, etc.)
const plantWords = ["leaf", "leaves", "flower", "grass", "plant", "branch", "tree", "soil", "roots", "stem"];

function checkWaste() {
  const input = document.getElementById("wsInput").value.toLowerCase().trim();
  const resultBox = document.getElementById("wsResult");
  let found = false;

  // 1. Check normal categories first
  for (const category in wasteData) {
    if (wasteData[category].keywords.some(k => input.includes(k))) {
      showResult(category);
      return; // stop here
    }
  }

  // 2. Smart plant/organic rule
  if (plantWords.some(k => input.includes(k))) {
    showResult("organic");
    return;
  }

  // 3. If NOTHING matches → Not found
  showNotFound();
}

function showResult(category) {
  const resultBox = document.getElementById("wsResult");
  document.getElementById("wsCategory").innerText = category.toUpperCase();
  document.getElementById("wsExplanation").innerText = wasteData[category].explanation;
  document.getElementById("wsIcon").innerText = wasteData[category].icon;
  document.getElementById("wsLearnMore").href = wasteData[category].link;

  resultBox.style.background = wasteData[category].color;
  resultBox.classList.remove("hidden");
}

function showNotFound() {
  const resultBox = document.getElementById("wsResult");
  resultBox.style.background = "#6c757d";
  document.getElementById("wsCategory").innerText = "Not Found";
  document.getElementById("wsExplanation").innerText =
    "This item is not in the database. Try a different name.";
  document.getElementById("wsIcon").innerText = "❓";
  document.getElementById("wsLearnMore").href = "#";
  resultBox.classList.remove("hidden");
}

function toggleAcc(el) {
  el.classList.toggle("open");
}
