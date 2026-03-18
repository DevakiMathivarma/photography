let currentProjectId = null;

/* ===============================
   TAB SWITCHING (SESSIONS)
================================ */
document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".session-tabs span").forEach(tab => {
    tab.addEventListener("click", () => {
      window.location.href = `/sessions/?tab=${tab.dataset.tab}`;
    });
  });

  const refreshBtn = document.querySelector(".refresh-btn");
  if (refreshBtn) {
    refreshBtn.onclick = () => window.location.href = "/sessions/";
  }
});

/* ===============================
   ASSIGN TEAM CLICK (SAFE)
================================ */
document.addEventListener("click", e => {
  const btn = e.target.closest(".assign-link");
  if (!btn) return;

  e.preventDefault();

  currentProjectId = btn.dataset.project;
  if (!currentProjectId) return;

  openTeamPopupFromSessions(currentProjectId);
});

/* ===============================
   OPEN TEAM POPUP
================================ */
function openTeamPopupFromSessions(projectId) {

  const wrapper = document.querySelector(".team-assign-inline");
  const popup   = document.getElementById("teamAssignPopup");
  const sessionsWrapper = document.querySelector(".sessions-wrapper");

  if (!wrapper || !popup || !sessionsWrapper) {
    console.error("❌ Required popup elements not found");
    return;
  }

  /* 🔥 HIDE SESSIONS */
  sessionsWrapper.style.display = "none";

  /* 🔥 SHOW POPUP */
  wrapper.classList.add("show");
  popup.style.display = "flex";

  fetch(`/projects/details/${projectId}/`)
    .then(res => res.json())
    .then(data => {

      document.getElementById("popupClient").innerText =
        data.client_name || "";

      document.getElementById("popupLocation").innerText =
        data.location || "";

      document.getElementById("popupTime").innerText =
        data.start_session || "";

      document.getElementById("popupDuration").innerText =
        data.event_type || "";

      document.getElementById("popupDates").innerText =
        `${data.start_date} — ${data.end_date}`;
 popup.style.display = "flex";
 console.log(data);
  renderTeamMembers(data);
         document
        .querySelectorAll(".member-pill.selectable:not(.booked)")
        .forEach(pill => {
            console.log(pill.dataset.name)
          const name = pill.dataset.name || "";
          const role = pill.dataset.role || "";
          
          pill.dataset.tooltip = `${name}\n${role}`;
        });
     

      
    
    })
    .catch(err => console.error("❌ Project fetch failed", err));
}
const roleGroupMap = {
  ASSISTANT: "general",
  PHOTOGRAPHER: "pre",
  VIDEOGRAPHER: "pre",
  EDITOR: "post"
};

/* ===============================
   RENDER TEAM MEMBERS
================================ */
function renderTeamMembers(data) {
// const container = document.querySelector('.member-pill selectable');
//   data.general_team.forEach(m => {
//     const pill = document.createElement("span");
//     pill.className = "member-pill selectable";
//     pill.dataset.id = m.id;
//     pill.dataset.name = m.name;
//     pill.dataset.role = m.role;

//     console.log(m.name)

//     pill.innerText = m.name.slice(0,2).toUpperCase();
//     container.appendChild(pill);
//   });
const groups = {
    general: document.querySelector('.pill-row[data-group="general"]'),
    pre: document.querySelector('.pill-row[data-group="pre"]'),
    post: document.querySelector('.pill-row[data-group="post"]')
  };

  // Clear all rows first
  Object.values(groups).forEach(row => row.innerHTML = "");

  if (!data.general_team || data.general_team.length === 0) {
    Object.values(groups).forEach(row => {
      row.innerHTML = `<span class="no-member">No members</span>`;
    });
    return;
  }

  data.general_team.forEach(m => {
    const targetGroup = roleGroupMap[m.role];

    // If role not mapped, skip safely
    if (!targetGroup || !groups[targetGroup]) return;

    const initials = m.name.slice(0, 2).toUpperCase();

    const pill = document.createElement("span");
    pill.className = "member-pill selectable";
    pill.dataset.id = m.id;
    pill.dataset.role = m.role;
    pill.dataset.name = m.name;
    pill.textContent = initials;

    groups[targetGroup].appendChild(pill);
  });

  // Show "No members" only if column is empty
  Object.entries(groups).forEach(([key, row]) => {
    if (!row.children.length) {
      row.innerHTML = `<span class="no-member">No members</span>`;
    }
  });
//       const generalRow = document.querySelector('.pill-row[data-group="general"]');
//   generalRow.innerHTML = "";

//   if (!data.general_team || data.general_team.length === 0) {
//     generalRow.innerHTML = `<span class="no-member">No members</span>`;
//   } else {
//     data.general_team.forEach(m => {
//       const initials = m.name.slice(0, 2).toUpperCase();

//       const pill = document.createElement("span");
//       pill.className = "member-pill selectable";
//       pill.dataset.id = m.id;
//       pill.dataset.role = m.role;
//       pill.dataset.name = m.name;
//       pill.textContent = initials;

//       generalRow.appendChild(pill);
//     });
//   }
//     const post = document.querySelector('.pill-row[data-group="post"]');
//   post.innerHTML = "";

//   if (!data.general_team || data.general_team.length === 0) {
//     post.innerHTML = `<span class="no-member">No members</span>`;
//   } else {
//     data.general_team.forEach(m => {
//       const initials = m.name.slice(0, 2).toUpperCase();

//       const pill = document.createElement("span");
//       pill.className = "member-pill selectable";
//       pill.dataset.id = m.id;
//       pill.dataset.role = m.role;
//       pill.dataset.name = m.name;
//       pill.textContent = initials;

//       post.appendChild(pill);
//     });
//   }
//       const pre = document.querySelector('.pill-row[data-group="pre"]');
//   pre.innerHTML = "";

//   if (!data.general_team || data.general_team.length === 0) {
//     pre.innerHTML = `<span class="no-member">No members</span>`;
//   } else {
//     data.general_team.forEach(m => {
//       const initials = m.name.slice(0, 2).toUpperCase();

//       const pill = document.createElement("span");
//       pill.className = "member-pill selectable";
//       pill.dataset.id = m.id;
//       pill.dataset.role = m.role;
//       pill.dataset.name = m.name;
//       pill.textContent = initials;

//       pre.appendChild(pill);
//     });
//   }
  const bookedRow = document.querySelector(".team-booked .pill-row");
  if (!bookedRow) return;

  bookedRow.innerHTML = "";

  if (!data.booked_members || !data.booked_members.length) {
    bookedRow.innerHTML = `<span class="no-member">No members</span>`;
    return;
  }

  data.booked_members.forEach(m => {
    const pill = document.createElement("span");
    pill.className = "member-pill booked selectable";
    pill.dataset.id = m.id;
    pill.dataset.name = m.name;
    pill.dataset.role = m.role;
    pill.title = m.booked_info || "";

    pill.innerText = m.name
      .split(" ")
      .map(w => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    bookedRow.appendChild(pill);
  });
}
// function renderTeamMembers(data) {
//   const bookedBox = document.querySelector(".team-booked .pill-row");
//   bookedBox.innerHTML = "";

//   data.booked_members.forEach(m => {
//     const pill = document.createElement("span");
//     pill.className = "member-pill booked selectable";
//     pill.dataset.id = m.id;

//     pill.title = `${m.name}\n${m.role}\n${m.booked_info || ""}`;

//     // 👇 initials computed here
//     pill.innerText = m.name
//       .split(" ")
//       .map(w => w[0])
//       .join("")
//       .slice(0, 2)
//       .toUpperCase();

//     bookedBox.appendChild(pill);
//   });
// }
/* ===============================
   TEAM TAB SWITCH
================================ */
document.addEventListener("click", e => {
  const tab = e.target.closest(".figma-tabs span");
  if (!tab) return;

  document.querySelectorAll(".figma-tabs span")
    .forEach(t => t.classList.remove("active"));

  tab.classList.add("active");

  const available = document.querySelector(".team-available");
  const booked = document.querySelector(".team-booked");

  if (!available || !booked) return;

  if (tab.dataset.tab === "available") {
    available.style.display = "block";
    booked.style.display = "none";
  } else {
    available.style.display = "none";
    booked.style.display = "block";
  }
});

/* ===============================
   MEMBER SELECT
================================ */
document.addEventListener("click", e => {
  if (!e.target.classList.contains("member-pill")) return;

  if (e.target.classList.contains("booked")) {
    showWarningToast("⚠ This member is booked on another session");
    return;
  }

  e.target.classList.toggle("selected");
});

/* ===============================
   SEND NOTIFICATION → TASK POPUP
================================ */
function validateAndProceed() {

  const selected = document.querySelectorAll(".member-pill.selected");
  const date = document.querySelector(".figma-date")?.value;

  if (!selected.length) {
    showWarningToast("Please select team members");
    return;
  }

  if (!date) {
    showWarningToast("Date is required");
    return;
  }

  proceedToTasksFromSessions();
}

/* ===============================
   SAVE TEAM → OPEN TASKS
================================ */
function proceedToTasksFromSessions() {

  const members = Array.from(
    document.querySelectorAll(".member-pill.selected")
  ).map(pill => pill.dataset.id);

  fetch("/projects/assign-team/", {
    method: "POST",
    headers: {
      "X-CSRFToken": document.getElementById("csrf_token").value,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      project_id: currentProjectId,
      members: members.join(",")
    })
  })
    .then(data => {
    closeTeamPopup();
     updateSessionCardUI(data.project_id, data);

    document.getElementById("taskPopup").style.display = "flex";
    loadTasks(currentProjectId);
  });
}
function updateSessionCardUI(projectId, data) {
  const card = document.querySelector(
    `.session-card[data-project-id="${projectId}"]`
  );
  if (!card) return;

  card.classList.remove("pending");
  card.classList.add("assigned");

  const badge = card.querySelector(".status-badge");
  if (badge) badge.innerText = "In Progress";

  const assignBox = card.querySelector(".assign-now");
  if (assignBox && data.assigned_team) {
    assignBox.innerHTML = data.assigned_team
      .map(m => `<span class="avatar">${m.name[0]}</span>`)
      .join("");
  }
}



/* ===============================
   CLOSE POPUPS
================================ */
function closeTeamPopup() {

  const wrapper = document.querySelector(".team-assign-inline");
  const popup = document.getElementById("teamAssignPopup");
  const sessionsWrapper = document.querySelector(".sessions-wrapper");

  if (wrapper) wrapper.classList.remove("show");
  if (popup) popup.style.display = "none";
  if (sessionsWrapper) sessionsWrapper.style.display = "block";
}

function closeTaskPopup() {
  document.getElementById("taskPopup").style.display = "none";
}

/* ===============================
   WARNING TOAST
================================ */
function showWarningToast(message) {

  let toast = document.getElementById("warnToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "warnToast";
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "#b3261e";
    toast.style.color = "#fff";
    toast.style.padding = "10px 18px";
    toast.style.borderRadius = "10px";
    toast.style.zIndex = "10000";
    document.body.appendChild(toast);
  }

  toast.innerText = message;
  toast.style.opacity = "1";

  setTimeout(() => toast.style.opacity = "0", 2000);
}

// function finishAssignment() {
//   closeTaskPopup();
//   window.location.reload();
// }
function finishAssignment() {
  fetch("/projects/update-status/", {
    method: "POST",
    headers: {
      "X-CSRFToken": document.getElementById("csrf_token").value,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      project_id: currentProjectId,
      status: "PRE"
    })
  })
  .then(() => {
    closeTaskPopup();
    window.location.reload(); // UI sync
  });
}





let projectTeam = [];
let pendingTaskUpdates = {};    


function closeTaskPopup() {
    document.getElementById("taskPopup").style.display = "none";
}

/* ================= LOAD TASKS ================= */
function loadTasks(projectId) {
    fetch(`/projects/${projectId}/tasks/`)
        .then(res => res.json())
        .then(data => {
            projectTeam = data.team_members || [];
            renderTasks(data.tasks || {});
        });
}
function setText(element, html) {
  if (!element) return;
  element.innerHTML = html;
}
function updateStatusUI(taskId, status) {
  const statusBox = document.getElementById(`status-${taskId}`);
  if (!statusBox) return;

  // reset classes
  statusBox.className = `dropdown status ${status}`;

  // update label
  statusBox.querySelector(".dropdown-trigger").innerText =
    status.replace("_", " ");
}

function renderTasks(taskGroups) {
  const container = document.getElementById("taskContainer");

  container.innerHTML = `
    <div class="task-table-header">
      <span>Task ID</span>
      <span>Task Name</span>
      <span>Assigned To</span>
      <span>Status</span>
      <span>Start Date</span>
      <span>Due Date</span>
      <span>Progress</span>
      <span>Actions</span>
    </div>
  `;

  Object.keys(taskGroups).forEach(phase => {
    const tasks = taskGroups[phase];

    container.innerHTML += `
      <div class="task-phase-strip">
        📁 ${formatPhase(phase)} (${tasks.length})
      </div>
    `;

    tasks.forEach(task => {
      const assigned = projectTeam.find(m => m.id === task.assigned_to_id);
      const progress = task.progress || 40;

      container.innerHTML += `
        <div class="task-row" data-task-id="${task.id}">

          <!-- ID -->
          <div>${task.code}</div>

          <!-- TITLE -->
          <div>
            <span class="task-title" contenteditable
              oninput="queueUpdate(${task.id},{title:this.innerText})">
              ${task.title}
            </span>
          </div>

          <!-- ASSIGNED -->
          <div>
            <div class="dropdown">
              <div class="dropdown-trigger assigned-box" id="assign-${task.id}">
                ${assigned
                  ? `<span class="avatar">${assigned.name[0]}</span><span>${assigned.name}</span>`
                  : `<span class="unassigned">Unassigned</span>`
                }
              </div>

              <div class="dropdown-menu">
                <div onclick="
                  queueUpdate(${task.id},{assigned_to:''});
                  setText(
                    document.getElementById('assign-${task.id}'),
                    '<span class=unassigned>Unassigned</span>'
                  );
                ">Unassigned</div>

                ${projectTeam.map(m => `
                  <div onclick="
                    queueUpdate(${task.id},{assigned_to:${m.id}});
                    setText(
                      document.getElementById('assign-${task.id}'),
                      '<span class=avatar>${m.name[0]}</span><span>${m.name}</span>'
                    );
                  ">
                    <span class="avatar">${m.name[0]}</span>${m.name}
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- STATUS -->
          <div>
            <div class="dropdown status ${task.status}" id="status-${task.id}">
              <div class="dropdown-trigger">
                ${task.status.replace("_"," ")}
              </div>
              <div class="dropdown-menu">
                <div onclick="
                  queueUpdate(${task.id},{status:'OPEN'});
                  updateStatusUI(${task.id}, 'OPEN');
                ">Open</div>

                <div onclick="
                  queueUpdate(${task.id},{status:'ON_HOLD'});
                  updateStatusUI(${task.id}, 'ON_HOLD');
                ">On Hold</div>

                <div onclick="
                  queueUpdate(${task.id},{status:'COMPLETED'});
                  updateStatusUI(${task.id}, 'COMPLETED');
                ">Completed</div>
              </div>
            </div>
          </div>

          <!-- START -->
          <div>
            <input type="date"
              value="${task.start_date || ""}"
              onchange="queueUpdate(${task.id},{start_date:this.value})">
          </div>

          <!-- DUE -->
          <div>
            <input type="date"
              value="${task.due_date || ""}"
              onchange="queueUpdate(${task.id},{due_date:this.value})">
          </div>

          <!-- PROGRESS -->
          <div>
            <div class="progress">
              <span style="width:${progress}%"></span>
            </div>
          </div>

          <!-- ACTIONS -->
          <div class="task-actions">
            <button class="save-btn" onclick="saveTask(${task.id})">✔</button>
            <button class="delete-btn" onclick="deleteTask(${task.id})">🗑</button>
          </div>

        </div>
      `;
    });

    container.innerHTML += `
      <button class="task-add-btn" onclick="addTask('${phase}')">
        + Add Task
      </button>
    `;
  });
}


function queueUpdate(taskId, data) {
  if (!pendingTaskUpdates[taskId]) {
    pendingTaskUpdates[taskId] = {};
  }
  Object.assign(pendingTaskUpdates[taskId], data);
}

/* SAVE ON ✔ CLICK */
function saveTask(taskId) {
  if (!pendingTaskUpdates[taskId]) {
    return;
  }

  fetch("/projects/tasks/update/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      task_id: taskId,
      ...pendingTaskUpdates[taskId]
    })
  })
  .then(res => res.json())
 .then(() => {
  delete pendingTaskUpdates[taskId];

  const toast = document.getElementById("saveToast");
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 1500);

  loadTasks(currentProjectId);
});
}
function applyImmediateUI(taskId, field, value, labelHTML) {
  const row = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!row) return;

  if (field === "assigned_to") {
    row.querySelector(".assigned-box").innerHTML = labelHTML;
  }

  if (field === "status") {
    const statusBox = row.querySelector(".status");
    statusBox.className = `dropdown status ${value}`;
    statusBox.querySelector(".dropdown-trigger").innerText =
      value.replace("_", " ");
  }
}



/* ================= TASK ACTIONS ================= */
function addTask(phase) {
    fetch("/projects/tasks/add/", {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken(),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            project_id: currentProjectId,
            title: "New Task",
            phase: phase
        })
    }).then(() => loadTasks(currentProjectId));
}

function editTask(id, title) {
    updateTask(id, { title });
}

function assignTask(id, member) {
    updateTask(id, { assigned_to: member });
}

function updateTask(id, data) {
  fetch("/projects/tasks/update/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      task_id: id,
      ...data
    })
  });
}

function deleteTask(id) {
  fetch("/projects/tasks/delete/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ task_id: id })
  }).then(() => loadTasks(currentProjectId));
}



/* ================= HELPERS ================= */
function csrfToken() {
    return document.getElementById("csrf_token").value;
}

function formatPhase(phase) {
    return phase.replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, c => c.toUpperCase());
}

// ================================================================
// crew_planning.js  — v2 (all bugs fixed)
//
// FIXES:
//  1. Role labels under circles now show short abbr (TP, TV, CP..)
//     Full name shown as tooltip on hover
//  2. Slot assignment uses slot_id as key (not role code)
//     so duplicate roles (2x TP) are tracked independently
//  3. Same member cannot be assigned to two slots — once picked,
//     they are greyed out across all member grids
//  4. Role name normalisation: teamRoles may contain full names
//     ("Traditional Photographer") or codes ("TP") — both handled
// ================================================================
// ================================================================
// crew_planning.js  — v2 (all bugs fixed)
//
// FIXES:
//  1. Role labels under circles now show short abbr (TP, TV, CP..)
//     Full name shown as tooltip on hover
//  2. Slot assignment uses slot_id as key (not role code)
//     so duplicate roles (2x TP) are tracked independently
//  3. Same member cannot be assigned to two slots — once picked,
//     they are greyed out across all member grids
//  4. Role name normalisation: teamRoles may contain full names
//     ("Traditional Photographer") or codes ("TP") — both handled
// ================================================================

// ── ROLE CODE ↔ LABEL MAP ─────────────────────────────────────────
const ROLE_LABEL = {
    "TP": "Traditional Photographer",
    "CP": "Candid Photographer",
    "TV": "Traditional Videographer",
    "CV": "Candid Videographer",
    "CI": "Cinematic Videographer",
    "DR": "Drone Operator",
    "PH": "Photographer",
    "VG": "Videographer",
};

// Reverse map: full name → code
const ROLE_CODE = {};
Object.entries(ROLE_LABEL).forEach(([code, label]) => { ROLE_CODE[label] = code; });

// Normalise whatever comes from teamRoles → always return the CODE ("TP" etc.)
function _normaliseRole(raw) {
    if (!raw) return raw;
    const trimmed = raw.trim();
    if (ROLE_LABEL[trimmed]) return trimmed;         // already a code
    if (ROLE_CODE[trimmed])  return ROLE_CODE[trimmed]; // full name → code
    return trimmed;                                  // unknown, return as-is
}

function _roleLabel(code) {
    return ROLE_LABEL[_normaliseRole(code)] || code;
}


// ── STATE ─────────────────────────────────────────────────────────
let _cpProjectId   = null;
let _cpData        = null;
// KEY CHANGE: keyed by slot_id (unique per circle), NOT by role code
// _cpAssignments[slot_id] = { crew_member_id, name, initials, role }
let _cpAssignments = {};
let _cpActiveSlot  = null;
let _autoResult    = null;


// ── CSRF ──────────────────────────────────────────────────────────
function _csrf() {
    return document.getElementById('csrf_token')?.value || '';
}

// ── TOAST ─────────────────────────────────────────────────────────
function showCrewToast(msg, type = 'info') {
    const t = document.getElementById('crewToast');
    if (!t) return;
    t.textContent = msg;
    t.className = `crew-toast crew-toast--${type}`;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
}

// ── All crew member IDs already assigned to ANY slot ─────────────
function _usedMemberIds() {
    return new Set(Object.values(_cpAssignments).map(a => a.crew_member_id));
}


// ================================================================
// STEP 1: OPEN ASSIGN MODE CHOOSER
// ================================================================
document.addEventListener('click', e => {
    const btn = e.target.closest('.assign-crew-btn');
    if (!btn) return;

    _cpProjectId = btn.dataset.project;
    const client = btn.dataset.client || '';
    const event  = btn.dataset.event  || '';

    const label = document.getElementById('amEventLabel');
    if (label) label.textContent = `${event} — ${client}`;

    const overlay = document.getElementById('assignModeOverlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.querySelector('.am-card').classList.add('am-pop');
    }));
});

function closeAssignMode() {
    const overlay = document.getElementById('assignModeOverlay');
    overlay.querySelector('.am-card').classList.remove('am-pop');
    setTimeout(() => { overlay.style.display = 'none'; }, 260);
}


// ================================================================
// STEP 2A: AUTO ASSIGN
// ================================================================
function triggerAutoAssign() {
    closeAssignMode();

    const overlay    = document.getElementById('autoAssignOverlay');
    const body       = document.getElementById('autoAssignBody');
    const confirmBtn = document.getElementById('confirmAutoBtn');

    confirmBtn.style.display = 'none';
    body.innerHTML = `
        <div class="aa-loading">
            <div class="aa-spinner"></div>
            <p>Checking crew availability...</p>
        </div>`;

    overlay.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.querySelector('.cp-modal').classList.add('cp-pop');
    }));

    fetch('/crew/auto-assign/', {
        method: 'POST',
        headers: { 'X-CSRFToken': _csrf(), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ project_id: _cpProjectId })
    })
    .then(r => r.json())
    .then(data => { _autoResult = data; _renderAutoResult(data); })
    .catch(() => {
        body.innerHTML = `<div class="aa-error">Failed to contact server. Please try again.</div>`;
    });
}

function _renderAutoResult(data) {
    const body       = document.getElementById('autoAssignBody');
    const confirmBtn = document.getElementById('confirmAutoBtn');
    const sub        = document.getElementById('autoAssignSub');

    if (!data.success) {
        body.innerHTML = `<div class="aa-error">${data.error || 'Auto-assign failed'}</div>`;
        return;
    }

    const assigned = data.assigned || [];
    const failed   = data.failed   || [];

    sub.textContent = `${assigned.length} crew assigned${failed.length ? `, ${failed.length} role(s) unavailable` : ''}`;

    let html = '';

    if (assigned.length > 0) {
        html += `<div class="aa-section-label">✓ Assigned</div><div class="aa-crew-grid">`;
        assigned.forEach(m => {
            const code  = _normaliseRole(m.role_slot || m.role);
            const label = _roleLabel(code);
            html += `
                <div class="aa-crew-card">
                    <div class="aa-avatar">${m.initials}</div>
                    <div class="aa-crew-info">
                        <div class="aa-crew-name">${m.name}</div>
                        <div class="aa-crew-role">${label}</div>
                    </div>
                    <div class="aa-slot-badge" title="${label}">${code}</div>
                </div>`;
        });
        html += `</div>`;
    }

    if (failed.length > 0) {
        html += `<div class="aa-section-label aa-section-label--warn">⚠ No availability found</div>`;
        failed.forEach(f => {
            const code  = _normaliseRole(f.role_slot || f.role);
            const label = _roleLabel(code);
            html += `<div class="aa-failed-row">
                <span class="aa-slot-badge aa-slot-badge--warn" title="${label}">${code}</span>
                <span>${label} — ${f.reason}</span>
            </div>`;
        });
    }

    body.innerHTML = html || `<div class="cp-empty">No role slots found for this project</div>`;
    if (assigned.length > 0) confirmBtn.style.display = 'inline-flex';
}

function confirmAutoAssign() {
    if (!_autoResult || !_autoResult.assigned) return;
    _updateCardSlots(_cpProjectId, _autoResult.assigned);
    closeAutoAssign();
    showCrewToast(`✓ ${_autoResult.assigned.length} crew members assigned`, 'success');
}

function closeAutoAssign() {
    const overlay = document.getElementById('autoAssignOverlay');
    overlay.querySelector('.cp-modal').classList.remove('cp-pop');
    setTimeout(() => { overlay.style.display = 'none'; }, 280);
}


// ================================================================
// STEP 2B: MANUAL ASSIGN — CREW PLANNING POPUP
// ================================================================
function triggerManualAssign() {
    closeAssignMode();

    const overlay = document.getElementById('crewPlanningOverlay');
    const sub     = document.getElementById('cpSubTitle');
    sub.textContent = 'Loading crew data...';

    _cpActiveSlot  = null;
    _cpAssignments = {};

    overlay.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.querySelector('.cp-modal').classList.add('cp-pop');
    }));

    fetch(`/crew/planning/${_cpProjectId}/`)
        .then(r => r.json())
        .then(data => {
            _cpData = data;
            sub.textContent = `${data.event_type} — ${data.client_name}`;
            _buildCrewPlanningUI(data);
        })
        .catch(() => showCrewToast('Failed to load crew data', 'error'));
}

function _buildCrewPlanningUI(data) {
    const dateEl = document.getElementById('cpDateDisplay');
    const sessEl = document.getElementById('cpSessionDisplay');
    if (dateEl) dateEl.textContent = data.date_display || '—';
    if (sessEl) sessEl.textContent = data.event_session || '—';

    // ── Normalise role_slots (codes or full names → always codes) ─
    _cpData.role_slots = (data.role_slots || []).map((slot, idx) => {
        const code = _normaliseRole(slot.role || slot.role_slot || slot);
        return {
            role:       code,
            role_label: _roleLabel(code),
            slot_index: slot.slot_index ?? idx,
            slot_id:    slot.slot_id || `${code}_${slot.slot_index ?? idx}`,
        };
    });

    // ── Pre-fill existing assignments keyed by slot_id ────────────
    _cpAssignments = {};
    const existing       = data.current_assignments || {};
    const roleSlotCounts = {};

    _cpData.role_slots.forEach(slot => {
        const n            = roleSlotCounts[slot.role] || 0;
        roleSlotCounts[slot.role] = n + 1;

        const membersForRole = existing[slot.role] || [];
        const member         = membersForRole[n];
        if (member) {
            _cpAssignments[slot.slot_id] = {
                crew_member_id: member.id,
                name:           member.name,
                initials:       member.initials || member.name.slice(0,2).toUpperCase(),
                role:           slot.role,
            };
        }
    });

    _buildSlotCircles();
    _buildMemberGrid('cpMembersAvailable', data.available_groups, false);
    _buildMemberGrid('cpMembersBooked',    data.booked_groups,    true);
}


// ── Build role slot circles ────────────────────────────────────────
function _buildSlotCircles() {
    const row = document.getElementById('cpSlotsRow');
    if (!row || !_cpData) return;
    row.innerHTML = '';

    _cpData.role_slots.forEach(slot => {
        const assigned = _cpAssignments[slot.slot_id];

        const circle = document.createElement('div');
        circle.className = 'cp-slot-circle' + (assigned ? ' cp-slot-filled' : '');
        circle.dataset.slotId = slot.slot_id;
        circle.dataset.role   = slot.role;
        circle.title          = slot.role_label; // full name tooltip

        if (assigned) {
            circle.innerHTML = `
                <div class="cp-slot-avatar">${assigned.initials}</div>
                <button class="cp-slot-remove" onclick="removeSlotAssignment('${slot.slot_id}', event)">✕</button>`;
        } else {
            circle.innerHTML = `<div class="cp-slot-plus">+</div>`;
        }

        // Short label = code only (TP, CV etc.)
        const label = document.createElement('div');
        label.className   = 'cp-slot-label';
        label.textContent = slot.role;
        label.title       = slot.role_label;

        const wrap = document.createElement('div');
        wrap.className = 'cp-slot-wrap';
        wrap.appendChild(circle);
        wrap.appendChild(label);

        circle.addEventListener('click', () => _selectSlot(slot));
        row.appendChild(wrap);
    });
}


// ── Select a slot ─────────────────────────────────────────────────
function _selectSlot(slot) {
    _cpActiveSlot = slot;

    document.querySelectorAll('.cp-slot-circle').forEach(c => c.classList.remove('cp-slot-active'));
    const activeCircle = document.querySelector(`.cp-slot-circle[data-slot-id="${slot.slot_id}"]`);
    if (activeCircle) activeCircle.classList.add('cp-slot-active');

    const lbl = document.getElementById('cpActiveSlotLabel');
    if (lbl) {
        lbl.textContent  = `Assigning: ${slot.role_label}`;
        lbl.style.display = 'block';
        lbl.style.color   = '#8B1A1A';
    }

    switchCpTab('available', document.querySelector('.cp-tab[data-cptab="available"]'));

    const groupEl = document.getElementById(`cpGroup-${slot.role}`);
    if (groupEl) {
        groupEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        groupEl.classList.add('cp-group-highlight');
        setTimeout(() => groupEl.classList.remove('cp-group-highlight'), 1200);
    }
}


// ── Build member grid ──────────────────────────────────────────────
function _buildMemberGrid(containerId, groups, isBooked) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!groups || groups.length === 0) {
        container.innerHTML = `<div class="cp-empty">No members found</div>`;
        return;
    }

    const usedIds = _usedMemberIds();

    groups.forEach(group => {
        const roleCode  = _normaliseRole(group.role);
        const roleLabel = _roleLabel(roleCode);

        const section = document.createElement('div');
        section.className = 'cp-role-group';
        section.id        = `cpGroup-${roleCode}`;
        section.innerHTML = `<div class="cp-role-group-label">${roleLabel}</div>`;

        const pillsRow = document.createElement('div');
        pillsRow.className = 'cp-pills-row';

        group.members.forEach(m => {
            const pill = document.createElement('div');
            pill.className    = 'cp-member-pill' + (isBooked ? ' cp-member-pill--booked' : '');
            pill.dataset.id   = m.id;
            pill.dataset.role = roleCode;

            if (usedIds.has(m.id)) pill.classList.add('cp-member-pill--assigned');

            const nameParts = m.name.split(' ');
            const first     = nameParts[0] || '';
            const last      = nameParts.slice(1).join(' ');

            pill.innerHTML = `
                <div class="cp-member-avatar">${m.initials || m.name.slice(0,2).toUpperCase()}</div>
                <div class="cp-member-name">
                    ${first}
                    ${last ? `<br><span style="font-size:10px;opacity:.65">${last}</span>` : ''}
                </div>
                ${isBooked ? '<div class="cp-booked-badge">Booked</div>' : ''}`;

            if (!isBooked) {
                pill.addEventListener('click', () => _assignMemberToSlot(m, roleCode));
            } else {
                pill.title = 'Already booked on another event on the same date';
            }

            pillsRow.appendChild(pill);
        });

        section.appendChild(pillsRow);
        container.appendChild(section);
    });
}


// ── Assign a member to the active slot ───────────────────────────
function _assignMemberToSlot(member, memberRole) {
    if (!_cpActiveSlot) {
        showCrewToast('Please click a role slot (circle) first', 'warn');
        return;
    }

    // Block if member already used in another slot
    if (_usedMemberIds().has(member.id)) {
        showCrewToast(`${member.name.split(' ')[0]} is already assigned to another role`, 'warn');
        return;
    }

    if (memberRole !== _cpActiveSlot.role) {
        showCrewToast(`Assigning ${member.name.split(' ')[0]} (${memberRole}) → ${_cpActiveSlot.role} slot`, 'warn');
    }

    // KEY IS slot_id — so 2x TP slots each get their own entry
    _cpAssignments[_cpActiveSlot.slot_id] = {
        crew_member_id: member.id,
        name:           member.name,
        initials:       member.name.slice(0, 2).toUpperCase(),
        role:           _cpActiveSlot.role,
        slot_id:        _cpActiveSlot.slot_id,
    };

    _buildSlotCircles();

    // Re-apply active highlight after rebuild
    const circle = document.querySelector(`.cp-slot-circle[data-slot-id="${_cpActiveSlot.slot_id}"]`);
    if (circle) circle.classList.add('cp-slot-active');

    // Grey out this member everywhere
    document.querySelectorAll(`.cp-member-pill[data-id="${member.id}"]`).forEach(p => {
        p.classList.add('cp-member-pill--assigned');
    });

    // Auto-advance to next unfilled slot
    const unfilled = _cpData.role_slots.find(s => !_cpAssignments[s.slot_id]);
    if (unfilled) {
        setTimeout(() => _selectSlot(unfilled), 180);
    } else {
        const lbl = document.getElementById('cpActiveSlotLabel');
        if (lbl) { lbl.textContent = '✓ All roles assigned!'; lbl.style.color = '#16a34a'; }
    }
}


// ── Remove a slot assignment ──────────────────────────────────────
function removeSlotAssignment(slotId, e) {
    if (e) e.stopPropagation();

    const a = _cpAssignments[slotId];
    if (a) {
        document.querySelectorAll(`.cp-member-pill[data-id="${a.crew_member_id}"]`).forEach(p => {
            p.classList.remove('cp-member-pill--assigned');
        });
    }
    delete _cpAssignments[slotId];
    _buildSlotCircles();
}


// ── Switch available / booked tab ─────────────────────────────────
function switchCpTab(tab, btn) {
    document.querySelectorAll('.cp-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const avail  = document.getElementById('cpMembersAvailable');
    const booked = document.getElementById('cpMembersBooked');

    if (tab === 'available') {
        if (avail)  avail.style.display  = 'block';
        if (booked) booked.style.display = 'none';
    } else {
        if (avail)  avail.style.display  = 'none';
        if (booked) booked.style.display = 'block';
    }
}


// ── Save manual assignments ────────────────────────────────────────
function saveManualCrew() {
    const assignments = Object.entries(_cpAssignments).map(([slot_id, a]) => ({
        crew_member_id: a.crew_member_id,
        role_slot:      a.role,
        slot_id:        slot_id,
    }));

    if (assignments.length === 0) {
        showCrewToast('No assignments to save', 'warn');
        return;
    }

    fetch('/crew/save-manual/', {
        method: 'POST',
        headers: { 'X-CSRFToken': _csrf(), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            project_id:  _cpProjectId,
            assignments: JSON.stringify(assignments)
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const crewForCard = assignments.map(a => ({
                id:        a.crew_member_id,
                name:      _cpAssignments[a.slot_id]?.name || '',
                initials:  _cpAssignments[a.slot_id]?.initials || '',
                role_slot: a.role_slot,
                slot_id:   a.slot_id,
            }));
            _updateCardSlots(_cpProjectId, crewForCard);
            closeCrewPlanning();
            showCrewToast(`✓ ${assignments.length} crew members assigned and notified`, 'success');
        } else {
            showCrewToast(data.error || 'Save failed', 'error');
        }
    })
    .catch(() => showCrewToast('Network error', 'error'));
}

function closeCrewPlanning() {
    const overlay = document.getElementById('crewPlanningOverlay');
    overlay.querySelector('.cp-modal').classList.remove('cp-pop');
    setTimeout(() => { overlay.style.display = 'none'; }, 280);
    _cpActiveSlot = null;
    const lbl = document.getElementById('cpActiveSlotLabel');
    if (lbl) { lbl.style.display = 'none'; lbl.style.color = ''; }
}


// ================================================================
// UPDATE CARD SLOT CIRCLES ON THE SESSIONS PAGE
// ================================================================
function _updateCardSlots(projectId, crewList) {
    const container = document.getElementById(`crew-slots-${projectId}`);
    if (!container) return;

    // Build map: role_code → queue of members (for duplicate roles)
    const roleQueue = {};
    crewList.forEach(c => {
        const code = _normaliseRole(c.role_slot || c.role);
        if (!roleQueue[code]) roleQueue[code] = [];
        roleQueue[code].push(c);
    });

    const rolePointers = {};

    container.querySelectorAll('.crew-slot').forEach(slot => {
        const code   = _normaliseRole(slot.dataset.role);
        const idx    = rolePointers[code] || 0;
        const queue  = roleQueue[code] || [];
        const member = queue[idx];

        // Wrap in .crew-slot-wrap if not already wrapped
        if (!slot.parentElement.classList.contains('crew-slot-wrap')) {
            const wrap = document.createElement('div');
            wrap.className = 'crew-slot-wrap';
            slot.parentNode.insertBefore(wrap, slot);
            wrap.appendChild(slot);
        }
        const wrap = slot.parentElement;

        // Remove any existing tooltip
        const existing = wrap.querySelector('.slot-tooltip');
        if (existing) existing.remove();

        if (member) {
            slot.classList.remove('empty');
            slot.classList.add('filled');
            const initials  = member.initials || (member.name || '').slice(0,2).toUpperCase();
            const fullName  = member.name || '';
            const roleLabel = (typeof _roleLabel === 'function') ? _roleLabel(code) : code;
            slot.innerHTML  = `<span class="slot-avatar">${initials}</span>`;
            slot.title      = '';  // cleared — tooltip handles this now

            // Inject tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'slot-tooltip';
            tooltip.innerHTML = `
                <div class="slot-tooltip-name">${fullName}</div>
                <div class="slot-tooltip-role">${roleLabel}</div>`;
            wrap.appendChild(tooltip);

            rolePointers[code] = idx + 1;
        } else {
            // Empty slot tooltip showing role name
            const roleLabel = (typeof _roleLabel === 'function') ? _roleLabel(code) : code;
            const tooltip   = document.createElement('div');
            tooltip.className = 'slot-tooltip slot-tooltip--empty';
            tooltip.innerHTML = `<div class="slot-tooltip-name">${roleLabel}</div>`;
            wrap.appendChild(tooltip);
        }
    });

    const btn = document.querySelector(`.assign-crew-btn[data-project="${projectId}"]`);
    if (btn) btn.textContent = '✎ Edit Team';
}


// ================================================================
// ON PAGE LOAD — populate slot circles from existing DB assignments
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.crew-slots[data-project]').forEach(container => {
        const projectId = container.dataset.project;
        fetch(`/crew/project/${projectId}/`)
            .then(r => r.json())
            .then(data => {
                if (data.crew && data.crew.length > 0) {
                    _updateCardSlots(projectId, data.crew);
                }
            })
            .catch(() => {});
    });
});