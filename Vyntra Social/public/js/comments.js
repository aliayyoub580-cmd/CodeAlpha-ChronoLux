(function () {
  function commentMarkup(comment) {
    const author = comment.author || { full_name: 'Vyntra User', username: 'unknown' };
    const canDelete = window.Vyntra.currentUser?.id === comment.user_id;

    return `
      <div class="comment" data-comment-id="${comment.id}">
        <img class="avatar avatar-sm" src="${author.profile_image_url || window.Vyntra.defaultAvatar}" alt="${window.Vyntra.escapeHtml(author.full_name)} Vyntra Social user profile avatar" width="36" height="36">
        <div class="comment-body">
          <div class="d-flex justify-content-between gap-2">
            <div>
              <strong>${window.Vyntra.escapeHtml(author.full_name)}</strong>
              <span class="caption">@${window.Vyntra.escapeHtml(author.username)} &middot; ${window.Vyntra.formatDate(comment.created_at)}</span>
            </div>
            ${
              canDelete
                ? `<button class="btn btn-sm btn-ghost" type="button" onclick="deleteComment('${comment.id}')" aria-label="Delete comment"><i data-lucide="trash-2"></i></button>`
                : ''
            }
          </div>
          <p class="comment-text">${window.Vyntra.escapeHtml(comment.comment_text)}</p>
        </div>
      </div>`;
  }

  window.renderComments = function renderComments(postId, comments) {
    const mount = document.querySelector(`[data-comments-list="${postId}"]`);
    if (!mount) return;

    mount.innerHTML = comments.length
      ? comments.map(commentMarkup).join('')
      : '<p class="caption mb-0">No comments exist yet.</p>';
    window.Vyntra.renderIcons();
  };

  window.loadComments = async function loadComments(postId) {
    const mount = document.querySelector(`[data-comments-list="${postId}"]`);
    if (mount) mount.innerHTML = '<div class="loader-line mb-2"></div><div class="loader-line w-75"></div>';

    const payload = await window.Vyntra.apiFetch(`/api/posts/${encodeURIComponent(postId)}/comments`);
    window.renderComments(postId, payload.comments || []);
    return payload.comments || [];
  };

  window.toggleComments = async function toggleComments(postId) {
    if (!(await window.Vyntra.requireAuth('comment'))) return;

    const panel = document.querySelector(`[data-comments-panel="${postId}"]`);
    if (!panel) return;

    const shouldOpen = panel.classList.contains('d-none');
    panel.classList.toggle('d-none', !shouldOpen);
    if (shouldOpen) {
      try {
        await window.loadComments(postId);
      } catch (error) {
        window.Vyntra.showToast(error.message, 'danger');
      }
    }
  };

  window.addComment = async function addComment(event, postId) {
    event.preventDefault();
    if (!(await window.Vyntra.requireAuth('comment'))) return;

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const input = form.comment_text;
    const text = input.value.trim();
    if (!text) {
      window.Vyntra.showToast('Comment text is required.', 'warning');
      return;
    }

    try {
      window.Vyntra.setButtonLoading(button, true, '');
      const payload = await window.Vyntra.apiFetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        body: { comment_text: text }
      });
      input.value = '';
      await window.loadComments(postId);
      document.querySelectorAll(`[data-comment-button][data-post-id="${postId}"] [data-comment-count]`).forEach((node) => {
        node.textContent = payload.count;
      });
      window.Vyntra.showToast(payload.message || 'Comment added');
    } catch (error) {
      window.Vyntra.showToast(error.message, 'danger');
    } finally {
      window.Vyntra.setButtonLoading(button, false);
    }
  };

  window.deleteComment = async function deleteComment(commentId) {
    if (!(await window.Vyntra.requireAuth('comment'))) return;

    try {
      const payload = await window.Vyntra.apiFetch(`/api/comments/${encodeURIComponent(commentId)}`, {
        method: 'DELETE'
      });
      await window.loadComments(payload.postId);
      document.querySelectorAll(`[data-comment-button][data-post-id="${payload.postId}"] [data-comment-count]`).forEach((node) => {
        node.textContent = payload.count;
      });
      window.Vyntra.showToast(payload.message || 'Comment deleted');
    } catch (error) {
      window.Vyntra.showToast(error.message, 'danger');
    }
  };
})();
