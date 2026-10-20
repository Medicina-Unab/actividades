// Firebase and db are now available globally from firebase-config.js
// No imports needed for global script version

// DOM Elements
const semesterNav = document.getElementById('semester-nav');
const currentSemesterTitle = document.getElementById('current-semester-title');
const subjectFilterContainer = document.querySelector('.subject-filter-container');
const activitiesGrid = document.getElementById('activities-grid');

// Upload Elements
const uploadBtn = document.getElementById('upload-btn');
const uploadModal = document.getElementById('upload-modal');
const closeBtn = document.querySelector('.close-btn');
const uploadForm = document.getElementById('upload-form');
const semesterSelect = document.getElementById('semester-select');
const subjectSelect = document.getElementById('subject-select');
const submitBtn = document.getElementById('submit-btn');

// Theme Toggle Logic
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('i');
const themeText = themeToggleBtn.querySelector('span');

function updateThemeUI(theme) {
    if (theme === 'dark') {
        themeText.textContent = "🌙";
    } else {
        themeText.textContent = "☀️";
    }
}

// Check LocalStorage or System Preference
const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

if (initialTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}
updateThemeUI(initialTheme);

themeToggleBtn.onclick = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);
};

let currentSemesterId = 1;
let currentFilter = 'all';
let data = { semesters: [] };

// Initialize
async function init() {
    await fetchData();
    renderSidebar();
    if (data.semesters.length > 0) {
        // Find the first semester or the default one
        const semester = data.semesters.find(s => s.id === currentSemesterId) || data.semesters[0];
        if (semester) {
            loadSemester(semester.id);
        }
    }
}

// Fetch Data from Firestore
async function fetchData() {
    // Show Spinner
    activitiesGrid.innerHTML = `
        <div class="spinner-container">
            <div class="spinner"></div>
            <p>Cargando actividades...</p>
        </div>
    `;

    try {
        const querySnapshot = await db.collection("semesters").get();
        const semesters = await Promise.all(querySnapshot.docs.map(async (doc) => {
            const activitiesSnapshot = await doc.ref.collection("activities").get();
            const activities = activitiesSnapshot.docs.map(activityDoc => ({
                ...activityDoc.data(),
                id: activityDoc.id
            }));

            return { ...doc.data(), activities };
        }));

        // Sort semesters by ID to ensure correct order
        semesters.sort((a, b) => a.id - b.id);

        data.semesters = semesters;
    } catch (error) {
        console.error('Error fetching data:', error);
        activitiesGrid.innerHTML = '<p class="error-message">Error cargando las actividades desde la base de datos. Por favor intenta más tarde.</p>';
    }
}

// Render Sidebar
function renderSidebar() {
    semesterNav.innerHTML = '';
    data.semesters.forEach(semester => {
        const btn = document.createElement('button');
        btn.textContent = semester.name;
        if (semester.id === currentSemesterId) btn.classList.add('active');
        btn.onclick = () => {
            document.querySelectorAll('#semester-nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadSemester(semester.id);
        };
        semesterNav.appendChild(btn);
    });
}

// Load Semester Data
function loadSemester(id) {
    currentSemesterId = id;
    const semester = data.semesters.find(s => s.id === id);

    currentSemesterTitle.textContent = semester.name;

    // Render Filters
    renderFilters(semester.subjects);

    // Render Activities
    renderActivities(semester.activities);
}

// Render Filters
// Render Filters
function renderFilters(subjects) {
    subjectFilterContainer.innerHTML = ''; // Clear container

    // Create 'Todas' button
    const allBtn = document.createElement('button');
    allBtn.classList.add('filter-btn');
    if (currentFilter === 'all') allBtn.classList.add('active'); // Maintain active state if re-rendering
    allBtn.textContent = 'Todas';
    allBtn.dataset.filter = 'all';
    allBtn.onclick = (e) => handleFilterClick(e, 'all');
    subjectFilterContainer.appendChild(allBtn);

    subjects.forEach(subject => {
        const btn = document.createElement('button');
        btn.classList.add('filter-btn');
        if (currentFilter === subject) btn.classList.add('active');
        btn.textContent = subject;
        btn.dataset.filter = subject;
        btn.onclick = (e) => handleFilterClick(e, subject);
        subjectFilterContainer.appendChild(btn);
    });
}

// Handle Filter Click
function handleFilterClick(e, subject) {
    // Update Active State
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');

    currentFilter = subject;
    const semester = data.semesters.find(s => s.id === currentSemesterId);

    if (subject === 'all') {
        renderActivities(semester.activities);
    } else {
        const filteredActivities = semester.activities.filter(activity => activity.subject === subject);
        renderActivities(filteredActivities);
    }
}

// Render Activities
function renderActivities(activities) {
    activitiesGrid.innerHTML = '';

    if (!activities.length) {
        activitiesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No hay actividades disponibles para este filtro.</p>';
        return;
    }

    activities.forEach(activity => {
        const card = document.createElement('div');
        card.classList.add('activity-card');
        card.onclick = () => window.open(activity.url, '_blank');

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${activity.image}" alt="${activity.title}">
                <span class="badge">${activity.subject}</span>
            </div>
            <div class="card-content">
                <h3>${activity.title}</h3>
                <p class="author">Por: ${activity.author}</p>
                <div class="card-footer">
                    <span class="year-badge">${activity.year}</span>
                    <span class="view-activity-btn">Ver Actividad <i class="fas fa-external-link-alt"></i></span>
                </div>
            </div>
        `;

        activitiesGrid.appendChild(card);
    });
}

// --- Upload Modal Logic ---

if (uploadBtn) {
    // Open Modal
    uploadBtn.onclick = () => {
        uploadModal.style.display = "block";
        populateSemesterSelect();
    };

    // Close Modal
    closeBtn.onclick = () => {
        uploadModal.style.display = "none";
    };

    // Close on outside click
    window.onclick = (event) => {
        if (event.target == uploadModal) {
            uploadModal.style.display = "none";
        }
    };

    // Populate Semester Dropdown
    function populateSemesterSelect() {
        semesterSelect.innerHTML = '<option value="">Selecciona un semestre</option>';
        data.semesters.forEach(semester => {
            const option = document.createElement('option');
            option.value = semester.id;
            option.textContent = semester.name;
            semesterSelect.appendChild(option);
        });
    }

    // Handle Semester Change -> Populate Subjects
    semesterSelect.onchange = () => {
        const semesterId = parseInt(semesterSelect.value);
        subjectSelect.innerHTML = '<option value="">Selecciona una asignatura</option>';

        if (semesterId) {
            const semester = data.semesters.find(s => s.id === semesterId);
            if (semester) {
                semester.subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                });
                subjectSelect.disabled = false;
            }
        } else {
            subjectSelect.disabled = true;
        }
    };

    // Handle Form Submit
    uploadForm.onsubmit = async (e) => {
        e.preventDefault();

        const semesterId = parseInt(semesterSelect.value);
        const subject = subjectSelect.value;
        const title = document.getElementById('activity-title').value;
        const author = document.getElementById('activity-author').value;
        const year = parseInt(document.getElementById('activity-year').value);
        const url = document.getElementById('activity-url').value;

        if (!semesterId || !subject || !title || !author || !year || !url) {
            alert("Por favor completa todos los campos.");
            return;
        }

        submitBtn.textContent = "Subiendo...";
        submitBtn.disabled = true;

        try {
            const newActivity = {
                title: title,
                subject: subject,
                author: author,
                year: year,
                image: getSubjectImage(subject), // Auto-select image
                url: url
            };

            await db.collection("semesters")
                .doc(semesterId.toString())
                .collection("activities")
                .add(newActivity);

            alert("¡Actividad subida con éxito!");

            // Reset and Close
            uploadForm.reset();
            uploadModal.style.display = "none";
            submitBtn.textContent = "Subir Actividad";
            submitBtn.disabled = false;
            subjectSelect.disabled = true;

            // Refresh Data
            await fetchData();
            // If current view is the updated semester, reload it
            if (currentSemesterId === semesterId) {
                loadSemester(semesterId);
            }

        } catch (error) {
            console.error("Error uploading activity:", error);
            alert("Error al subir la actividad: " + error.message);
            submitBtn.textContent = "Subir Actividad";
            submitBtn.disabled = false;
        }
    };
}

// Helper: Select Image based on Subject
function getSubjectImage(subject) {
    const s = subject.toLowerCase();

    // Anatomy / Morphology
    if (s.includes('anatomía') || s.includes('morfológicas') || s.includes('cuerpo')) return 'assets/anatomy.png';
    // BCM / Cells / Genetics
    if (s.includes('histología') || s.includes('celular') || s.includes('genética') || s.includes('química') || s.includes('bioquímica')) return 'assets/biochemistry.png';
    // Public Health / Epidemiology
    if (s.includes('salud pública') || s.includes('epidemiología') || s.includes('sociedad') || s.includes('gestión') || s.includes('ética') || s.includes('legal')) return 'assets/public_health.png';
    // Clinical / Surgery / Pathology / Pediatrics
    if (s.includes('clínica') || s.includes('semiología') || s.includes('cirugía') || s.includes('patología') || s.includes('pediatría') || s.includes('ginecología') || s.includes('obstetricia') || s.includes('traumatología') || s.includes('urología') || s.includes('oftalmología') || s.includes('otorrino') || s.includes('integrador') || s.includes('psiquiatría') || s.includes('neurología') || s.includes('dermatología')) return 'assets/clinical.png';
    // Pharmacology
    if (s.includes('farmacología') || s.includes('medicamentos')) return 'assets/pharmacology.png';

    // Default
    return 'assets/logo.png';
}

// Check for firebase/db before init
if (typeof db !== 'undefined') {
    init();
} else {
    // Retry shortly if scripts are racing (simple workaround for script tag loading)
    setTimeout(init, 500);
}
