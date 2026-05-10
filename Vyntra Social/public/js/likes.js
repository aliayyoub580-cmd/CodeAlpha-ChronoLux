(function () {
  function updateLikeButtons(postId, liked, count) {
    document.querySelectorAll(`[data-like-button][data-post-id="${postId}"]`).forEach((button) => {
      button.dataset.liked = liked ? 'true' : 'false';
      button.classList.toggle('active', liked);
      button.setAttribute('aria-label', liked ? 'Unlike' : 'Like');
      const countNode = button.querySelector('[data-like-count]');
      if (countNode) countNode.textContent = count;
      const label = button.querySelector('.action-label');
      if (label) label.textContent = liked ? 'Unlike' : 'Like';
    });
    window.Vyntra.renderIcons();
  }

  window.toggleLike = async function toggleLike(postId) {
    if (!(await window.Vyntra.requireAuth('like'))) return;

    const button = document.querySelector(`[data-like-button][data-post-id="${postId}"]`);
    const liked = button?.dataset.liked === 'true';

    try {
      const payload = await window.Vyntra.apiFetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
        method: liked ? 'DELETE' : 'POST'
      });
      updateLikeButtons(postId, payload.liked, payload.count);
      window.Vyntra.showToast(payload.message || (payload.liked ? 'Post liked' : 'Post unliked'));
    } catch (error) {
      window.Vyntra.showToast(error.message, 'danger');
    }
  };

  window.toggleRepost = async function toggleRepost(postId) {
    if (!(await window.Vyntra.requireAuth('repost'))) return;

    const button = document.querySelector(`[data-repost-button][data-post-id="${postId}"]`);
    const reposted = button?.dataset.reposted === 'true';

    try {
      const payload = await window.Vyntra.apiFetch(`/api/posts/${encodeURIComponent(postId)}/repost`, {
        method: reposted ? 'DELETE' : 'POST'
      });

      document.querySelectorAll(`[data-repost-button][data-post-id="${postId}"]`).forEach((node) => {
        node.dataset.reposted = payload.reposted ? 'true' : 'false';
        node.classList.toggle('active', payload.reposted);
        const countNode = node.querySelector('[data-repost-count]');
        if (countNode) countNode.textContent = payload.count;
        const label = node.querySelector('.action-label');
        if (label) label.textContent = payload.reposted ? 'Remove' : 'Repost';
      });

      window.Vyntra.showToast(payload.message || 'Repost updated');
    } catch (error) {
      window.Vyntra.showToast(error.message, 'danger');
    }
  };

  window.sharePost = async function sharePost(postId) {
    if (!(await window.Vyntra.requireAuth('share'))) return;

    const post = window.allPosts?.find((item) => item.id === postId);
    const url = `${window.location.origin}${window.Vyntra.postPath(post || { id: postId })}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Vyntra Social post', url });
      } else {
        await window.Vyntra.copyText(url);
      }

      const payload = await window.Vyntra.apiFetch(`/api/posts/${encodeURIComponent(postId)}/share`, {
        method: 'POST'
      });

      document.querySelectorAll(`[data-share-button][data-post-id="${postId}"] [data-share-count]`).forEach((node) => {
        node.textContent = payload.count;
      });
      window.Vyntra.showToast(payload.message || 'Post link copied');
    } catch (error) {
      if (error.name !== 'AbortError') window.Vyntra.showToast(error.message, 'danger');
    }
  };
})();
