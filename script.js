const STORAGE_KEY = 'kunlik-planner-v1';
const DAILY_GOAL = 3;
const REWARDS = { low: 5, medium: 10, high: 15 };
const MONTHS_UZ = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
];
const WEEKDAYS_UZ = [
    'yakshanba', 'dushanba', 'seshanba', 'chorshanba',
    'payshanba', 'juma', 'shanba'
];
const FILTER_TITLES = {
    all: 'Barcha vazifalar',
    today: 'Bugungi vazifalar',
    active: 'Jarayondagi vazifalar',
    completed: 'Bajarilgan vazifalar'
};

const elements = {
    form: document.querySelector('#task-form'),
    titleInput: document.querySelector('#task-title'),
    categoryInput: document.querySelector('#task-category'),
    priorityInput: document.querySelector('#task-priority'),
    dateInput: document.querySelector('#task-date'),
    list: document.querySelector('#task-list'),
    search: document.querySelector('#task-search'),
    toast: document.querySelector('#toast')
};

let currentFilter = 'all';
let toastTimeout;
let state = loadState();

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isValidTask(task) {
    return task && typeof task.id === 'string' &&
        typeof task.title === 'string' &&
        typeof task.category === 'string' &&
        ['low', 'medium', 'high'].includes(task.priority) &&
        typeof task.completed === 'boolean' &&
        typeof task.rewarded === 'boolean';
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return { tasks: [], coins: 0, history: [] };

        const parsed = JSON.parse(saved);
        if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.history) ||
            !Number.isFinite(parsed.coins)) {
            throw new Error('Saqlangan reja ma’lumotlari formati noto‘g‘ri.');
        }

        return {
            tasks: parsed.tasks.filter(isValidTask),
            coins: Math.max(0, Math.floor(parsed.coins)),
            history: parsed.history.filter((entry) =>
                entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
                typeof entry.taskId === 'string'
            )
        };
    } catch (error) {
        console.error('Rejalarni yuklashda xatolik:', error);
        return { tasks: [], coins: 0, history: [] };
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Rejalarni saqlashda xatolik:', error);
        showToast('Ma’lumotlarni saqlab bo‘lmadi. Brauzer xotirasini tekshiring.');
    }
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => elements.toast.classList.remove('visible'), 2800);
}

function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    return `${date.getDate()} ${MONTHS_UZ[date.getMonth()]}`;
}

function getUniqueHistoryDates() {
    return new Set(state.history.map((entry) => entry.date));
}

function getStreak() {
    const dates = getUniqueHistoryDates();
    const cursor = new Date();
    if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);

    let streak = 0;
    while (dates.has(localDateKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

function renderHeader() {
    const now = new Date();
    document.querySelector('#full-date').textContent =
        `${WEEKDAYS_UZ[now.getDay()]}, ${now.getDate()} ${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()}`;
    document.querySelector('#today-label').textContent = WEEKDAYS_UZ[now.getDay()].toLocaleUpperCase();
    document.querySelector('#coin-count').textContent = state.coins;
    document.querySelector('#stat-coins').textContent = state.coins;
    document.querySelector('#streak-count').textContent = `${getStreak()} kun`;
}

function renderStats() {
    const completed = state.tasks.filter((task) => task.completed).length;
    const pending = state.tasks.length - completed;
    const today = localDateKey();
    const todayTasks = state.tasks.filter((task) => task.dueDate === today).length;

    document.querySelector('#stat-total').textContent = state.tasks.length;
    document.querySelector('#stat-completed').textContent = completed;
    document.querySelector('#stat-pending').textContent = pending;
    document.querySelector('#completed-hint').textContent = completed
        ? `${completed} ta vazifani uddaladingiz!`
        : 'Hali boshlashga ulguramiz';
    document.querySelector('#all-count').textContent = state.tasks.length;
    document.querySelector('#today-count').textContent = todayTasks;
    document.querySelector('#active-count').textContent = pending;

    const todayDoneIds = new Set(
        state.history.filter((entry) => entry.date === today).map((entry) => entry.taskId)
    );
    const goalProgress = Math.min(todayDoneIds.size, DAILY_GOAL);
    document.querySelector('#goal-progress-text').textContent = `${goalProgress} / ${DAILY_GOAL}`;
    document.querySelector('#goal-progress-bar').style.width = `${(goalProgress / DAILY_GOAL) * 100}%`;
    document.querySelector('#goal-footer').textContent = goalProgress >= DAILY_GOAL
        ? 'Ajoyib! Bugungi maqsadingizga erishdingiz. ✨'
        : `Yana ${DAILY_GOAL - goalProgress} ta vazifa — bugungi maqsadga yetasiz!`;
}

function renderWeek() {
    const chart = document.querySelector('#week-chart');
    chart.replaceChildren();
    const today = new Date();

    for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const key = localDateKey(date);
        const count = new Set(
            state.history.filter((entry) => entry.date === key).map((entry) => entry.taskId)
        ).size;
        const day = createElement('div', `week-day${offset === 0 ? ' is-today' : ''}`);
        const value = createElement('span', 'week-value', String(count));
        const track = createElement('div', 'week-track');
        const bar = createElement('span', 'week-bar');
        bar.style.height = `${Math.max(count ? 20 : 5, Math.min(count * 18, 100))}%`;
        track.append(bar);
        const label = createElement('span', 'week-label', WEEKDAYS_UZ[date.getDay()].slice(0, 2));
        day.append(value, track, label);
        chart.append(day);
    }
}

function matchesFilter(task) {
    if (currentFilter === 'today') return task.dueDate === localDateKey();
    if (currentFilter === 'active') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true;
}

function buildTaskCard(task) {
    const card = createElement('article', `task-card${task.completed ? ' is-completed' : ''}`);
    const check = createElement('button', `task-check${task.completed ? ' checked' : ''}`);
    check.type = 'button';
    check.dataset.action = 'toggle';
    check.dataset.id = task.id;
    check.setAttribute('aria-label', task.completed ? 'Vazifani qayta ochish' : 'Vazifani bajarildi deb belgilash');
    check.setAttribute('aria-pressed', String(task.completed));
    check.textContent = task.completed ? '✓' : '';

    const body = createElement('div', 'task-body');
    const title = createElement('p', 'task-title', task.title);
    if (task.completed) title.classList.add('completed-title');
    const meta = createElement('div', 'task-meta');
    meta.append(createElement('span', 'category-chip', task.category));
    const priorityNames = { low: 'Oson', medium: 'O‘rtacha', high: 'Muhim' };
    meta.append(createElement('span', `priority-label priority-${task.priority}`, priorityNames[task.priority]));
    if (task.dueDate) {
        const due = createElement('span', `due-date${!task.completed && task.dueDate < localDateKey() ? ' overdue' : ''}`,
            `◷ ${formatDate(task.dueDate)}`);
        meta.append(due);
    }
    body.append(title, meta);

    const actions = createElement('div', 'task-actions');
    const reward = createElement('span', 'task-reward', `✦ ${REWARDS[task.priority]}`);
    reward.title = task.rewarded ? 'Bu vazifa uchun tanga olingan' : 'Bajarilganda beriladigan tanga';
    const remove = createElement('button', 'delete-button', '×');
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.dataset.id = task.id;
    remove.setAttribute('aria-label', 'Vazifani o‘chirish');
    actions.append(reward, remove);
    card.append(check, body, actions);
    return card;
}

function renderTasks() {
    const query = elements.search.value.trim().toLocaleLowerCase('uz-UZ');
    const filteredTasks = state.tasks
        .filter(matchesFilter)
        .filter((task) => task.title.toLocaleLowerCase('uz-UZ').includes(query))
        .sort((a, b) => Number(a.completed) - Number(b.completed));

    elements.list.replaceChildren();
    if (filteredTasks.length === 0) {
        const empty = createElement('div', 'empty-state');
        empty.append(createElement('span', 'empty-icon', query ? '⌕' : '✦'));
        empty.append(createElement('h3', '', query ? 'Hech narsa topilmadi' : 'Bu yer hali bo‘sh'));
        empty.append(createElement('p', '', query
            ? 'Boshqa so‘z bilan qidirib ko‘ring.'
            : currentFilter === 'completed'
                ? 'Birinchi vazifangizni bajaring — u shu yerda ko‘rinadi.'
                : 'Yuqoridagi maydonga yangi rejangizni yozing.'));
        elements.list.append(empty);
        return;
    }

    filteredTasks.forEach((task) => elements.list.append(buildTaskCard(task)));
}

function renderAll() {
    renderHeader();
    renderStats();
    renderWeek();
    document.querySelector('#list-title').textContent = FILTER_TITLES[currentFilter];
    document.querySelector('#list-subtitle').textContent = currentFilter === 'all'
        ? 'Maqsadlaringiz sari izchil qadamlar'
        : 'Vazifalaringizni boshqaring va natijalarni kuzating';
    document.querySelectorAll('.nav-item').forEach((button) => {
        const isActive = button.dataset.filter === currentFilter;
        button.classList.toggle('active', isActive);
        if (isActive) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });
    renderTasks();
}

elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = elements.titleInput.value.trim();
    if (!title) {
        elements.titleInput.focus();
        return;
    }

    state.tasks.unshift({
        id: globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        category: elements.categoryInput.value,
        priority: elements.priorityInput.value,
        dueDate: elements.dateInput.value,
        completed: false,
        rewarded: false,
        completedAt: null
    });
    saveState();
    elements.form.reset();
    elements.priorityInput.value = 'medium';
    currentFilter = 'all';
    renderAll();
    elements.titleInput.focus();
    showToast('Yangi vazifa qo‘shildi. Omad! ✨');
});

elements.list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const task = state.tasks.find((item) => item.id === button.dataset.id);
    if (!task) return;

    if (button.dataset.action === 'delete') {
        state.tasks = state.tasks.filter((item) => item.id !== task.id);
        saveState();
        renderAll();
        showToast('Vazifa o‘chirildi.');
        return;
    }

    task.completed = !task.completed;
    if (task.completed) {
        task.completedAt = new Date().toISOString();
        const today = localDateKey();
        const alreadyLoggedToday = state.history.some((entry) =>
            entry.date === today && entry.taskId === task.id
        );
        if (!alreadyLoggedToday) state.history.push({ date: today, taskId: task.id });

        if (!task.rewarded) {
            const reward = REWARDS[task.priority];
            task.rewarded = true;
            state.coins += reward;
            saveState();
            renderAll();
            showToast(`Barakalla! Hisobingizga ${reward} tanga qo‘shildi. ✦`);
            return;
        }
        showToast('Vazifa bajarildi — avvalgi mukofotingiz saqlangan.');
    } else {
        task.completedAt = null;
    }

    saveState();
    renderAll();
});

document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        renderAll();
    });
});

elements.search.addEventListener('input', renderTasks);

renderAll();
