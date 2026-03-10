function acceptNotification(id) {
  fetch("/team/notifications/accept/", {
    method: "POST",
    headers: {
      "X-CSRFToken": getCSRF(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ notification_id: id })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      removeRow(id);
      loadCalendar();        // 🔥 reload calendar
      loadNotificationCount();
      const yearSelect = document.getElementById("yearSelect");
  if (yearSelect) {
    loadProjectOverview(yearSelect.value);
  } // 🔥 reload badge
    }
  });
}
function loadNotificationCount() {
  fetch("/team/notifications/count/")
    .then(res => res.json())
    .then(d => {
      const badge = document.getElementById("notifBadge");
      if (!badge) return;

      if (d.count > 0) {
        badge.innerText = d.count;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    });
}
document.addEventListener("DOMContentLoaded", () => {
  loadNotificationCount();
});

function rejectNotification(id) {
  fetch("/team/notifications/reject/", {
    method: "POST",
    headers: {
      "X-CSRFToken": getCSRF(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ notification_id: id })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      removeRow(id);
      loadNotificationCount();
    }
  });
}

function removeRow(id) {
  const row = document.querySelector(`.notification-row[data-id="${id}"]`);
  if (row) row.remove();
}

function getCSRF() {
  const name = "csrftoken";
  let cookieValue = null;

  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();

      if (cookie.substring(0, name.length + 1) === (name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }

  return cookieValue;
}
fetch("/team/notifications/count/")
  .then(res => res.json())
  .then(d => {
    const badge = document.getElementById("notifBadge");
    if (d.count > 0) {
      badge.innerText = d.count;
      badge.style.display = "block";
    }
  });
  /* ================= CALENDAR ================= */

const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");

const eventCard = document.getElementById("eventCard");
const eventDate = document.getElementById("eventDate");
const eventTitle = document.getElementById("eventTitle");
const eventLocation = document.getElementById("eventLocation");
const eventTeam = document.getElementById("eventTeam");

let current = new Date();
let eventsMap = {};

/* LOAD EVENTS */
function loadCalendar() {
  fetch("/team/calendar/")
    .then(res => res.json())
    .then(data => {
      eventsMap = {};
      data.events.forEach(e => {
        eventsMap[e.date] = e;
      });
      renderCalendar();
    });
}
document.addEventListener("DOMContentLoaded", () => {
  loadCalendar();
});

/* RENDER CALENDAR */
function renderCalendar() {
  calendarGrid.innerHTML = "";

  const year = current.getFullYear();
  const month = current.getMonth();

  calendarTitle.innerText =
    current.toLocaleString("default", { month: "long" }) +
    " – " + year;

  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarGrid.appendChild(document.createElement("span"));
  }

  for (let d = 1; d <= days; d++) {
    const dateStr =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const cell = document.createElement("span");
    cell.innerText = d;

if (eventsMap[dateStr]) {
  const event = eventsMap[dateStr];

  if (event.status === "PENDING") {
    cell.classList.add("has-event");
  }

  if (event.status === "ACCEPTED") {
    cell.classList.add("accepted-event");
  }

  cell.addEventListener("click", () => showEvent(dateStr, cell));
}

    calendarGrid.appendChild(cell);
  }
}

/* SHOW EVENT */
function showEvent(dateStr, cell) {
  document
    .querySelectorAll(".calendar-grid span")
    .forEach(s => s.classList.remove("active"));

  cell.classList.add("active");

  const e = eventsMap[dateStr];

  eventCard.style.display = "block";
  eventDate.innerText = new Date(dateStr).toDateString();
  eventTitle.innerText = `${e.title}, ${e.event_type}`;
  eventLocation.innerText = e.location;

eventTeam.innerHTML = "";

e.team.forEach(member => {
  const span = document.createElement("span");

  const initials = member.name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  span.innerText = initials;
  eventTeam.appendChild(span);
});
}

/* NAV */
document.getElementById("prevMonth").onclick = () => {
  current.setMonth(current.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  current.setMonth(current.getMonth() + 1);
  renderCalendar();
};

const ctx = document.getElementById("projectChart");
const currentDate = new Date();
const currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();

let projectChart;

function loadProjectOverview(year) {
    const selectedYear = parseInt(year); 
  fetch(`/team/project-overview/?year=${year}`)
    .then(res => res.json())
    .then(data => {

      if (projectChart) projectChart.destroy();
      ctx.style.opacity = 0;
ctx.style.transform = "translateY(20px)";

setTimeout(() => {
  ctx.style.transition = "all .6s ease";
  ctx.style.opacity = 1;
  ctx.style.transform = "translateY(0)";
}, 200);

      projectChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: [
      "JAN","FEB","MAR","APR","MAY","JUN",
      "JUL","AUG","SEP","OCT","NOV","DEC"
    ],
    datasets: [
      {
        // Bottom soft pink layer
        data: data.counts,
        backgroundColor: data.counts.map((v,i)=>
  (selectedYear === currentYear && i === currentMonth)
    ? "#7f1414"   // darker maroon
    : "#eadede"
),
        borderRadius: {
          topLeft: 8,
          topRight: 8
        },
        borderSkipped: false,
        barThickness: 38
      },
      {
        // Soft grey top layer (visual effect)
        data: data.counts.map(v => v * 0.6),
        backgroundColor: "#d9d9d9",
        borderRadius: {
          topLeft: 8,
          topRight: 8
        },
        borderSkipped: false,
        barThickness: 38
      }
    ]
  },

  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1800,
      easing: "easeOutQuart"
    },

    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#111",
        padding: 10,
        cornerRadius: 6
      }
    },

    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          font: {
            size: 14,
            weight: "600"
          }
        }
      },

      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: "rgba(0,0,0,0.05)"
        },
        ticks: {
          font: {
            size: 13
          }
        }
      }
    }
  }
});
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const yearSelect = document.getElementById("yearSelect");
  loadProjectOverview(yearSelect.value);

  yearSelect.addEventListener("change", () => {
    loadProjectOverview(yearSelect.value);
  });
});

function generateMiniBars() {
  document.querySelectorAll(".mini-bars").forEach(container => {
    container.innerHTML = "";

    for (let i = 0; i < 18; i++) {
      const bar = document.createElement("div");

      const height = Math.floor(Math.random() * 35) + 5;
      bar.style.setProperty("--h", height + "px");

      container.appendChild(bar);
    }
  });
}

document.addEventListener("DOMContentLoaded", generateMiniBars);

function goToProjects() {
  window.location.href = "/team/projects/";
}