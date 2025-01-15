function updatePostLike(btn, likeStatus, likesCount) {
  let icon = btn.getElementsByClassName("fa-heart")[0];
  let count = btn.getElementsByClassName("like-count")[0];
  let iconClasses = [];
  if (likesCount) {
    iconClasses.push("fa-solid");
  } else {
    iconClasses.push("fa-regular");
  }
  iconClasses.push("fa-heart");
  if (likeStatus === "liked") {
    iconClasses.push("text-red-500");
  }
  icon.className = iconClasses.join(" ");
  count.innerText = likesCount;
}

function handleLikeSubmit(btn, postId) {
  try {
    fetch(`/posts/${postId}/like`, { method: "POST" })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.success) {
          updatePostLike(btn, data.likeStatus, data.post.likes.length);
        }
        setTimeout(function () {
          alert(data.message);
        }, 100);
      })
      .catch((err) => {
        console.log("Error like", err);
      });
  } catch (ex) {}
}

function handleNotifications(notification, htmlStr) {
  console.log("notifications", notification, htmlStr);
  const wrapper = document.createElement("div");
  wrapper.innerHTML = htmlStr;
  const notifyRootEl = document.getElementById("owner-notifications");
  if (notifyRootEl) {
    notifyRootEl.insertBefore(
      wrapper.firstElementChild,
      notifyRootEl.firstElementChild
    );
    if (notifyRootEl.getElementsByClassName("notify-itm-empty").length) {
      notifyRootEl.getElementsByClassName("notify-itm-empty")[0].remove();
    }
  }
  const alertEl = document.getElementById("bell-alerts");
  if (alertEl.classList.contains("hidden")) {
    alertEl.classList.toggle("hidden");
    alertEl.innerHTML = "1";
  } else {
    let alertCount = parseInt(alertEl.innerText, 10) + 1;
    alertEl.innerHTML = alertCount;
  }
}

function handleActionUpdates(notification) {
  const [type, action] = notification.type.split(":");
  let likeStatus = "";
  if (type === "post") {
    const el =
      document.getElementsByClassName(
        `post-lu-${notification.data.postId}`
      )[0] || null;
    // if already likes then its red so keep red
    let icon = el.getElementsByClassName("fa-heart")[0];
    if (Array.from(icon.classList).includes("text-red-500")) {
      likeStatus = "liked";
    }
    updatePostLike(el, likeStatus, notification.data.likesCount);
  } else if (type === "comment") {
    if (action === "added") {
      addNewCommentToPostComments(notification);
    } else if (["liked", "unliked"].includes(action)) {
      const el =
        document.getElementsByClassName(
          `cmts-${notification.data.commentId}`
        )[0] || null;
      // if already likes then its red so keep red
      let icon = el.getElementsByClassName("fa-heart")[0];
      if (Array.from(icon.classList).includes("text-red-500")) {
        likeStatus = "liked";
      }
      updatePostLike(el, likeStatus, notification.data.likesCount);
    }
  }
}

function toggleComments(evt, postId) {
  evt.preventDefault();
  const el = document.getElementsByClassName(`post-cmts-${postId}`);
  if (el.length) {
    let classList = Array.from(el[0].classList);
    if (classList.includes("hidden")) {
      classList = classList.filter((item) => item !== "hidden");
    } else {
      classList.push("hidden");
    }
    el[0].className = classList.join(" ");
  }
}

function addNewCommentToPostComments(data) {
  // update post comment count
  const countEl = document.getElementsByClassName(
    `cmts-count-${data.comment.postId}`
  );
  if (countEl.length) {
    countEl[0].innerText = data.commentsCount;
  }
  // add comment to comments list
  let cmtsWrapper = document.getElementsByClassName(
    `post-cmts-${data.comment.postId}`
  );
  if (cmtsWrapper.length) {
    cmtsWrapper = cmtsWrapper[0];
    const wrapper = document.createElement("div");
    wrapper.innerHTML = data.commentHtml;
    cmtsWrapper.insertBefore(
      wrapper.firstElementChild,
      cmtsWrapper.firstElementChild
    );
    if (cmtsWrapper.getElementsByClassName("cmts-empty").length) {
      cmtsWrapper.getElementsByClassName("cmts-empty")[0].remove();
    }
  }
}

function handleCommentSubmit(frm) {
  try {
    const el = frm.elements["comments"];
    const frmData = new FormData();
    frmData.append("comments", el.value);
    fetch(frm.action, {
      method: frm.method,
      body: JSON.stringify({ comments: el.value }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.success) {
          console.log("Comment added", data);
          // addNewCommentToPostComments(data);
          el.value = "";
        }
        setTimeout(function () {
          alert(data.message);
        }, 100);
      })
      .catch((err) => {
        console.log("Error comment submit", err);
      });
  } catch (ex) {
    console.log("Error handle comment submit", ex);
  }
  return false;
}

function updateCommentLike(btn, likeStatus, likesCount) {
  let icon = btn.getElementsByClassName("fa-heart")[0];
  let count = btn.getElementsByClassName("like-count")[0];
  let iconClasses = [];
  if (likesCount) {
    iconClasses.push("fa-solid");
  } else {
    iconClasses.push("fa-regular");
  }
  iconClasses.push("fa-heart");
  if (likeStatus === "liked") {
    iconClasses.push("text-red-500");
  }
  icon.className = iconClasses.join(" ");
  count.innerText = likesCount;
}

function handleCommentLikeSubmit(btn, commentId) {
  try {
    fetch(`/comments/${commentId}/like`, { method: "POST" })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.success) {
          updateCommentLike(btn, data.likeStatus, data.comment.likes.length);
        }
        setTimeout(function () {
          alert(data.message);
        }, 100);
      })
      .catch((err) => {
        console.log("Error comment like", err);
      });
  } catch (ex) {}
}

function attachDocumentClickEvent(dataId) {
  return function (event) {
    const isClickInside = document
      .getElementById(`dropdownMenu-${dataId}`)
      .contains(event.target);
    const isButtonClick = document
      .getElementById(`dropdownButton-${dataId}`)
      .contains(event.target);
    if (!isClickInside && !isButtonClick) {
      toggleDropDownMenu(dataId);
    }
  };
}

const __dpDockListeners = {};

function toggleDropDownMenu(dataId) {
  const btnEl = document.getElementById("dropdownButton-" + dataId);
  const dropdownMenu = document.getElementById("dropdownMenu-" + dataId);
  // offsetLeft
  // offsetTop = +16
  dropdownMenu.classList.toggle("hidden");
  // is:open
  __dpDockListeners[dataId] =
    __dpDockListeners[dataId] || attachDocumentClickEvent(dataId);
  document.removeEventListener("click", __dpDockListeners[dataId]);
  if (!dropdownMenu.classList.contains("hidden")) {
    document.addEventListener("click", __dpDockListeners[dataId]);
    dropdownMenu.style.left = btnEl.offsetLeft + "px";
    dropdownMenu.style.top = btnEl.offsetTop + 16 + "px";
  } else {
    __dpDockListeners[dataId] = null;
  }
}

function handleRemoveFriend(friendId) {
  // /remove-friend
  if (
    confirm("Are you sure you want to remove a friend from your friend list")
  ) {
    try {
      fetch(`/remove-friend/${friendId}`, { method: "POST" })
        .then((resp) => resp.json())
        .then((data) => {
          if (data.success) {
            document.getElementById("ur-friend-" + friendId).remove();
          }
          setTimeout(function () {
            alert(data.message);
          }, 100);
        })
        .catch((err) => {
          console.log("Error while removing friend", err);
        });
    } catch (ex) {}
  }
}

function handleSendFriendReq(suggestionId) {
  try {
    fetch(`/friend-request/${suggestionId}`, { method: "POST" })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.success) {
          document
            .getElementById("add-friend-btn-" + suggestionId)
            .classList.toggle("hidden");
          document
            .getElementById("add-friend-btn-sent-" + suggestionId)
            .classList.toggle("hidden");
        }
        setTimeout(function () {
          alert(data.message);
        }, 100);
      })
      .catch((err) => {
        console.log("Error while sending friend request", err);
      });
  } catch (ex) {}
}

function handleFriendRequest(type, requestId) {
  try {
    fetch(`/${type}-friend/${requestId}`, { method: "POST" })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.success) {
          const ul = document.getElementById(
            "friend-req-" + requestId
          ).parentElement;
          document.getElementById("friend-req-" + requestId).remove();
          if (ul.children.length === 0) {
            const li = document.createElement("li");
            li.innerHTML = "No friend requests!";
            li.className = "text-gray-600 empty-friend-requests";
            ul.append(li);
          }
        }
        setTimeout(function () {
          alert(data.message);
        }, 100);
      })
      .catch((err) => {
        console.log("Error while handling friend request " + type, err);
      });
  } catch (ex) {}
}

function handleMarkReadNotifications(type, id) {
  try {
    fetch(`/notifications/mark-read`, {
      method: "POST",
      body: JSON.stringify({ type: type, notificationId: id || 0 }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.success) {
          if (type == "all") {
            Array.from(document.getElementsByClassName("notify-itm")).forEach(
              (item) => item.remove()
            );
          } else {
            document.getElementById("notify-itm-" + id).remove();
          }
          const notifyWrapper = document.getElementById("owner-notifications");
          if (notifyWrapper.children.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.innerHTML =
              '<div class="ml-4"><p class="text-gray-700">Notification not found!</p></div>';
            emptyEl.className =
              "flex items-center bg-white p-4 rounded-lg shadow notify-itm-empty";
            notifyWrapper.append(emptyEl);
            document.getElementById("bell-alerts").classList.toggle("hidden");
          } else {
            document.getElementById("bell-alerts").innerHTML =
              notifyWrapper.children.length;
          }
        }
        setTimeout(function () {
          alert(data.message);
        }, 100);
      })
      .catch((err) => {
        console.log("Error while handling friend request " + type, err);
      });
  } catch (ex) {}
}
