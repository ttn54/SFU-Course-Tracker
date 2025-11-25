// API Base URL
const API_URL = window.location.origin;

// State
let token = localStorage.getItem('token');
let currentUser = null;
let allCourses = [];
let completedCourses = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        loadUserData();
    } else {
        showAuthSection();
    }

    // Setup form listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
});

// Authentication Functions
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.querySelectorAll('.tab')[1].classList.remove('active');
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.querySelectorAll('.tab')[0].classList.remove('active');
    document.querySelectorAll('.tab')[1].classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            await loadUserData();
        } else {
            errorDiv.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            errorDiv.textContent = '';
            alert('Registration successful! Please login.');
            showLogin();
        } else {
            errorDiv.textContent = data.error || 'Registration failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showAuthSection();
}

// User Data Functions
async function loadUserData() {
    try {
        const response = await fetch(`${API_URL}/api/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentUser = await response.json();
            completedCourses = currentUser.completedCourses || [];
            showAppSection();
            await loadAllCourses();
        } else {
            logout();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        logout();
    }
}

async function loadAllCourses() {
    try {
        const response = await fetch(`${API_URL}/api/courses`);
        allCourses = await response.json();
        renderCourses();
        renderCompletedCourses();
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

async function loadEligibleCourses() {
    try {
        const response = await fetch(`${API_URL}/api/courses/eligible`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const eligibleCourses = await response.json();
        renderEligibleCourses(eligibleCourses);
    } catch (error) {
        console.error('Error loading eligible courses:', error);
    }
}

async function saveCompletedCourses() {
    const checkboxes = document.querySelectorAll('#completedCoursesList input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);

    try {
        const response = await fetch(`${API_URL}/api/user/courses`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completedCourses: selected })
        });

        if (response.ok) {
            currentUser = await response.json();
            completedCourses = currentUser.completedCourses;
            // Re-render both sections to update the green highlighting
            renderCourses();          
            renderCompletedCourses();
            
            document.getElementById('saveMessage').textContent = '✓ Saved successfully!';
            setTimeout(() => {
                document.getElementById('saveMessage').textContent = '';
            }, 3000);
        }
    } catch (error) {
        console.error('Error saving completed courses:', error);
        alert('Failed to save. Please try again.');
    }
}

// UI Functions
function showAuthSection() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('appSection').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
}

function showAppSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('userEmail').textContent = currentUser.email;
}

function showSection(section) {
    // Hide all sections
    document.getElementById('coursesSection').style.display = 'none';
    document.getElementById('completedSection').style.display = 'none';
    document.getElementById('eligibleSection').style.display = 'none';

    // Remove active class from all tabs
    document.querySelectorAll('.app-tab').forEach(tab => tab.classList.remove('active'));

    // Show selected section
    if (section === 'courses') {
        document.getElementById('coursesSection').style.display = 'block';
        document.querySelectorAll('.app-tab')[0].classList.add('active');
    } else if (section === 'completed') {
        document.getElementById('completedSection').style.display = 'block';
        document.querySelectorAll('.app-tab')[1].classList.add('active');
        renderCompletedCourses();
    } else if (section === 'eligible') {
        document.getElementById('eligibleSection').style.display = 'block';
        document.querySelectorAll('.app-tab')[2].classList.add('active');
        loadEligibleCourses();
    }
}

// Render Functions
function renderCourses() {
    const container = document.getElementById('coursesList');
    container.innerHTML = allCourses.map(course => `
        <div class="course-card ${completedCourses.includes(course.code) ? 'completed' : ''}">
            <div class="course-header">
                <div class="course-code">${course.code}</div>
            </div>
            <div class="course-name">${course.name}</div>
            ${renderPrerequisites(course.prerequisites, course.prerequisitesOr)}
        </div>
    `).join('');
}

function renderCompletedCourses() {
    const container = document.getElementById('completedCoursesList');
    container.innerHTML = allCourses.map(course => `
        <div class="course-card ${completedCourses.includes(course.code) ? 'completed' : ''}">
            <div class="course-header">
                <div class="course-code">${course.code}</div>
                <input type="checkbox" 
                       class="course-checkbox" 
                       value="${course.code}" 
                       ${completedCourses.includes(course.code) ? 'checked' : ''}>
            </div>
            <div class="course-name">${course.name}</div>
            ${renderPrerequisites(course.prerequisites, course.prerequisitesOr)}
        </div>
    `).join('');
}

function renderEligibleCourses(courses) {
    const container = document.getElementById('eligibleCoursesList');
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <div class="empty-state-text">
                    No eligible courses found. Complete more prerequisites to unlock new courses!
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = courses.map(course => `
        <div class="course-card eligible">
            <div class="course-header">
                <div class="course-code">${course.code}</div>
            </div>
            <div class="course-name">${course.name}</div>
            ${renderPrerequisites(course.prerequisites, course.prerequisitesOr)}
        </div>
    `).join('');
}

function renderPrerequisites(prerequisites, prerequisitesOr) {
    let prereqContent = '';

    // Render AND prerequisites
    if (prerequisites && prerequisites.length > 0) {
        prereqContent += `
            <div class="prerequisites-list">
                ${prerequisites.map(prereq => `
                    <span class="prerequisite-tag">${prereq}</span>
                `).join('')}
            </div>
        `;
    }

    // Render OR prerequisites
    if (prerequisitesOr && prerequisitesOr.length > 0) {
        prerequisitesOr.forEach((orGroup, index) => {
            const options = orGroup.split('|');
            if (prerequisites && prerequisites.length > 0) {
                prereqContent += '<div style="margin: 5px 0; color: #666; font-size: 12px;">AND</div>';
            } else if (index > 0) {
                prereqContent += '<div style="margin: 5px 0; color: #666; font-size: 12px;">AND</div>';
            }
            prereqContent += `
                <div class="prerequisites-list">
                    ${options.map((option, i) => `
                        <span class="prerequisite-tag prerequisite-or">${option}</span>
                        ${i < options.length - 1 ? '<span style="color: #667eea; font-weight: bold; margin: 0 5px;">OR</span>' : ''}
                    `).join('')}
                </div>
            `;
        });
    }

    if (!prereqContent) {
        return `
            <div class="prerequisites">
                <div class="prerequisites-label">Prerequisites</div>
                <div class="no-prerequisites">None</div>
            </div>
        `;
    }

    return `
        <div class="prerequisites">
            <div class="prerequisites-label">Prerequisites</div>
            ${prereqContent}
        </div>
    `;
}