(function () {
  function updateFollowButtons(userId, following) {
    document.querySelectorAll(`[data-follow-button][data-user-id="${userId}"]`).forEach((button) => {
      button.dataset.following = following ? 'true' : 'false';
      button.classList.toggle('btn-vyntra', !following);
      button.classList.toggle('btn-outline-vyntra', following);
      button.innerHTML = `<i data-lucide="${following ? 'user-minus' : 'user-plus'}"></i><span>${following ? 'Unfollow' : 'Follow'}</span>`;
    });
    window.Vyntra.renderIcons();
  }

  window.toggleFollow = async function toggleFollow(userId) {
    if (!(await window.Vyntra.requireAuth('follow'))) return;

    const button = document.querySelector(`[data-follow-button][data-user-id="${userId}"]`);
    const following = button?.dataset.following === 'true';

    try {
      const payload = await window.Vyntra.apiFetch(`/api/users/${encodeURIComponent(userId)}/follow`, {
        method: following ? 'DELETE' : 'POST'
      });

      updateFollowButtons(userId, payload.following);
      document.querySelectorAll(`[data-followers-count][data-user-id="${userId}"]`).forEach((node) => {
        node.textContent = payload.count;
      });
      window.Vyntra.showToast(payload.message || (payload.following ? 'User followed' : 'User unfollowed'));
    } catch (error) {
      window.Vyntra.showToast(error.message, 'danger');
    }
  };
})();
