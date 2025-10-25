document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Safe-escape helper to avoid injecting raw HTML from server data
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML
        let participantsHtml = "";
        if (!details.participants || details.participants.length === 0) {
          participantsHtml = '<p class="no-participants">No participants yet</p>';
        } else {
          participantsHtml = '<ul class="participants-list">';
          participantsHtml += details.participants
            .map(p => `
              <li class="participant-item">
                <span class="participant-email">${escapeHtml(p)}</span>
                <button class="unregister-btn" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" aria-label="Unregister ${escapeHtml(p)}">&times;</button>
              </li>`)
            .join("");
          participantsHtml += "</ul>";
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Event delegation for unregister buttons
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest && e.target.closest('.unregister-btn');
    if (!btn) return;

    const activity = btn.getAttribute('data-activity');
    const email = btn.getAttribute('data-email');

    if (!activity || !email) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, { method: 'POST' });
      const data = await resp.json();
      const messageDiv = document.getElementById("message");

      if (resp.ok) {
        messageDiv.textContent = data.message;
        messageDiv.className = 'success';
      } else {
        messageDiv.textContent = data.detail || 'Failed to unregister';
        messageDiv.className = 'error';
      }

      messageDiv.classList.remove('hidden');
      setTimeout(() => messageDiv.classList.add('hidden'), 5000);

      // Refresh the activities list to reflect change
      fetchActivities();
    } catch (err) {
      console.error('Error unregistering:', err);
      const messageDiv = document.getElementById("message");
      messageDiv.textContent = 'Failed to unregister. Please try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
    }
  });
});
