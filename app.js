import { db, auth } from "./firebase-config.js";

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let data = [];
let watchedLessons = JSON.parse(localStorage.getItem("watchedLessons")) || [];
let selectedTopicId = null;
let selectedLessonIndex = 0;
let currentAdminUser = null;

const dashboardView = document.getElementById("dashboardView");
const courseView = document.getElementById("courseView");
const adminView = document.getElementById("adminView");

const topicCards = document.getElementById("topicCards");
const lessonList = document.getElementById("lessonList");
const materialList = document.getElementById("materialList");

const courseBadge = document.getElementById("courseBadge");
const courseTitle = document.getElementById("courseTitle");
const courseDescription = document.getElementById("courseDescription");
const videoFrame = document.getElementById("videoFrame");
const lessonTitle = document.getElementById("lessonTitle");
const lessonDescription = document.getElementById("lessonDescription");

const topicSelect = document.getElementById("topicSelect");
const adminContentList = document.getElementById("adminContentList");
const toast = document.getElementById("toast");

document.getElementById("homeBtn").addEventListener("click", showDashboard);
document.getElementById("adminBtn").addEventListener("click", showAdmin);
document.getElementById("backBtn").addEventListener("click", showDashboard);

document.getElementById("markWatchedBtn").addEventListener("click", markCurrentLessonWatched);
document.getElementById("nextLessonBtn").addEventListener("click", goToNextLesson);

document.getElementById("addTopicBtn").addEventListener("click", addTopicToFirebase);
document.getElementById("addLessonBtn").addEventListener("click", addLessonToFirebase);

createAdminLoginUI();

onAuthStateChanged(auth, (user) => {
  currentAdminUser = user;
  updateAdminAccessUI();
});

async function loadTopicsFromFirebase() {
  try {
    const topicSnapshot = await getDocs(collection(db, "topics"));
    data = [];

    for (const topicDoc of topicSnapshot.docs) {
      const topic = topicDoc.data();

      const lessonsQuery = query(
        collection(db, "lessons"),
        where("topicId", "==", topicDoc.id),
        orderBy("order")
      );

      const lessonSnapshot = await getDocs(lessonsQuery);
      const lessons = [];

      lessonSnapshot.forEach((lessonDoc) => {
        const lesson = lessonDoc.data();

        const materials = [];

        if (lesson.materialTitle && lesson.materialUrl) {
          materials.push({
            title: lesson.materialTitle,
            url: lesson.materialUrl
          });
        }

        lessons.push({
          id: lessonDoc.id,
          title: lesson.title || "",
          description: lesson.description || "",
          youtubeUrl: lesson.youtubeUrl || "",
          materials
        });
      });

      data.push({
        id: topicDoc.id,
        name: topic.name || "",
        description: topic.description || "",
        icon: topic.icon || "📘",
        lessons
      });
    }

    renderDashboard();
    renderTopicSelect();
    renderAdminContentList();
  } catch (error) {
    console.error("Firebase Error:", error);
    showToast("Firebase loading error. Check console.");
  }
}

function createAdminLoginUI() {
  const loginBox = document.createElement("div");
  loginBox.id = "adminLoginBox";
  loginBox.className = "admin-card";
  loginBox.innerHTML = `
    <h3>Teacher Admin Login</h3>
    <p class="muted">Login is required to add or delete topics and lessons.</p>

    <div class="form-grid">
      <input id="adminEmailInput" type="email" placeholder="Admin email" />
      <input id="adminPasswordInput" type="password" placeholder="Admin password" />
    </div>

    <button id="loginBtn" class="btn primary">Login</button>
  `;

  const logoutBox = document.createElement("div");
  logoutBox.id = "adminLogoutBox";
  logoutBox.className = "admin-card";
  logoutBox.style.display = "none";
  logoutBox.innerHTML = `
    <h3>Admin Logged In</h3>
    <p id="adminUserText" class="muted"></p>
    <button id="logoutBtn" class="btn danger">Logout</button>
  `;

  const sectionTitle = adminView.querySelector(".section-title");
  sectionTitle.insertAdjacentElement("afterend", logoutBox);
  sectionTitle.insertAdjacentElement("afterend", loginBox);

  document.getElementById("loginBtn").addEventListener("click", loginAdmin);
  document.getElementById("logoutBtn").addEventListener("click", logoutAdmin);
}

async function loginAdmin() {
  const email = document.getElementById("adminEmailInput").value.trim();
  const password = document.getElementById("adminPasswordInput").value.trim();

  if (!email || !password) {
    showToast("Please enter email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Admin login successful.");
  } catch (error) {
    console.error(error);
    showToast("Login failed. Check email/password.");
  }
}

async function logoutAdmin() {
  await signOut(auth);
  showToast("Logged out.");
}

function updateAdminAccessUI() {
  const loginBox = document.getElementById("adminLoginBox");
  const logoutBox = document.getElementById("adminLogoutBox");
  const adminUserText = document.getElementById("adminUserText");

  const adminCards = adminView.querySelectorAll(".admin-card");

  adminCards.forEach(card => {
    if (card.id !== "adminLoginBox" && card.id !== "adminLogoutBox") {
      card.style.display = currentAdminUser ? "block" : "none";
    }
  });

  if (currentAdminUser) {
    loginBox.style.display = "none";
    logoutBox.style.display = "block";
    adminUserText.textContent = `Logged in as: ${currentAdminUser.email}`;
  } else {
    loginBox.style.display = "block";
    logoutBox.style.display = "none";
  }
}

function showView(view) {
  dashboardView.classList.remove("active");
  courseView.classList.remove("active");
  adminView.classList.remove("active");
  view.classList.add("active");
}

function showDashboard() {
  renderDashboard();
  showView(dashboardView);
}

function showAdmin() {
  renderTopicSelect();
  renderAdminContentList();
  updateAdminAccessUI();
  showView(adminView);
}

function renderDashboard() {
  topicCards.innerHTML = "";

  data.forEach(topic => {
    const totalLessons = topic.lessons.length;
    const watchedCount = topic.lessons.filter(lesson => watchedLessons.includes(lesson.id)).length;
    const progress = totalLessons === 0 ? 0 : Math.round((watchedCount / totalLessons) * 100);

    const card = document.createElement("div");
    card.className = "topic-card";

    card.innerHTML = `
      <div class="topic-icon">${escapeHtml(topic.icon)}</div>
      <h3>${escapeHtml(topic.name)}</h3>
      <p>${escapeHtml(topic.description)}</p>

      <div class="progress-bar">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>

      <div class="progress-text">
        ${watchedCount}/${totalLessons} lessons watched • ${progress}%
      </div>
    `;

    card.addEventListener("click", () => openTopic(topic.id));
    topicCards.appendChild(card);
  });
}

function openTopic(topicId) {
  selectedTopicId = topicId;
  selectedLessonIndex = 0;
  renderCourse();
  showView(courseView);
}

function renderCourse() {
  const topic = getSelectedTopic();
  if (!topic) return;

  courseBadge.textContent = "1st Semester";
  courseTitle.textContent = topic.name;
  courseDescription.textContent = topic.description;

  if (topic.lessons.length === 0) {
    lessonTitle.textContent = "No lessons available";
    lessonDescription.textContent = "Please add lessons from the admin panel.";
    videoFrame.src = "";
    lessonList.innerHTML = "";
    materialList.innerHTML = `<p class="muted">No materials available.</p>`;
    return;
  }

  const lesson = topic.lessons[selectedLessonIndex];

  lessonTitle.textContent = lesson.title;
  lessonDescription.textContent = lesson.description;
  videoFrame.src = getYouTubeEmbedUrl(lesson.youtubeUrl);

  renderMaterials(lesson);
  renderLessonList(topic);
}

function renderLessonList(topic) {
  lessonList.innerHTML = "";

  topic.lessons.forEach((lesson, index) => {
    const lessonItem = document.createElement("div");
    lessonItem.className = "lesson-item";

    if (index === selectedLessonIndex) {
      lessonItem.classList.add("active");
    }

    const isWatched = watchedLessons.includes(lesson.id);

    lessonItem.innerHTML = `
      <h4>${index + 1}. ${escapeHtml(lesson.title)}</h4>
      <p>${isWatched ? "<span class='watched'>✓ Watched</span>" : "Not watched yet"}</p>
    `;

    lessonItem.addEventListener("click", () => {
      selectedLessonIndex = index;
      renderCourse();
    });

    lessonList.appendChild(lessonItem);
  });
}

function renderMaterials(lesson) {
  materialList.innerHTML = "";

  if (!lesson.materials || lesson.materials.length === 0) {
    materialList.innerHTML = `<p class="muted">No materials added for this lesson.</p>`;
    return;
  }

  lesson.materials.forEach(material => {
    const link = document.createElement("a");
    link.className = "material-link";
    link.href = material.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `📄 ${material.title}`;
    materialList.appendChild(link);
  });
}

function markCurrentLessonWatched() {
  const topic = getSelectedTopic();
  if (!topic || topic.lessons.length === 0) return;

  const lesson = topic.lessons[selectedLessonIndex];

  if (!watchedLessons.includes(lesson.id)) {
    watchedLessons.push(lesson.id);
    localStorage.setItem("watchedLessons", JSON.stringify(watchedLessons));
    showToast("Lesson marked as watched");
  }

  renderCourse();
  renderDashboard();
}

function goToNextLesson() {
  const topic = getSelectedTopic();
  if (!topic) return;

  if (selectedLessonIndex < topic.lessons.length - 1) {
    selectedLessonIndex++;
    renderCourse();
  } else {
    showToast("You completed all lessons");
  }
}

function renderTopicSelect() {
  topicSelect.innerHTML = "";

  data.forEach(topic => {
    const option = document.createElement("option");
    option.value = topic.id;
    option.textContent = topic.name;
    topicSelect.appendChild(option);
  });
}

function renderAdminContentList() {
  adminContentList.innerHTML = "";

  data.forEach(topic => {
    const topicBox = document.createElement("div");
    topicBox.className = "admin-topic";

    const lessonsHtml = topic.lessons.map(lesson => `
      <div class="admin-lesson">
        <span>${escapeHtml(lesson.title)}</span>
        <button class="btn danger" onclick="deleteLessonFromFirebase('${lesson.id}')">Delete</button>
      </div>
    `).join("");

    topicBox.innerHTML = `
      <div class="admin-topic-header">
        <div>
          <strong>${escapeHtml(topic.icon)} ${escapeHtml(topic.name)}</strong>
          <p class="muted">${topic.lessons.length} lesson(s)</p>
        </div>
        <button class="btn danger" onclick="deleteTopicFromFirebase('${topic.id}')">Delete Topic</button>
      </div>
      ${lessonsHtml || "<p class='muted'>No lessons added yet.</p>"}
    `;

    adminContentList.appendChild(topicBox);
  });
}

async function addTopicToFirebase() {
  if (!currentAdminUser) {
    showToast("Please login as admin first.");
    return;
  }

  const name = document.getElementById("topicNameInput").value.trim();
  const icon = document.getElementById("topicIconInput").value.trim();
  const description = document.getElementById("topicDescInput").value.trim();

  if (!name || !description) {
    showToast("Please enter topic name and description.");
    return;
  }

  await addDoc(collection(db, "topics"), {
    name,
    icon: icon || "📘",
    description,
    createdAt: serverTimestamp()
  });

  document.getElementById("topicNameInput").value = "";
  document.getElementById("topicIconInput").value = "";
  document.getElementById("topicDescInput").value = "";

  showToast("Topic added successfully");
  await loadTopicsFromFirebase();
}

async function addLessonToFirebase() {
  if (!currentAdminUser) {
    showToast("Please login as admin first.");
    return;
  }

  const topicId = topicSelect.value;
  const title = document.getElementById("lessonTitleInput").value.trim();
  const youtubeUrl = document.getElementById("youtubeUrlInput").value.trim();
  const description = document.getElementById("lessonDescInput").value.trim();
  const materialTitle = document.getElementById("materialTitleInput").value.trim();
  const materialUrl = document.getElementById("materialUrlInput").value.trim();

  if (!topicId || !title || !youtubeUrl || !description) {
    showToast("Please fill topic, title, YouTube URL and description.");
    return;
  }

  const selectedTopic = data.find(topic => topic.id === topicId);
  const nextOrder = selectedTopic ? selectedTopic.lessons.length + 1 : 1;

  await addDoc(collection(db, "lessons"), {
    topicId,
    title,
    youtubeUrl,
    description,
    materialTitle,
    materialUrl,
    order: nextOrder,
    createdAt: serverTimestamp()
  });

  document.getElementById("lessonTitleInput").value = "";
  document.getElementById("youtubeUrlInput").value = "";
  document.getElementById("lessonDescInput").value = "";
  document.getElementById("materialTitleInput").value = "";
  document.getElementById("materialUrlInput").value = "";

  showToast("Lesson added successfully");
  await loadTopicsFromFirebase();
}

window.deleteLessonFromFirebase = async function (lessonId) {
  if (!currentAdminUser) {
    showToast("Please login as admin first.");
    return;
  }

  if (!confirm("Delete this lesson?")) return;

  await deleteDoc(doc(db, "lessons", lessonId));
  showToast("Lesson deleted");
  await loadTopicsFromFirebase();
};

window.deleteTopicFromFirebase = async function (topicId) {
  if (!currentAdminUser) {
    showToast("Please login as admin first.");
    return;
  }

  if (!confirm("Delete this topic? Lessons under this topic should be deleted separately.")) return;

  await deleteDoc(doc(db, "topics", topicId));
  showToast("Topic deleted");
  await loadTopicsFromFirebase();
};

function getSelectedTopic() {
  return data.find(topic => topic.id === selectedTopicId);
}

function getYouTubeEmbedUrl(input) {
  const videoId = extractYouTubeId(input);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
}

function extractYouTubeId(url) {
  if (!url) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return "";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

loadTopicsFromFirebase();