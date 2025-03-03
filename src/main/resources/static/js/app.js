"use strict";

const App = (() => {
  const BASE_URL = "http://" + window.location.host

  class Api {
    get(path) {
      return axios.get(BASE_URL + path)
    }

    post(path, data) {
      return axios.post(BASE_URL + path, data)
    }

    put(path, data) {
      return axios.post(BASE_URL + path, data)
    }

    delete(path) {
      return axios.delete(BASE_URL + path)
    }
  }

  class Service {
    constructor(api) {
      Service.prototype.api = api
      Service.prototype.editBackup = {}
    }

    isEnterKey(e) {
      const ENTER = 13

      return e.keyCode === ENTER || e.which === ENTER || e.key === ENTER
    }

    formatDate(dateString) {
      const MINUTE = 1000 * 60
      const HOUR = 60 * MINUTE
      const DAY = 24 * HOUR
      const WEEK = 7 * DAY

      dateString = dateString + "Z"
      const date = new Date(dateString)
      const difference = (new Date()).getTime() - date.getTime()
      if (difference < 10 * MINUTE) {
        return "방금 전"
      }
      if (difference < HOUR) {
        return Math.floor(difference / MINUTE) + "분 전"
      }
      if (difference < DAY) {
        return Math.floor(difference / HOUR) + "시간 전"
      }
      if (difference < WEEK) {
        return Math.floor(difference / DAY) + "일 전"
      }
      return date.format("yyyy-MM-dd hh:mm")
    }
  }

  class UserService extends Service {
    async edit() {
      const introduction = document.getElementById('edit-introduction').value
      const name = document.getElementById('edit-name').value
      const password = document.getElementById('edit-password').value
      const check_password = document.getElementById('edit-password-confirm').value
      if (password !== check_password) {
        alert("패스워드를 다시 확인해 주세요.")
        exit()
      }

      try {
        const req = new FormData()
        const files = document.getElementById("profile-attachment").files;
        const uri = document.getElementsByClassName('user-profile')[0].firstElementChild.getAttribute('href')
        if (files.length > 0) {
          req.append("profileImage", files[0])
        }
        req.append("introduction", introduction.trim())
        req.append("name", name.trim())
        if (password.length > 0) {
          req.append("password", password)
        }
        const userInfo = (await axios.put(BASE_URL + "/api" + uri, req)).data
        alert("수정이 완료 되었습니다.")
        const editProfileModal = document.getElementById("edit-profile-modal")
        editProfileModal.style.display = "none"
        location.reload()
      } catch (e) {
        alert('수정할 정보를 다시 한번 확인해 주세요.');
      }
    }

    profileImagePreview(input) {
      if (input.files && input.files[0]) {
        const reader = new FileReader()

        reader.onload = function (e) {
          document.getElementById('profile-image').setAttribute('src', e.target.result)
        }
        reader.readAsDataURL(input.files[0])
        const image = document.getElementById('profile-image');
        image.style.visibility = "visible";
      }
    }

    async userInfo() {
      const uri = document.getElementsByClassName('user-profile')[0].firstElementChild.getAttribute('href')
      const userInfo = (await axios.get(BASE_URL + "/api" + uri + "/info")).data
      document.getElementById('edit-introduction').setAttribute('value', userInfo.introduction)
      document.getElementById('edit-name').setAttribute('value', userInfo.name)
    }
  }

  class ArticleService extends Service {
    async showNewsfeed() {
      this.show(BASE_URL + "/api/articles")
    }

    async showArticles(userId) {
      this.show(BASE_URL + "/api/users/" + userId + "/articles")
    }

    async show(uri) {
      const articles = (await axios.get(uri)).data
      document.getElementById("articles").innerHTML = ""
      articles.forEach(article => {
        document.getElementById("articles").insertAdjacentHTML(
          "beforeend",
          templates.articleTemplate({
            "id": article.articleResponse.id,
            "content": article.articleResponse.content,
            "date": super.formatDate(article.articleResponse.createdDate),
            "user": article.articleResponse.userOutline,
            "images": article.articleResponse.attachments,
            "countOfComment": article.countOfComment,
            "countOfLike": article.countOfLike
          })
        )
        this.checkAuthor(article)
        this.checkLike(article.articleResponse.id)
        App.showComments(article.articleResponse.id)
      })
    }

    async checkAuthor(article) {
      const url = document.getElementById("user-profile").getAttribute("href")
      const userId = url.toString().replace("/users/", "")
      if (article.articleResponse.userOutline.id != userId) {
        document.getElementById("article-dropdown-menu-" + article.articleResponse.id).style.display = "none"
      }
    }

    async checkLike(articleId) {
      const isLiked = (await axios.get(BASE_URL + "/api/articles/" + articleId + "/like")).status
      if (isLiked === 200) {
        document.getElementById("article-like-" + articleId).classList.toggle('liked')
      }
    }

    async write() {
      const textbox = document.getElementById("new-article")
      const content = textbox.value.trim()
      const req = new FormData()
      req.append("content", content)
      const files = document.getElementById(
        "attachment").files;
      if (files.length > 0) {
        req.append("files", files[0])
      }
      if (!(content.length === 0 && files.length === 0)) {
        try {
          const article = (await axios.post(BASE_URL + "/api/articles", req)).data
          textbox.value = ""
          document.getElementById("articles").insertAdjacentHTML(
            "afterbegin",
            templates.articleTemplate({
              "id": article.id,
              "content": article.content,
              "date": super.formatDate(article.createdDate),
              "user": article.userOutline,
              "images": article.attachments,
              "countOfComment": 0,
              "countOfLike": 0
            })
          )
          document.getElementById("attachment").value = ""
        } catch (e) {
          alert("게시글을 다시 한번 확인해 주세요")
        }

      }
    }

    edit(id) {
      const contentArea = document.getElementById("article-" + id + "-content").lastElementChild
      const originalContent = contentArea.firstElementChild.innerText
      contentArea.innerHTML = ""
      contentArea.insertAdjacentHTML(
        "beforeend",
        '<textarea class="resize-none form-control border bottom resize-none" onkeydown="App.confirmEditArticle(event, ' + id + ')">' + originalContent + '</textarea>'
      )
      super.editBackup[id] = originalContent
    }

    async confirmEdit(event, id) {
      event = event || window.event
      const contentArea = document.getElementById("article-" + id + "-content").lastElementChild
      const editedContent = contentArea.firstElementChild.value.trim()
      if (editedContent.length != 0 && super.isEnterKey(event)) {
        try {
          const editedArticle = (await axios.put(BASE_URL + "/api/articles/" + id, {
            "content": editedContent
          })).data
          document.getElementById("article-" + id).querySelector(".sub-title").innerText = super.formatDate(editedArticle.createdDate)
          contentArea.innerHTML = ""
          contentArea.insertAdjacentHTML("afterbegin", "<span> " + templates.escapeHtml(editedArticle.content) + " </span>")
        } catch (e) {
          contentArea.innerHTML = ""
          contentArea.insertAdjacentHTML("afterbegin", "<span> " + templates.escapeHtml(super.editBackup[id]) + " </span>")
        }
        super.editBackup[id] = undefined
      }
    }

    async remove(id) {
      try {
        await axios.delete(BASE_URL + "/api/articles/" + id)
        document.getElementById("article-" + id).remove()
      } catch (e) {
      }
    }

    async like(id) {
      try {
        await axios.post(BASE_URL + "/api/articles/" + id + "/like")
        const likeButton = document.getElementById("article-like-" + id)
        likeButton.classList.toggle('liked')
        document.getElementById("count-of-like-" + id).innerText = " " + (await axios.get(BASE_URL + "/api/articles/" + id + "/like/count")).data
      } catch (e) {
      }
    }
  }

  class CommentService extends Service {
    async show(articleId) {
      const comments = (await axios.get("/api/articles/" + articleId + "/comments")).data
      comments.forEach(comment => {
        document.getElementById("comments-" + articleId).insertAdjacentHTML(
          "beforeend",
          templates.commentTemplate({
            "id": comment.id,
            "content": comment.content,
            "date": super.formatDate(comment.createdDate),
            "user": comment.userOutline
          })
        )
        this.checkAuthor(comment)
        this.checkLike(comment.id)
      })
    }

    async checkAuthor(comment) {
      const url = document.getElementById("user-profile").getAttribute("href")
      const userId = url.toString().replace("/users/", "")
      if (comment.userOutline.id != userId) {
        document.getElementById("comment-remove-button-" + comment.id).style.display = "none"
      }
    }

    async checkLike(commentId) {
      const countOfLike = (await axios.get(BASE_URL + "/api/comments/" + commentId + "/like/count")).data
      if (countOfLike >= 1) {
        document.getElementById("comment-item-" + commentId).insertAdjacentHTML(
          "beforeend",
          templates.commentLikeTemplate({
            "id": commentId
          })
        )
        document.getElementById("count-of-comment-like-" + commentId).innerText = " " + countOfLike
      }

      const isLiked = (await axios.get(BASE_URL + "/api/comments/" + commentId + "/like")).status
      if (isLiked === 200) {
        document.getElementById("comment-like-" + commentId).classList.toggle('liked')
      }
    }

    async write(event, id) {
      event = event || window.event
      const textbox = document.getElementById("new-comment-" + id)
      const content = textbox.value.trim()
      if (content.length != 0 && super.isEnterKey(event)) {
        try {
          const comment = (await axios.post(BASE_URL + "/api/articles/" + id + "/comments", {
            "content": content
          })).data
          textbox.value = ""
          document.getElementById("comments-" + id).insertAdjacentHTML(
            "beforeend",
            templates.commentTemplate({
              "id": comment.id,
              "content": comment.content,
              "date": super.formatDate(comment.createdDate),
              "user": comment.userOutline
            })
          )
          document.getElementById("count-of-comment-" + id).innerText = (await axios.get(BASE_URL + "/api/articles/" + id + "/comments/count")).data
        } catch (e) {
        }
      }
    }

    async remove(id) {
      try {
        const articleId = document.getElementById("comment-item-" + id).parentNode.getAttribute("id").substring(9)
        await axios.delete(BASE_URL + "/api/comments/" + id)
        document.getElementById("comment-item-" + id).remove()
        document.getElementById("count-of-comment-" + articleId).innerText = (await axios.get(BASE_URL + "/api/articles/" + articleId + "/comments/count")).data
      } catch (e) {
      }
    }

    async like(id) {
      try {
        let countOfLike = (await axios.get(BASE_URL + "/api/comments/" + id + "/like/count")).data
        if (countOfLike === 0) {
          document.getElementById("comment-item-" + id).insertAdjacentHTML(
            "beforeend",
            templates.commentLikeTemplate({
              "id": id
            })
          )
        }

        await axios.post(BASE_URL + "/api/comments/" + id + "/like")
        countOfLike = (await axios.get(BASE_URL + "/api/comments/" + id + "/like/count")).data

        if (countOfLike === 0) {
          document.getElementById("comment-like-" + id).remove()
        }

        if (countOfLike >= 1) {
          document.getElementById("count-of-comment-like-" + id).innerText = " " + (await axios.get(BASE_URL + "/api/comments/" + id + "/like/count")).data
          document.getElementById("comment-like-" + id).classList.toggle('liked')
        }
      } catch (e) {
      }
    }
  }

  class FriendService extends Service {
    constructor() {
      if (typeof document.getElementById('user-id') === 'undefined'
        || document.getElementById('user-id') === null) {
        super();
        return;
      }

      const userId = document.getElementById('user-id').value;
      const friendId = document.getElementById('friend-id').value;

      if (typeof userId !== 'undefined' && userId !== friendId) {

        if (document.getElementById('already-friend').value === 'true') {
          // toggleButton
          const addFriend = document.getElementById('add-friend');
          addFriend.classList.toggle('already-friend');

          const removeFriend = document.getElementById('remove-friend');
          removeFriend.classList.toggle('already-friend');
        }
      }
      super();
    }

    async makeFriend(friendId) {
      try {
        const req = {friendId: friendId}

        // 일단 성공한다고 가정
        await axios.post(BASE_URL + "/api/friendships", req);

        this.toggleButton();
      } catch (e) {
      }
    }

    async breakWithFriend(friendId) {
      try {
        // 일단 성공한다고 가정
        await axios.delete(BASE_URL + "/api/friendships?friendId=" + friendId)

        this.toggleButton();
      } catch (e) {
      }
    }

    toggleButton() {
      const addFriend = document.getElementById('add-friend');
      addFriend.classList.toggle('already-friend');

      const removeFriend = document.getElementById('remove-friend');
      removeFriend.classList.toggle('already-friend');
    }

    async makeFriendAndToggleTarget(friendId, target) {
      try {
        const req = {friendId: friendId}

        // 일단 성공한다고 가정
        await axios.post(BASE_URL + "/api/friendships", req);

        this.toggleTarget(target);
      } catch (e) {
      }
    }

    toggleTarget(target) {
      target.classList.toggle('already-friend');
    }
  }

  class SearchService {
    constructor() {
      const autoComplete = document.getElementById("auto-complete")
      const findUsernamesByKeyword = async keyword => {
        const result = (await axios.get(BASE_URL + "/api/users/" + keyword)).data
        autoComplete.innerHTML = ""
        for (let i = 0; i < result.length; i++) {
                   autoComplete.innerHTML += `<span class="dropdown-item" onclick="App.visitResult('${result[i].name}', ${result[i].id})">${result[i].name}&nbsp;&nbsp;
                                               <span style="color:grey"> (${result[i].email}) </span></span>`
                 }
      }
      document.getElementById("search").addEventListener("keyup", event => {
        const keyword = event.target.value
        if (keyword.trim().length === 0) {
          autoComplete.style.display = "none"
          autoComplete.innerHTML = ""
        } else {
          autoComplete.style.display = "block"
          findUsernamesByKeyword(keyword)
        }
      })
    }

    visitResult(name, id) {
      document.getElementById("search").value = name
      document.getElementById("search-form").setAttribute("action", "/users/" + id)
      document.getElementById("auto-complete").style.display = "none"
    }
  }

  class ProfileService extends Service {
    async showFriends(userId) {
      const friends = (await axios.get(BASE_URL + "/api/friendships/" + userId)).data
      document.getElementById("friend-list").innerHTML = ""
      friends.forEach(friend => {
        document.getElementById("friend-list").insertAdjacentHTML(
          "beforeend",
          templates.friendTemplate({
            "id": friend.id,
            "name": friend.name,
            "profileImage": friend.profileImage.path
          })
        )
      })
    }
  }

  class Controller {
    constructor(articleService, commentService, friendService, searchService, userService, profileService) {
      this.articleService = articleService
      this.commentService = commentService
      this.friendService = friendService
      this.searchService = searchService
      this.userService = userService
      this.profileService = profileService
    }

    showNewsfeed() {
      this.articleService.showNewsfeed()
    }

    showArticles(userId) {
      this.articleService.showArticles(userId)
    }

    writeArticle(event) {
      this.articleService.write(event)
    }

    editArticle(id) {
      this.articleService.edit(id)
    }

    confirmEditArticle(event, id) {
      this.articleService.confirmEdit(event, id)
    }

    removeArticle(id) {
      this.articleService.remove(id)
    }

    likeArticle(id) {
      this.articleService.like(id)
    }

    showComments(articleId) {
      this.commentService.show(articleId)
    }

    writeComment(event, id) {
      this.commentService.write(event, id)
    }

    removeComment(id) {
      this.commentService.remove(id)
    }

    likeComment(id) {
      this.commentService.like(id)
    }

    makeFriend(friendId) {
      this.friendService.makeFriend(friendId)
    }

    makeFriendAndToggleTarget(friendId, target) {
      this.friendService.makeFriendAndToggleTarget(friendId, target)
    }

    breakWithFriend(friendId) {
      this.friendService.breakWithFriend(friendId)
    }

    visitResult(name, id) {
      this.searchService.visitResult(name, id)
    }

    editProfile() {
      this.userService.edit()
    }

    userInfo() {
      this.userService.userInfo()
    }

    profileImagePreview(input) {
      this.userService.profileImagePreview(input)
    }

    showFriends(userId) {
      this.profileService.showFriends(userId)
    }
  }

  const editImage = document.getElementById('profile-attachment');
  if (editImage != null) {
    editImage.addEventListener('change', function () {
      App.profileImagePreview(this)
    })
  }

  const api = new Api()
  return new Controller(new ArticleService(api), new CommentService(api), new FriendService(), new SearchService(), new UserService(api), new ProfileService(api))
})()