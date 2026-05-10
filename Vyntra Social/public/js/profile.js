(function () {
  function profileCard(profile) {
    const isOwner = profile.viewer?.isOwner;
    const isFollowing = profile.viewer?.isFollowing;
    const bio = profile.bio || 'No bio yet.';

    return `
      <section class="profile-card">
        <img class="profile-cover" src="${profile.cover_image_url || window.Vyntra.defaultCover}" alt="${window.Vyntra.escapeHtml(profile.full_name)} Vyntra Social profile banner for online community platform" width="1200" height="500" loading="eager" decoding="async">
        <img class="profile-avatar" src="${profile.profile_image_url || window.Vyntra.defaultAvatar}" alt="${window.Vyntra.escapeHtml(profile.full_name)} Vyntra Social user profile avatar" width="112" height="112">
        <div class="profile-details">
          <h1 class="page-title">${window.Vyntra.escapeHtml(profile.full_name)}</h1>
          <p class="author-username mb-0">@${window.Vyntra.escapeHtml(profile.username)}</p>
          <p class="profile-bio">${window.Vyntra.escapeHtml(bio)}</p>
          <div class="profile-stats">
            <button class="btn btn-ghost p-0 text-start" type="button" onclick="loadFollowList('${profile.id}', 'followers')">
              <span class="stat-number" data-followers-count data-user-id="${profile.id}">${profile.counts?.followers || 0}</span>
              <span class="caption">Followers</span>
            </button>
            <button class="btn btn-ghost p-0 text-start" type="button" onclick="loadFollowList('${profile.id}', 'following')">
              <span class="stat-number">${profile.counts?.following || 0}</span>
              <span class="caption">Following</span>
            </button>
            <div>
              <span class="stat-number">${profile.counts?.posts || 0}</span>
              <span class="caption">Posts</span>
            </div>
          </div>
          <div class="profile-actions">
            ${
              isOwner
                ? `<a class="btn btn-vyntra d-inline-flex align-items-center gap-2" href="/settings"><i data-lucide="settings"></i>Edit Profile</a>
                   <a class="btn btn-outline-vyntra d-inline-flex align-items-center gap-2" href="/create"><i data-lucide="square-pen"></i>Create Post</a>`
                : `<button class="btn ${isFollowing ? 'btn-outline-vyntra' : 'btn-vyntra'} d-inline-flex align-items-center gap-2"
                    type="button"
                    data-follow-button
                    data-user-id="${profile.id}"
                    data-following="${isFollowing ? 'true' : 'false'}"
                    onclick="toggleFollow('${profile.id}')">
                    <i data-lucide="${isFollowing ? 'user-minus' : 'user-plus'}"></i><span>${isFollowing ? 'Unfollow' : 'Follow'}</span>
                  </button>`
            }
          </div>
        </div>
      </section>`;
  }

  function updateProfileSeo(profile) {
    const profileUrl = `https://vyntra-socila.vercel.app${window.Vyntra.profilePath(profile)}`;
    const description = `${profile.full_name} is on Vyntra Social. Follow this profile, explore public posts, and connect with people online.`;
    document.title = `${profile.full_name} | Vyntra Social`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', profileUrl);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${profile.full_name} | Vyntra Social`);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', profileUrl);
    if (profile.profile_image_url) {
      document.querySelector('meta[property="og:image"]')?.setAttribute('content', profile.profile_image_url);
    }
    document
      .querySelector('meta[name="robots"]')
      ?.setAttribute('content', profile.bio || Number(profile.counts?.posts || 0) > 0 ? 'index, follow' : 'noindex, follow');
  }

  window.loadProfile = async function loadProfile(userId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId || '');
    const endpoint = userId
      ? isUuid
        ? `/api/profiles/${encodeURIComponent(userId)}`
        : `/api/profiles/username/${encodeURIComponent(userId)}`
      : '/api/auth/session';
    const payload = await window.Vyntra.apiFetch(endpoint);
    return payload.profile;
  };

  function profileLookupFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('id');
    if (queryId) return queryId;

    const [, page, username] = window.location.pathname.split('/');
    return page === 'profile' ? decodeURIComponent(username || '') : '';
  }

  window.loadFollowList = async function loadFollowList(userId, type) {
    const mount = document.getElementById('relationshipList');
    if (!mount) return;

    mount.innerHTML = '<div class="post-card"><div class="loader-line mb-2"></div><div class="loader-line w-75"></div></div>';
    try {
      const payload = await window.Vyntra.apiFetch(`/api/users/${encodeURIComponent(userId)}/${type}`);
      const profiles = payload.profiles || [];
      mount.innerHTML = `
        <section class="post-card">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h2 class="section-title">${type === 'followers' ? 'Followers' : 'Following'}</h2>
            <button class="btn btn-sm btn-ghost" type="button" onclick="document.getElementById('relationshipList').innerHTML=''"><i data-lucide="x"></i>Close</button>
          </div>
          ${
            profiles.length
              ? profiles
                  .map(
                    (profile) => `
                      <a class="suggested-user" href="${window.Vyntra.profilePath(profile)}">
                        <img class="avatar avatar-sm" src="${profile.profile_image_url || window.Vyntra.defaultAvatar}" alt="${window.Vyntra.escapeHtml(profile.full_name)} Vyntra Social user profile avatar" width="36" height="36">
                        <span class="min-w-0">
                          <strong class="d-block text-truncate">${window.Vyntra.escapeHtml(profile.full_name)}</strong>
                          <span class="caption">@${window.Vyntra.escapeHtml(profile.username)}</span>
                        </span>
                      </a>`
                  )
                  .join('')
              : `<p class="muted-text mb-0">${type === 'followers' ? 'User has no followers yet.' : 'User is not following anyone yet.'}</p>`
          }
        </section>`;
    } catch (error) {
      mount.innerHTML = `<div class="empty-state"><p class="muted-text mb-0">${window.Vyntra.escapeHtml(error.message)}</p></div>`;
    }
    window.Vyntra.renderIcons();
  };

  window.updateProfile = async function updateProfile(profileData) {
    return window.Vyntra.apiFetch(`/api/profiles/${encodeURIComponent(window.Vyntra.currentUser.id)}`, {
      method: 'PUT',
      body: profileData
    });
  };

  window.uploadProfileImage = async function uploadProfileImage(file) {
    const formData = new FormData();
    formData.append('profile_image', file);
    return window.Vyntra.apiFetch(`/api/profiles/${encodeURIComponent(window.Vyntra.currentUser.id)}/profile-image`, {
      method: 'POST',
      body: formData
    });
  };

  window.uploadCoverImage = async function uploadCoverImage(file) {
    const formData = new FormData();
    formData.append('cover_image', file);
    return window.Vyntra.apiFetch(`/api/profiles/${encodeURIComponent(window.Vyntra.currentUser.id)}/cover-image`, {
      method: 'POST',
      body: formData
    });
  };

  function validateImage(file, maxMb, label) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error(`${label} must be JPG, PNG, or WEBP.`);
    }
    if (file.size > maxMb * 1024 * 1024) throw new Error(`${label} must be ${maxMb} MB or smaller.`);
  }

  function previewSelectedImage(input, imageId) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById(imageId).src = URL.createObjectURL(file);
  }

  async function initProfilePage() {
    if (document.body.dataset.page !== 'profile') return;
    await window.Vyntra.ready;
    const session = await window.Vyntra.getSession();

    const requestedId = profileLookupFromUrl();
    const mount = document.getElementById('profileMount');

    if (!requestedId && !session) {
      mount.innerHTML = `
        <div class="empty-state">
          <i data-lucide="user-round"></i>
          <h1 class="h4 mt-3">Login to view your profile</h1>
          <p class="muted-text mb-3">Public profiles open from posts and search. Your own profile needs a session.</p>
          <a class="btn btn-vyntra d-inline-flex align-items-center gap-2" href="${window.Vyntra.loginUrl('profile', '/profile')}"><i data-lucide="log-in"></i>Login</a>
        </div>`;
      window.Vyntra.renderIcons();
      return;
    }

    const userId = requestedId || window.Vyntra.currentUser?.id || session.user.id;

    try {
      const profile = await window.loadProfile(userId);
      updateProfileSeo(profile);
      mount.innerHTML = profileCard(profile);
      await window.loadUserPosts(profile.id);
      if (window.location.hash === '#followers') window.loadFollowList(profile.id, 'followers');
      if (window.location.hash === '#following') window.loadFollowList(profile.id, 'following');
    } catch (error) {
      mount.innerHTML = `<div class="empty-state"><i data-lucide="user-x"></i><h1 class="h4 mt-3">Profile unavailable</h1><p class="muted-text mb-0">${window.Vyntra.escapeHtml(error.message)}</p></div>`;
    }
    window.Vyntra.renderIcons();
  }

  async function initEditProfilePage() {
    const form = document.getElementById('editProfileForm');
    if (!form) return;

    await window.Vyntra.ready;
    const current = await window.getCurrentUser();
    if (!current) return;
    const profile = current.profile;

    form.full_name.value = profile.full_name || '';
    form.username.value = profile.username || '';
    form.bio.value = profile.bio || '';
    document.getElementById('editProfileAvatar').src = profile.profile_image_url || window.Vyntra.defaultAvatar;
    document.getElementById('editProfileCover').src = profile.cover_image_url || window.Vyntra.defaultCover;

    form.profile_image.addEventListener('change', () => previewSelectedImage(form.profile_image, 'editProfileAvatar'));
    form.cover_image.addEventListener('change', () => previewSelectedImage(form.cover_image, 'editProfileCover'));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      const profileImage = form.profile_image.files[0];
      const coverImage = form.cover_image.files[0];

      try {
        validateImage(profileImage, 2, 'Profile image');
        validateImage(coverImage, 5, 'Cover image');

        window.Vyntra.setButtonLoading(button, true, 'Saving');
        const updatePayload = await window.updateProfile({
          full_name: form.full_name.value,
          username: form.username.value,
          bio: form.bio.value
        });
        if (profileImage) await window.uploadProfileImage(profileImage);
        if (coverImage) await window.uploadCoverImage(coverImage);
        if (updatePayload?.profile) window.Vyntra.currentProfile = updatePayload.profile;

        window.Vyntra.showToast('Profile updated successfully');
        window.location.href = window.Vyntra.profilePath(window.Vyntra.currentProfile);
      } catch (error) {
        window.Vyntra.showToast(error.message, 'danger');
      } finally {
        window.Vyntra.setButtonLoading(button, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initProfilePage();
    initEditProfilePage();
  });
})();
