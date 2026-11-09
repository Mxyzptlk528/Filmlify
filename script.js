var SUPABASE_URL = "https://syuzulohxubhliafuqkq.supabase.co";
var SUPABASE_KEY = "sb_publishable_UnUcB1v4omYreAwClYtxZA_dpLiUjHi";
var CLOUD = SUPABASE_URL !== "" && SUPABASE_KEY !== "";

var realFetch = window.fetch.bind(window);
window.fetch = async function (url, options) {
  if (typeof url === "string" && url.indexOf("https://api.themoviedb.org") === 0) {
    var cacheKey = "tmdb:" + url.replace(/api_key=[^&]*/, "");
    try {
      var saved = sessionStorage.getItem(cacheKey);
      if (saved) { return new Response(saved, { status: 200, headers: { "Content-Type": "application/json" } }); }
    } catch (e) {}
    var response = await realFetch(url, options);
    if (response.ok) { try { sessionStorage.setItem(cacheKey, await response.clone().text()); } catch (e) {} }
    return response;
  }
  return realFetch(url, options);
};

(function () {
  var go = null;
  try { go = sessionStorage.getItem("goto"); sessionStorage.removeItem("goto"); } catch (e) {}
  history.replaceState(null, "", go || "#home");
})();

function showPage() {
  var name = location.hash.replace("#", "") || "home";
  if (!document.getElementById(name)) { name = "home"; }

  if ((name === "profile" || name === "people") && !currentUser()) {
    returnTo = "#" + name;
    showMessage("Please log in to see this page.");
    location.hash = "#login";
    return;
  }
  if (name === "login" && currentUser()) { location.hash = "#profile"; return; }

  document.querySelectorAll(".page").forEach(function (page) {
    page.classList.toggle("active", page.id === name);
  });

  var menuName = (name === "login") ? "profile" : name;
  document.querySelectorAll("nav a").forEach(function (link) {
    link.classList.toggle("active", link.getAttribute("href") === "#" + menuName);
  });
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", showPage);
showPage();

function showMessage(text) {
  var box = document.getElementById("message");
  box.textContent = text;
  box.style.display = "block";
  setTimeout(function () { box.style.display = "none"; }, 2500);
}

document.querySelectorAll(".add").forEach(function (button) {
  button.onclick = function () { showMessage("Done! (Connect a database to save this.)"); };
});

var TICKET_PRICE = 340;
var TAKEN = ["D6", "E10", "F5", "F6", "C12"];
var chosen = ["E7", "E6"];
var seatBox = document.getElementById("seats");

"ABCDEFGH".split("").forEach(function (row) {
  for (var n = 1; n <= 15; n++) {
    var id = row + n;
    var seat = document.createElement("button");
    seat.className = "seat";
    seat.title = id;
    if (TAKEN.includes(id)) { seat.classList.add("taken"); }
    if (chosen.includes(id)) { seat.classList.add("selected"); }
    seat.onclick = function () {
      var seatId = this.title;
      if (this.classList.contains("taken")) { return; }
      this.classList.toggle("selected");
      if (chosen.includes(seatId)) { chosen.splice(chosen.indexOf(seatId), 1); }
      else { chosen.push(seatId); }
      updateSummary();
    };
    seatBox.appendChild(seat);
  }
});

document.querySelectorAll("#times button").forEach(function (b) {
  b.onclick = function () {
    document.querySelectorAll("#times button").forEach(function (x) { x.classList.remove("chosen"); });
    b.classList.add("chosen");
    updateSummary();
  };
});

function updateSummary() {
  document.getElementById("sumCinema").textContent = document.getElementById("cinema").value;
  document.getElementById("sumTime").textContent =
    document.getElementById("date").value + " • " + document.querySelector("#times .chosen").textContent;
  document.getElementById("sumSeats").textContent = chosen.join(", ") || "None";
  document.getElementById("sumTotal").textContent = "₱ " + (chosen.length * TICKET_PRICE).toFixed(2);
}
document.getElementById("cinema").onchange = updateSummary;
document.getElementById("date").onchange = updateSummary;
document.getElementById("payBtn").onclick = function () {
  if (!requireLogin("book tickets")) { return; }
  showMessage("Add your payment system here.");
};
updateSummary();

var signUpMode = false;

document.getElementById("showPass").onchange = function () {
  document.getElementById("pass").type = this.checked ? "text" : "password";
};

document.getElementById("switchLink").onclick = function (e) {
  e.preventDefault();
  signUpMode = !signUpMode;
  document.getElementById("formTitle").textContent = signUpMode ? "Create your account" : "Welcome to Filmlify";
  document.getElementById("submitBtn").textContent = signUpMode ? "Sign Up" : "Sign In";
  document.getElementById("emailBox").style.display = signUpMode ? "block" : "none";
  document.querySelector('label[for="user"]').textContent = signUpMode ? "Username" : (CLOUD ? "Email" : "Email or Username");
  document.getElementById("switchText").textContent = signUpMode ? "Already have an account?" : "Don't have an account?";
  this.textContent = signUpMode ? "Sign In" : "Sign Up";
};

document.getElementById("loginForm").onsubmit = async function (e) {
  e.preventDefault();
  var user = document.getElementById("user").value.trim();
  var email = document.getElementById("email").value.trim();
  var pass = document.getElementById("pass").value;
  var errors = { user: "", email: "", pass: "" };

  if (!user) { errors.user = signUpMode ? "Please choose a username." : "Please enter your email or username."; }
  if (!pass) { errors.pass = "Please enter your password."; }

  if (signUpMode) {
    if (user && user.length < 3) { errors.user = "Username needs at least 3 characters."; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { errors.email = "Please enter a valid email."; }
    if (pass && pass.length < 6) { errors.pass = "Password needs at least 6 characters."; }
  }

  if (!errors.user && !errors.email && !errors.pass) {
    if (CLOUD) {
      var problem = await cloudAuth(signUpMode, user, email, pass);
      if (problem) { document.getElementById("passError").textContent = problem; }
      return;
    }
    var list = accounts();
    if (signUpMode) {
      var taken = list.some(function (a) { return a.username.toLowerCase() === user.toLowerCase() || a.email.toLowerCase() === email.toLowerCase(); });
      if (taken) { errors.user = "That username or email is already registered."; }
      else {
        var salt = Math.random().toString(36).slice(2);
        list.push({ username: user, email: email, salt: salt, hash: await hashPassword(pass, salt) });
        localStorage.setItem("filmlify_accounts", JSON.stringify(list));
        finishLogin(user, "Welcome to Filmlify, " + user + "!");
        return;
      }
    } else {
      var account = list.find(function (a) { return a.username.toLowerCase() === user.toLowerCase() || a.email.toLowerCase() === user.toLowerCase(); });
      if (!account) { errors.user = "No account found. Please sign up first."; }
      else if (await hashPassword(pass, account.salt) !== account.hash) { errors.pass = "Wrong password."; }
      else { finishLogin(account.username, "Welcome back, " + account.username + "!"); return; }
    }
  }
  document.getElementById("userError").textContent = errors.user;
  document.getElementById("emailError").textContent = errors.email;
  document.getElementById("passError").textContent = errors.pass;
};

document.getElementById("googleBtn").onclick = function () {
  showMessage("Google sign-in needs setup first.");
};

var TMDB_KEY = "9bac28ec4c4699d299b9cc8039e654f7";
var TMDB_URL = "https://api.themoviedb.org/3";
var POSTER_URL = "https://image.tmdb.org/t/p/w342";
var PROFILE_URL = "https://image.tmdb.org/t/p/w185";
var BACKDROP_URL = "https://image.tmdb.org/t/p/w1280";
var searchCache = {};

async function searchTMDB(title) {
  if (title in searchCache) { return searchCache[title]; }
  try {
    var response = await fetch(TMDB_URL + "/search/multi?query=" + encodeURIComponent(title) + "&api_key=" + TMDB_KEY);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var data = await response.json();
    var match = (data.results || []).find(function (item) {
      return (item.media_type === "movie" || item.media_type === "tv") && item.poster_path;
    });
    searchCache[title] = match || null;
    return searchCache[title];
  } catch (error) {
    console.error("TMDB lookup failed for '" + title + "':", error);
    return null;
  }
}

async function loadPosters() {
  var cards = Array.from(document.querySelectorAll(".card")).filter(function (card) {
    return !card.querySelector(".has-image");
  });
  for (var i = 0; i < cards.length; i += 6) {
    await Promise.all(cards.slice(i, i + 6).map(async function (card) {
      var item = await searchTMDB(card.querySelector("b").textContent);
      if (item) {
        var poster = card.querySelector(".poster");
        poster.style.backgroundImage = "url(" + POSTER_URL + item.poster_path + ")";
        poster.classList.add("has-image");
      }
    }));
  }
}

async function loadBackdrops() {
  var banners = document.querySelectorAll(".hero[data-title]");
  for (var i = 0; i < banners.length; i++) {
    var item = await searchTMDB(banners[i].dataset.title);
    if (item && item.backdrop_path) {
      banners[i].style.backgroundImage =
        "linear-gradient(90deg, #0b1124dd, #0b112455), url(" + BACKDROP_URL + item.backdrop_path + ")";
      banners[i].style.backgroundSize = "cover";
      banners[i].style.backgroundPosition = "center";
    }
  }
}

var QUICK_ICONS = {
  like: '<svg viewBox="0 0 24 24"><path d="M12 20.5l-1.2-1.1C5.9 15.1 3 12.4 3 9a4.5 4.5 0 0 1 8-2.8h2A4.5 4.5 0 0 1 21 9c0 3.4-2.9 6.1-7.8 10.4z"/></svg>',
  watched: '<svg viewBox="0 0 24 24"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>',
  watchlist: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};

function makeCard(m) {
  var card = document.createElement("div");
  card.className = "card";
  card.dataset.key = remember(m);

  var poster = document.createElement("div");
  poster.className = "poster has-image";
  poster.style.backgroundImage = "url(" + POSTER_URL + m.poster_path + ")";

  var title = document.createElement("b");
  title.textContent = m.title || m.name;

  var info = document.createElement("small");
  var date = m.release_date || m.first_air_date || "";
  var rating = m.vote_average ? "★ " + m.vote_average.toFixed(1) + " • " : "";
  info.textContent = rating + date.slice(0, 4);

  var quick = document.createElement("div");
  quick.className = "quick";
  [["♥", "like", "Like"], ["✓", "watched", "Mark as watched"], ["+", "watchlist", "Add to watchlist"]].forEach(function (b) {
    var button = document.createElement("button");
    button.innerHTML = QUICK_ICONS[b[1]];
    button.setAttribute("aria-label", b[2]);
    button.dataset.action = b[1];
    button.title = b[2];
    quick.appendChild(button);
  });
  poster.appendChild(quick);

  card.appendChild(poster);
  card.appendChild(title);
  card.appendChild(info);
  return card;
}

async function fillRows() {
  var rows = Array.from(document.querySelectorAll(".row[data-source]"));
  await Promise.all(rows.map(async function (row) {
    try {
      var source = row.dataset.source;
      var joiner = source.includes("?") ? "&" : "?";
      var response = await fetch(TMDB_URL + source + joiner + "api_key=" + TMDB_KEY);
      if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
      var data = await response.json();
      var items = (data.results || []).filter(function (m) { return m.poster_path; });
      if (items.length === 0) { return; }
      row.replaceChildren();
      items.forEach(function (m) { row.appendChild(makeCard(m)); });
      row.scrollLeft = 0;
    } catch (error) {
      console.error("Could not fill row " + row.dataset.source + ":", error);
    }
  }));
}

async function loadEverything() {
  fillEpisodes();
  await Promise.all([fillRows(), fillPeople()]);
  loadPosters();
  loadBackdrops();
  loadIcons();
  updateAllArrows();
}
loadEverything();

function cardStep(row) {
  var first = row.firstElementChild;
  if (!first) { return row.clientWidth; }
  var gap = parseFloat(getComputedStyle(row).columnGap) || 14;
  var one = first.getBoundingClientRect().width + gap;
  return Math.max(1, Math.floor(row.clientWidth / one)) * one;
}

var allRows = document.querySelectorAll(".row");

allRows.forEach(function (row) {
  var slider = document.createElement("div");
  slider.className = "slider";
  row.parentNode.insertBefore(slider, row);

  var leftArrow = document.createElement("button");
  leftArrow.className = "arrow left";
  leftArrow.textContent = "‹";
  leftArrow.setAttribute("aria-label", "Scroll left");

  var rightArrow = document.createElement("button");
  rightArrow.className = "arrow right";
  rightArrow.textContent = "›";
  rightArrow.setAttribute("aria-label", "Scroll right");

  slider.appendChild(leftArrow);
  slider.appendChild(row);
  slider.appendChild(rightArrow);

  leftArrow.onclick = function () {
    row.scrollBy({ left: -cardStep(row), behavior: "smooth" });
  };
  rightArrow.onclick = function () {
    row.scrollBy({ left: cardStep(row), behavior: "smooth" });
  };

  row.updateArrows = function () {
    var canScroll = row.scrollWidth > row.clientWidth + 1;
    leftArrow.classList.toggle("hidden", !canScroll || row.scrollLeft <= 0);
    rightArrow.classList.toggle("hidden", !canScroll || row.scrollLeft + row.clientWidth >= row.scrollWidth - 1);
  };
  row.addEventListener("scroll", row.updateArrows);
});

function updateAllArrows() {
  allRows.forEach(function (row) { row.updateArrows(); });
}
window.addEventListener("resize", updateAllArrows);
window.addEventListener("hashchange", updateAllArrows);
document.getElementById("search").addEventListener("input", updateAllArrows);
updateAllArrows();

var known = {};
var current = null;
var chosenStars = 0;

function remember(m) {
  m.media_type = m.media_type || (m.first_air_date !== undefined ? "tv" : "movie");
  var key = m.media_type + "-" + m.id;
  known[key] = m;
  return key;
}
function nameOf(m) { return m.title || m.name; }
function yearOf(m) { return (m.release_date || m.first_air_date || "").slice(0, 4); }
function starText(n) { return "★".repeat(n) + "☆".repeat(5 - n); }

function getList(name) {
  var key = userKey(name);
  if (!key) { return []; }
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
}
function saveList(name, list) {
  var key = userKey(name);
  if (!key) { return; }
  try { localStorage.setItem(key, JSON.stringify(list)); }
  catch (e) { showMessage("Could not save: your browser blocked storage."); }
}

function reviewElement(r, showTitle) {
  var row = document.createElement("div");
  row.className = "item";
  var inner = document.createElement("span");

  if (showTitle) {
    var title = document.createElement("b");
    title.textContent = r.title + " ";
    inner.appendChild(title);
  }
  var starsEl = document.createElement("span");
  starsEl.className = "star";
  starsEl.textContent = starText(r.stars);
  inner.appendChild(starsEl);

  if (r.text) {
    inner.appendChild(document.createElement("br"));
    inner.appendChild(document.createTextNode(r.text));
  }
  var date = document.createElement("small");
  date.textContent = "Reviewed " + r.date;
  inner.appendChild(document.createElement("br"));
  inner.appendChild(date);

  if (showTitle) {
    var thumb = document.createElement("div");
    thumb.className = "pic tall";
    if (r.poster) {
      thumb.classList.add("has-image");
      thumb.style.backgroundImage = "url(" + POSTER_URL + r.poster + ")";
    }
    row.classList.add("with-pic");
    row.appendChild(thumb);
  }
  var del = document.createElement("button");
  del.className = "btn small";
  del.textContent = "✕";
  del.title = "Delete review";
  del.onclick = function () {
    if (!confirm("Delete this review?")) { return; }
    cloudDeleteReview(r.id);
    saveList("filmlify_reviews", getList("filmlify_reviews").filter(function (x) { return x.id !== r.id; }));
    renderProfile();
    if (current) { paintReviews(); }
  };
  row.appendChild(inner);
  row.appendChild(del);
  return row;
}

function renderProfile() {
  updateStats();
  renderGenres();
  ensureReviewIds();
  renderCustomLists();
  renderFavorites();
  var reviewBox = document.getElementById("reviewList");
  reviewBox.replaceChildren();
  var reviews = getList("filmlify_reviews").slice().reverse();
  if (reviews.length === 0) { reviewBox.textContent = "No reviews yet. Click any poster to write one."; }
  reviews.forEach(function (r) { reviewBox.appendChild(reviewElement(r, true)); });

  var listBox = document.getElementById("myWatchlist");
  listBox.replaceChildren();
  getList("filmlify_watchlist").forEach(function (w) {
    var row = document.createElement("div");
    row.className = "item";
    var label = document.createElement("span");
    label.textContent = w.title + (w.year ? " (" + w.year + ")" : "");
    var remove = document.createElement("button");
    remove.className = "btn";
    remove.textContent = "Remove";
    remove.onclick = function () {
      saveList("filmlify_watchlist", getList("filmlify_watchlist").filter(function (x) { return x.key !== w.key; }));
      renderProfile();
      paintWatchlistButton();
    };
    row.appendChild(label);
    row.appendChild(remove);
    listBox.appendChild(row);
  });
}

function paintStars() {
  document.querySelectorAll(".star-btn").forEach(function (b) {
    b.classList.toggle("on", Number(b.dataset.value) <= chosenStars);
  });
}

function paintReviews() {
  var box = document.getElementById("mReviews");
  box.replaceChildren();
  var key = current.media_type + "-" + current.id;
  var mine = getList("filmlify_reviews").filter(function (r) { return r.key === key; }).reverse();
  if (mine.length === 0) { box.textContent = "No reviews yet. Be the first!"; }
  mine.forEach(function (r) { box.appendChild(reviewElement(r, false)); });
}

function paintWatchlistButton() {
  if (!current) { return; }
  var key = current.media_type + "-" + current.id;
  var inList = getList("filmlify_watchlist").some(function (w) { return w.key === key; });
  document.getElementById("mWatchlist").textContent = inList ? "✓ In Watchlist (click to remove)" : "+ Add to Watchlist";
}

function toggleWatchlist(m) {
  if (!requireLogin("use your watchlist")) { return; }
  var key = m.media_type + "-" + m.id;
  var list = getList("filmlify_watchlist");
  var exists = list.some(function (w) { return w.key === key; });
  if (exists) {
    list = list.filter(function (w) { return w.key !== key; });
    showMessage("Removed from your watchlist.");
  } else {
    list.push({ key: key, title: nameOf(m), year: yearOf(m) });
    showMessage("Added to your watchlist!");
  }
  saveList("filmlify_watchlist", list);
  renderProfile();
  paintWatchlistButton();
}

function openMovie(m) {
  remember(m);
  current = m;
  chosenStars = 0;
  document.getElementById("mTitle").textContent = nameOf(m);
  document.getElementById("mMeta").textContent =
    (m.media_type === "tv" ? "TV Show" : "Movie") + (yearOf(m) ? " • " + yearOf(m) : "") +
    (m.vote_average ? " • ★ " + m.vote_average.toFixed(1) : "");
  document.getElementById("mOverview").textContent = m.overview || "No description available.";
  document.getElementById("mPoster").style.backgroundImage = m.poster_path ? "url(" + POSTER_URL + m.poster_path + ")" : "none";
  document.getElementById("reviewText").value = "";
  document.getElementById("reviewError").textContent = "";
  paintStars();
  paintReviews();
  paintWatchlistButton();
  paintWatchedButton();
  paintFavoriteButton();
  paintListSelect();
  loadDetails(m);
  document.getElementById("modal").classList.add("open");
}
function closeMovie() { document.getElementById("modal").classList.remove("open"); }

document.addEventListener("click", async function (e) {
  var card = e.target.closest(".card");
  if (!card || e.target.closest(".quick")) { return; }
  if (!card.dataset.key) {
    var found = await searchTMDB(card.querySelector("b").textContent);
    if (!found) { showMessage("Sorry, no details found for this title."); return; }
    card.dataset.key = remember(found);
  }
  openMovie(known[card.dataset.key]);
});

document.querySelectorAll(".hero[data-title], .spotlight[data-title]").forEach(function (hero) {
  hero.querySelectorAll(".btn").forEach(function (button) {
    button.onclick = async function () {
      var found = await searchTMDB(hero.dataset.title);
      if (!found) { showMessage("Sorry, no details found for this title."); return; }
      remember(found);
      if (button.classList.contains("add")) { toggleWatchlist(found); } else { openMovie(found); }
    };
  });
});

document.querySelectorAll(".star-btn").forEach(function (b) {
  b.onclick = function () {
    if (!requireLogin("write a review")) { return; }
    chosenStars = Number(b.dataset.value);
    paintStars();
  };
});
document.getElementById("mWatchlist").onclick = function () { toggleWatchlist(current); };
document.getElementById("closeModal").onclick = closeMovie;
document.getElementById("modal").onclick = function (e) { if (e.target === this) { closeMovie(); } };

document.getElementById("postReview").onclick = function () {
  var text = document.getElementById("reviewText").value.trim();

  if (chosenStars === 0 && text === "") { closeMovie(); return; }
  if (chosenStars === 0) {
    document.getElementById("reviewError").textContent = "Please pick a star rating first.";
    return;
  }

  if (!requireLogin("post a review")) { return; }
  var reviews = getList("filmlify_reviews");
  reviews.push({
    id: Date.now(),
    key: current.media_type + "-" + current.id,
    title: nameOf(current),
    poster: current.poster_path || "",
    genres: genreNames(current),
    stars: chosenStars,
    text: text,
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  });
  saveList("filmlify_reviews", reviews);
  cloudSaveReview(reviews[reviews.length - 1]);
  addWatched(current);
  renderProfile();
  closeMovie();
  showMessage("Review saved! You can see it on your Profile.");
};
renderProfile();

var searchBox = document.getElementById("search");
var suggestionBox = document.getElementById("suggestions");
var searchTimer = null;
var suggestions = [];
var activeRow = -1;

function hideSuggestions() {
  suggestionBox.classList.remove("open");
  suggestions = [];
  activeRow = -1;
}

function showSuggestions() {
  suggestionBox.replaceChildren();
  if (suggestions.length === 0) {
    var none = document.createElement("div");
    none.className = "no-result";
    none.textContent = "No movies or shows found.";
    suggestionBox.appendChild(none);
  }
  suggestions.forEach(function (m, index) {
    var row = document.createElement("div");
    row.className = "suggestion" + (index === activeRow ? " active" : "");

    var thumb = document.createElement("div");
    thumb.className = "thumb";
    if (m.poster_path) { thumb.style.backgroundImage = "url(https://image.tmdb.org/t/p/w92" + m.poster_path + ")"; }

    var text = document.createElement("div");
    var name = document.createElement("b");
    name.textContent = nameOf(m);
    var info = document.createElement("small");
    info.textContent = (m.media_type === "tv" ? "TV Show" : "Movie") + (yearOf(m) ? " • " + yearOf(m) : "");
    text.appendChild(name);
    text.appendChild(document.createElement("br"));
    text.appendChild(info);

    row.appendChild(thumb);
    row.appendChild(text);
    row.onclick = function () { chooseSuggestion(m); };
    suggestionBox.appendChild(row);
  });
  suggestionBox.classList.add("open");
}

function chooseSuggestion(m) {
  hideSuggestions();
  searchBox.value = "";
  openMovie(m);
}

async function runSearch(text) {
  try {
    var response = await fetch(TMDB_URL + "/search/multi?query=" + encodeURIComponent(text) + "&api_key=" + TMDB_KEY);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var data = await response.json();
    if (searchBox.value.trim() !== text) { return; }
    suggestions = (data.results || []).filter(function (m) {
      return m.media_type === "movie" || m.media_type === "tv";
    }).slice(0, 6);
    activeRow = -1;
    showSuggestions();
  } catch (error) {
    console.error("Search failed:", error);
  }
}

searchBox.addEventListener("input", function () {
  clearTimeout(searchTimer);
  var text = searchBox.value.trim();
  if (text.length < 2) { hideSuggestions(); return; }
  searchTimer = setTimeout(function () { runSearch(text); }, 300);
});

searchBox.addEventListener("keydown", function (e) {
  if (e.key === "ArrowDown" && suggestions.length) { activeRow = (activeRow + 1) % suggestions.length; showSuggestions(); e.preventDefault(); }
  else if (e.key === "ArrowUp" && suggestions.length) { activeRow = (activeRow - 1 + suggestions.length) % suggestions.length; showSuggestions(); e.preventDefault(); }
  else if (e.key === "Enter" && suggestions.length) { chooseSuggestion(suggestions[activeRow >= 0 ? activeRow : 0]); }
});

document.addEventListener("click", function (e) {
  if (!e.target.closest(".search-wrap")) { hideSuggestions(); }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") { hideSuggestions(); closeMovie(); }
});

var personCache = {};

async function searchPerson(name) {
  if (name in personCache) { return personCache[name]; }
  try {
    var response = await fetch(TMDB_URL + "/search/person?query=" + encodeURIComponent(name) + "&api_key=" + TMDB_KEY);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var data = await response.json();
    personCache[name] = (data.results || []).find(function (p) { return p.profile_path; }) || null;
    return personCache[name];
  } catch (error) {
    console.error("Person lookup failed for '" + name + "':", error);
    return null;
  }
}

async function loadIcons() {
  var icons = Array.from(document.querySelectorAll(".pic[data-title], .pic[data-person]"));
  await Promise.all(icons.map(async function (icon) {
    var url = "";
    if (icon.dataset.person) {
      var person = await searchPerson(icon.dataset.person);
      if (person) { url = PROFILE_URL + person.profile_path; }
    } else {
      var item = await searchTMDB(icon.dataset.title);
      if (item) { url = POSTER_URL + item.poster_path; }
    }
    if (url) {
      icon.style.backgroundImage = "url(" + url + ")";
      icon.classList.add("has-image");
    }
  }));
}

async function fillPeople() {
  var row = document.getElementById("peopleRow");
  try {
    var response = await fetch(TMDB_URL + "/trending/person/week?api_key=" + TMDB_KEY);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var data = await response.json();
    var people = (data.results || []).filter(function (p) { return p.profile_path; }).slice(0, 12);
    if (people.length === 0) { return; }
    row.replaceChildren();
    people.forEach(function (p) {
      var box = document.createElement("div");
      box.className = "person";
      var pic = document.createElement("div");
      pic.className = "pic round has-image";
      pic.style.backgroundImage = "url(" + PROFILE_URL + p.profile_path + ")";
      var name = document.createElement("div");
      name.textContent = p.name;
      var follow = document.createElement("button");
      follow.className = "btn small follow-btn";
      follow.dataset.name = p.name;
      box.appendChild(pic);
      box.appendChild(name);
      box.appendChild(follow);
      row.appendChild(box);
    });
    row.scrollLeft = 0;
    paintFollowButtons();
  } catch (error) {
    console.error("Could not load trending people:", error);
  }
}

var GENRE_NAMES = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary",
  18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller",
  10752: "War", 37: "Western", 10759: "Action", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi", 10766: "Soap", 10767: "Talk", 10768: "War"
};
function genreNames(m) {
  return (m.genre_ids || []).map(function (id) { return GENRE_NAMES[id]; }).filter(Boolean);
}

function updateStats() {
  var cc = window.cloudCounts || { followers: 0, following: 0 };
  document.getElementById("statFollowers").textContent = cc.followers;
  document.getElementById("statFollowing").textContent = cc.following + getList("filmlify_following").length;
  document.getElementById("statWatched").textContent = getList("filmlify_watched").length;
  document.getElementById("statReviews").textContent = getList("filmlify_reviews").length;
  document.getElementById("statWatchlist").textContent = getList("filmlify_watchlist").length;
}

function renderGenres() {
  var box = document.getElementById("genreBars");
  box.replaceChildren();
  var counts = {}, total = 0;
  getList("filmlify_reviews").forEach(function (r) {
    (r.genres || []).forEach(function (g) { counts[g] = (counts[g] || 0) + 1; total++; });
  });
  var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 4);
  if (top.length === 0) { box.textContent = "Review a movie or show and its genres will appear here."; return; }

  top.forEach(function (g) {
    var percent = Math.round(counts[g] / total * 100);
    var label = document.createElement("div");
    label.style.display = "flex";
    label.style.justifyContent = "space-between";
    label.innerHTML = "<span></span><b></b>";
    label.firstChild.textContent = g;
    label.lastChild.textContent = percent + "%";
    var bar = document.createElement("div");
    bar.className = "bar";
    var fill = document.createElement("i");
    fill.style.width = percent + "%";
    bar.appendChild(fill);
    box.appendChild(label);
    box.appendChild(bar);
  });
}

function addWatched(m) {
  var key = m.media_type + "-" + m.id;
  var list = getList("filmlify_watched");
  if (!list.some(function (w) { return w.key === key; })) {
    list.push({ key: key, title: nameOf(m) });
    saveList("filmlify_watched", list);
  }
}
function toggleWatched(m) {
  if (!requireLogin("mark movies as watched")) { return; }
  var key = m.media_type + "-" + m.id;
  var list = getList("filmlify_watched");
  if (list.some(function (w) { return w.key === key; })) {
    saveList("filmlify_watched", list.filter(function (w) { return w.key !== key; }));
    showMessage("Removed from your watched list.");
  } else {
    addWatched(m);
    showMessage("Marked as watched!");
  }
  paintWatchedButton();
  renderProfile();
}
function paintWatchedButton() {
  if (!current) { return; }
  var key = current.media_type + "-" + current.id;
  var done = getList("filmlify_watched").some(function (w) { return w.key === key; });
  document.getElementById("mWatched").textContent = done ? "✓ Watched (click to undo)" : "Mark as Watched";
}
document.getElementById("mWatched").onclick = function () { toggleWatched(current); };

function paintFollowButtons() {
  var following = getList("filmlify_following");
  document.querySelectorAll(".follow-btn").forEach(function (b) {
    b.textContent = following.indexOf(b.dataset.name) >= 0 ? "Following ✓" : "Follow";
  });
}
document.addEventListener("click", function (e) {
  var button = e.target.closest(".follow-btn");
  if (!button) { return; }
  if (!requireLogin("follow people")) { return; }
  var name = button.dataset.name;
  var following = getList("filmlify_following");
  if (following.indexOf(name) >= 0) {
    following = following.filter(function (n) { return n !== name; });
    showMessage("You unfollowed " + name + ".");
  } else {
    following.push(name);
    showMessage("You are now following " + name + "!");
  }
  saveList("filmlify_following", following);
  paintFollowButtons();
  renderProfile();
});
paintFollowButtons();
renderProfile();

async function fillMissingReviewData() {
  var reviews = getList("filmlify_reviews");
  var changed = false;

  for (var i = 0; i < reviews.length; i++) {
    var r = reviews[i];
    if (!r.key || (r.poster !== undefined && r.genres !== undefined)) { continue; }

    var parts = r.key.split("-");
    try {
      var response = await fetch(TMDB_URL + "/" + parts[0] + "/" + parts[1] + "?api_key=" + TMDB_KEY);
      if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
      var data = await response.json();
      r.poster = data.poster_path || "";
      r.genres = (data.genres || []).map(function (g) { return GENRE_NAMES[g.id] || g.name; });
      changed = true;
    } catch (error) {
      console.error("Could not fetch details for review '" + r.title + "':", error);
    }
  }

  if (changed) {
    saveList("filmlify_reviews", reviews);
    renderProfile();
  }
}
fillMissingReviewData();

function episodeThisWeek(details) {
  var DAY = 24 * 60 * 60 * 1000, now = Date.now();
  var next = details.next_episode_to_air, last = details.last_episode_to_air;
  if (next && next.air_date) {
    var t = new Date(next.air_date + "T00:00").getTime();
    if (t >= now - DAY && t <= now + 7 * DAY) { return next; }
  }
  if (last && last.air_date) {
    var t2 = new Date(last.air_date + "T00:00").getTime();
    if (t2 >= now - 7 * DAY && t2 <= now + DAY) { return last; }
  }
  return null;
}

function dayLabel(dateText) {
  var date = new Date(dateText + "T00:00");
  if (date.toDateString() === new Date().toDateString()) { return "Today"; }
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

async function fillEpisodes() {
  var list = document.getElementById("episodeList");
  try {
    var response = await fetch(TMDB_URL + "/trending/tv/week?api_key=" + TMDB_KEY);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var data = await response.json();
    var shows = (data.results || []).slice(0, 12);

    var found = await Promise.all(shows.map(async function (show) {
      var r = await fetch(TMDB_URL + "/tv/" + show.id + "?api_key=" + TMDB_KEY);
      if (!r.ok) { return null; }
      var episode = episodeThisWeek(await r.json());
      return episode ? { show: show, episode: episode } : null;
    }));
    found = found.filter(Boolean).slice(0, 5);
    if (found.length === 0) { return; }

    list.replaceChildren();
    found.forEach(function (f) {
      var row = document.createElement("div");
      row.className = "item with-pic";
      row.dataset.key = remember(f.show);

      var pic = document.createElement("div");
      pic.className = "pic tall";
      if (f.show.poster_path) {
        pic.classList.add("has-image");
        pic.style.backgroundImage = "url(" + POSTER_URL + f.show.poster_path + ")";
      }

      var text = document.createElement("span");
      var title = document.createElement("b");
      title.textContent = f.show.name;
      var info = document.createElement("small");
      info.textContent = "S" + f.episode.season_number + " E" + f.episode.episode_number + " • " + f.episode.name;
      text.appendChild(title);
      text.appendChild(document.createElement("br"));
      text.appendChild(info);

      var day = document.createElement("small");
      day.className = "day";
      day.textContent = "📅 " + dayLabel(f.episode.air_date);

      row.appendChild(pic);
      row.appendChild(text);
      row.appendChild(day);
      list.appendChild(row);
    });
  } catch (error) {
    console.error("Could not load new episodes:", error);
  }
}

document.addEventListener("click", function (e) {
  var row = e.target.closest(".item[data-key]");
  if (row && known[row.dataset.key]) { openMovie(known[row.dataset.key]); }
});

var TV_GENRE_IDS = {
  "Drama": "18", "Sci-Fi": "10765", "Crime": "80", "Animation": "16",
  "Thriller": "80,9648", "Comedy": "35", "Mystery": "9648", "Documentary": "99"
};
var genreClicks = 0;

async function showGenre(card) {
  var name = card.textContent.trim();
  var myClick = ++genreClicks;

  document.querySelectorAll(".genres div").forEach(function (c) { c.classList.toggle("active", c === card); });
  var section = document.getElementById("genreResults");
  var row = document.getElementById("genreRow");
  document.getElementById("genreTitle").textContent = name + " TV Shows";
  section.hidden = false;
  row.textContent = "Loading...";

  try {
    var url = TMDB_URL + "/discover/tv?with_genres=" + encodeURIComponent(TV_GENRE_IDS[name]) +
              "&sort_by=popularity.desc&api_key=" + TMDB_KEY;
    var response = await fetch(url);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var data = await response.json();
    if (myClick !== genreClicks) { return; }

    var items = (data.results || []).filter(function (m) { return m.poster_path; });
    row.replaceChildren();
    if (items.length === 0) { row.textContent = "No shows found for this genre."; }
    items.forEach(function (m) { row.appendChild(makeCard(m)); });
    row.scrollLeft = 0;
  } catch (error) {
    row.textContent = "Could not load shows. Check your internet connection.";
    console.error("Genre lookup failed:", error);
  }
  updateAllArrows();
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll(".genres div").forEach(function (card) {
  card.onclick = function () { showGenre(card); };
  card.onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showGenre(card); }
  };
});

function addFact(box, label, text) {
  if (!text) { return; }
  var p = document.createElement("p");
  var b = document.createElement("b");
  b.textContent = label + ": ";
  p.appendChild(b);
  p.appendChild(document.createTextNode(text));
  box.appendChild(p);
}

async function loadDetails(m) {
  var extra = document.getElementById("mExtra");
  var similar = document.getElementById("mSimilar");
  extra.textContent = "Loading details...";
  similar.replaceChildren();
  try {
    var url = TMDB_URL + "/" + m.media_type + "/" + m.id +
              "?append_to_response=credits,videos,watch/providers,similar&api_key=" + TMDB_KEY;
    var response = await fetch(url);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var d = await response.json();
    if (!current || current.id !== m.id) { return; }
    extra.replaceChildren();

    var minutes = d.runtime ? d.runtime + " min" : (d.episode_run_time && d.episode_run_time[0] ? d.episode_run_time[0] + " min per episode" : "");
    var genres = (d.genres || []).map(function (g) { return g.name; }).join(", ");
    addFact(extra, "Details", [minutes, genres].filter(Boolean).join(" • "));
    addFact(extra, "Cast", ((d.credits || {}).cast || []).slice(0, 6).map(function (c) { return c.name; }).join(", "));

    var regions = (d["watch/providers"] || {}).results || {};
    var region = regions.PH || regions.US;
    var where = region && region.flatrate ? region.flatrate.map(function (p) { return p.provider_name; }).join(", ") : "";
    addFact(extra, "Where to watch", where || "not listed for your region");

    var trailer = ((d.videos || {}).results || []).find(function (v) { return v.site === "YouTube" && v.type === "Trailer"; });
    if (trailer) {
      var link = document.createElement("a");
      link.className = "btn";
      link.textContent = "▶ Watch Trailer";
      link.href = "https://www.youtube.com/watch?v=" + trailer.key;
      link.target = "_blank";
      link.rel = "noopener";
      extra.appendChild(link);
    }

    ((d.similar || {}).results || []).filter(function (x) { return x.poster_path; }).slice(0, 10).forEach(function (x) {
      x.media_type = m.media_type;
      similar.appendChild(makeCard(x));
    });
    updateAllArrows();
  } catch (error) {
    extra.textContent = "";
    console.error("Could not load details:", error);
  }
}

document.addEventListener("click", function (e) {
  var button = e.target.closest(".quick button");
  if (!button) { return; }
  var m = known[button.closest(".card").dataset.key];
  if (!m) { return; }
  if (button.dataset.action === "watchlist") { toggleWatchlist(m); }
  else if (button.dataset.action === "watched") { toggleWatched(m); }
  else {
    if (!requireLogin("like movies")) { return; }
    var key = m.media_type + "-" + m.id;
    var liked = getList("filmlify_liked");
    if (liked.indexOf(key) >= 0) { liked = liked.filter(function (k) { return k !== key; }); showMessage("Removed your like."); }
    else { liked.push(key); showMessage("You liked " + nameOf(m) + "!"); }
    saveList("filmlify_liked", liked);
    button.classList.toggle("liked", liked.indexOf(key) >= 0);
  }
});

function ensureReviewIds() {
  var reviews = getList("filmlify_reviews"), fixed = false;
  reviews.forEach(function (r, i) { if (!r.id) { r.id = Date.now() + i; fixed = true; } });
  if (fixed) { saveList("filmlify_reviews", reviews); }
}

function renderCustomLists() {
  var box = document.getElementById("customLists");
  box.replaceChildren();
  var lists = getList("filmlify_customlists");
  if (lists.length === 0) { box.textContent = "No lists yet. Create one below."; }
  lists.forEach(function (l) {
    var row = document.createElement("div");
    row.className = "item";
    var info = document.createElement("span");
    var name = document.createElement("b");
    name.textContent = l.name + " (" + l.items.length + ")";
    info.appendChild(name);
    if (l.items.length) {
      var titles = document.createElement("small");
      titles.textContent = l.items.map(function (i) { return i.title; }).join(", ");
      info.appendChild(document.createElement("br"));
      info.appendChild(titles);
    }
    var del = document.createElement("button");
    del.className = "btn small";
    del.textContent = "✕";
    del.title = "Delete list";
    del.onclick = function () {
      saveList("filmlify_customlists", getList("filmlify_customlists").filter(function (x) { return x.id !== l.id; }));
      renderCustomLists();
      paintListSelect();
    };
    row.appendChild(info);
    row.appendChild(del);
    box.appendChild(row);
  });
}

function paintListSelect() {
  var select = document.getElementById("mListSelect");
  select.replaceChildren();
  var lists = getList("filmlify_customlists");
  if (lists.length === 0) { select.appendChild(new Option("Create a list on your Profile first", "")); }
  lists.forEach(function (l) { select.appendChild(new Option(l.name, l.id)); });
}

document.getElementById("createList").onclick = function () {
  if (!requireLogin("create lists")) { return; }
  var input = document.getElementById("newListName");
  var name = input.value.trim();
  if (!name) { showMessage("Type a name for your list first."); return; }
  var lists = getList("filmlify_customlists");
  lists.push({ id: Date.now(), name: name, items: [] });
  saveList("filmlify_customlists", lists);
  input.value = "";
  renderCustomLists();
  showMessage("List created!");
};

document.getElementById("mListAdd").onclick = function () {
  if (!requireLogin("use your lists")) { return; }
  var id = document.getElementById("mListSelect").value;
  if (!id || !current) { showMessage("Create a list on your Profile page first."); return; }
  var lists = getList("filmlify_customlists");
  var list = lists.find(function (l) { return String(l.id) === id; });
  var key = current.media_type + "-" + current.id;
  if (list.items.some(function (i) { return i.key === key; })) { showMessage("Already in " + list.name + "."); return; }
  list.items.push({ key: key, title: nameOf(current) });
  saveList("filmlify_customlists", lists);
  renderCustomLists();
  showMessage("Added to " + list.name + "!");
};

var me = currentUser();
var profileInfo = {
  name: me ? (me.displayName || me.username) : "Guest",
  handle: me ? (me.handle || "@" + me.username) : "",
  bio: me ? (me.bio || "Film lover") : ""
};
try { profileInfo = JSON.parse(localStorage.getItem(userKey("filmlify_profile"))) || profileInfo; } catch (e) {}
function paintProfileInfo() {
  document.getElementById("pName").textContent = profileInfo.name;
  document.getElementById("pBio").textContent = profileInfo.handle + " • " + profileInfo.bio;
  document.getElementById("pAvatar").textContent = profileInfo.name.charAt(0).toUpperCase();
}
document.getElementById("editProfile").onclick = function () {
  if (!requireLogin("edit your profile")) { return; }
  var name = prompt("Your name:", profileInfo.name);
  if (name === null) { return; }
  var handle = prompt("Your username (like @name):", profileInfo.handle);
  if (handle === null) { return; }
  var bio = prompt("A short bio:", profileInfo.bio);
  if (bio === null) { return; }
  profileInfo = { name: name.trim() || profileInfo.name, handle: handle.trim(), bio: bio.trim() };
  try { localStorage.setItem(userKey("filmlify_profile"), JSON.stringify(profileInfo)); } catch (e) {}
  paintProfileInfo();
  cloudUpdateProfile(profileInfo);
  showMessage("Profile updated!");
};
paintProfileInfo();
renderProfile();

var MOVIE_GENRES = [[28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"], [99, "Documentary"], [18, "Drama"], [14, "Fantasy"], [27, "Horror"], [9648, "Mystery"], [10749, "Romance"], [878, "Sci-Fi"], [53, "Thriller"]];
var TV_GENRES_LIST = [[10759, "Action & Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"], [99, "Documentary"], [18, "Drama"], [9648, "Mystery"], [10765, "Sci-Fi & Fantasy"]];
var browsePage = 1;
var fType = document.getElementById("fType"), fGenre = document.getElementById("fGenre"), fYear = document.getElementById("fYear");
var fRating = document.getElementById("fRating"), fSort = document.getElementById("fSort");
var browseGrid = document.getElementById("browseGrid"), loadMore = document.getElementById("loadMore");

function fillGenreFilter() {
  fGenre.replaceChildren(new Option("Any genre", ""));
  (fType.value === "movie" ? MOVIE_GENRES : TV_GENRES_LIST).forEach(function (g) { fGenre.appendChild(new Option(g[1], g[0])); });
}
fYear.appendChild(new Option("Any year", ""));
for (var year = 2026; year >= 1970; year--) { fYear.appendChild(new Option(year, year)); }

async function runBrowse(more) {
  if (more) { browsePage++; } else { browsePage = 1; browseGrid.textContent = "Loading..."; }
  var type = fType.value;
  var sort = fSort.value;
  if (type === "tv" && sort === "primary_release_date.desc") { sort = "first_air_date.desc"; }
  var params = ["sort_by=" + sort, "page=" + browsePage, "vote_count.gte=100"];
  if (fGenre.value) { params.push("with_genres=" + fGenre.value); }
  if (fYear.value) { params.push((type === "movie" ? "primary_release_year=" : "first_air_date_year=") + fYear.value); }
  if (fRating.value) { params.push("vote_average.gte=" + fRating.value); }
  try {
    var response = await fetch(TMDB_URL + "/discover/" + type + "?" + params.join("&") + "&api_key=" + TMDB_KEY);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var data = await response.json();
    if (!more) { browseGrid.replaceChildren(); }
    var items = (data.results || []).filter(function (m) { return m.poster_path; });
    if (!more && items.length === 0) { browseGrid.textContent = "No results. Try different filters."; }
    items.forEach(function (m) { m.media_type = type; browseGrid.appendChild(makeCard(m)); });
    loadMore.hidden = browsePage >= data.total_pages;
  } catch (error) {
    browseGrid.textContent = "Could not load results. Check your internet connection.";
    console.error("Browse failed:", error);
  }
}
fType.onchange = function () { fillGenreFilter(); runBrowse(false); };
[fGenre, fYear, fRating, fSort].forEach(function (f) { f.onchange = function () { runBrowse(false); }; });
loadMore.onclick = function () { runBrowse(true); };
fillGenreFilter();
runBrowse(false);

document.getElementById("menuBtn").onclick = function () { document.getElementById("mainNav").classList.toggle("open"); };
window.addEventListener("hashchange", function () { document.getElementById("mainNav").classList.remove("open"); });

var returnTo;

function accounts() {
  try { return JSON.parse(localStorage.getItem("filmlify_accounts")) || []; } catch (e) { return []; }
}
function currentUser() {
  if (CLOUD) {
    var cs = cloudSession();
    return cs ? { username: cs.username, id: cs.user_id, displayName: cs.displayName || cs.username, handle: "@" + cs.username, bio: cs.bio || "Film lover" } : null;
  }
  try {
    var name = localStorage.getItem("filmlify_session");
    if (!name) { return null; }
    return accounts().find(function (a) { return a.username === name; }) || null;
  } catch (e) { return null; }
}
function userKey(name) {
  var u = currentUser();
  return u ? name + ":" + u.username : null;
}

async function hashPassword(password, salt) {
  var text = salt + ":" + password;
  if (window.crypto && crypto.subtle) {
    var buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  var h = 0;
  for (var i = 0; i < text.length; i++) { h = (h * 31 + text.charCodeAt(i)) | 0; }
  return "basic" + h;
}

function finishLogin(username, message) {
  localStorage.setItem("filmlify_session", username);
  sessionStorage.setItem("flash", message);
  sessionStorage.setItem("goto", returnTo || "#home");
  location.reload();
}
function logout() {
  localStorage.removeItem("filmlify_cloud");
  localStorage.removeItem("filmlify_session");
  sessionStorage.setItem("flash", "You are logged out.");
  sessionStorage.setItem("goto", "#home");
  location.reload();
}

function requireLogin(what) {
  if (currentUser()) { return true; }
  returnTo = location.hash || "#home";
  showMessage("Please log in to " + what + ".");
  closeMovie();
  location.hash = "#login";
  return false;
}

function paintUserArea() {
  var area = document.getElementById("userArea");
  var u = currentUser();
  if (!u) { return; }
  area.replaceChildren();
  var name = document.createElement("a");
  name.className = "login-link";
  name.href = "#profile";
  name.textContent = "👤 " + u.username;
  var out = document.createElement("a");
  out.className = "login-link";
  out.href = "#";
  out.style.marginLeft = "14px";
  out.textContent = "Log out";
  out.onclick = function (e) { e.preventDefault(); logout(); };
  area.appendChild(name);
  area.appendChild(out);
}
paintUserArea();

document.getElementById("reviewText").onfocus = function () {
  if (!currentUser()) { this.blur(); requireLogin("write a review"); }
};

try {
  var flash = sessionStorage.getItem("flash");
  if (flash) { sessionStorage.removeItem("flash"); showMessage(flash); }
} catch (e) {}

function slim(m) {
  return { id: m.id, media_type: m.media_type, title: m.title, name: m.name, poster_path: m.poster_path,
           overview: m.overview, vote_average: m.vote_average, release_date: m.release_date,
           first_air_date: m.first_air_date, genre_ids: m.genre_ids };
}

function fillFavorites(rowId, type) {
  var row = document.getElementById(rowId);
  row.replaceChildren();
  var favs = getList("filmlify_favorites").filter(function (f) { return f.media_type === type && f.poster_path; }).slice(0, 5);
  favs.forEach(function (m) { row.appendChild(makeCard(m)); });

  for (var i = favs.length; i < 5; i++) {
    var slot = document.createElement("div");
    slot.className = "slot";
    var box = document.createElement("div");
    box.className = "slot-poster";
    box.textContent = "+";
    box.onclick = function () {
      showMessage("Search for a title, open it, then press Add to Favorites.");
      document.getElementById("search").focus();
    };
    slot.appendChild(box);
    row.appendChild(slot);
  }
  if (row.updateArrows) { row.updateArrows(); }
}
function renderFavorites() {
  fillFavorites("favFilms", "movie");
  fillFavorites("favShows", "tv");
}

function paintFavoriteButton() {
  if (!current) { return; }
  var key = current.media_type + "-" + current.id;
  var yes = getList("filmlify_favorites").some(function (f) { return f.media_type + "-" + f.id === key; });
  document.getElementById("mFavorite").textContent = yes ? "♥ In Favorites (click to remove)" : "♡ Add to Favorites";
}

document.getElementById("mFavorite").onclick = function () {
  if (!requireLogin("save favorites")) { return; }
  var key = current.media_type + "-" + current.id;
  var favs = getList("filmlify_favorites");
  var exists = favs.some(function (f) { return f.media_type + "-" + f.id === key; });
  if (exists) {
    favs = favs.filter(function (f) { return f.media_type + "-" + f.id !== key; });
    showMessage("Removed from your favorites.");
  } else {
    var same = favs.filter(function (f) { return f.media_type === current.media_type; }).length;
    if (same >= 5) {
      showMessage("You can pick up to 5 favorite " + (current.media_type === "tv" ? "shows" : "films") + ". Remove one first.");
      return;
    }
    favs.push(slim(current));
    showMessage("Added to your favorites!");
  }
  saveList("filmlify_favorites", favs);
  renderProfile();
  paintFavoriteButton();
};
renderProfile();

async function loadBrandPosters() {
  var box = document.getElementById("brandPosters");
  try {
    var response = await fetch(TMDB_URL + "/trending/movie/week?api_key=" + TMDB_KEY);
    if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
    var data = await response.json();
    (data.results || []).filter(function (m) { return m.poster_path; }).slice(0, 16).forEach(function (m) {
      var tile = document.createElement("div");
      tile.style.backgroundImage = "url(" + POSTER_URL + m.poster_path + ")";
      box.appendChild(tile);
    });
  } catch (error) {
    console.error("Could not load login-page posters:", error);
  }
}
loadBrandPosters();

async function seedDemoAccount() {
  if (CLOUD) { return; }
  try {
    if (accounts().some(function (a) { return a.username === "victor123"; })) { return; }

    var salt = Math.random().toString(36).slice(2);
    var list = accounts();
    list.push({
      username: "victor123",
      email: "victor@filmlify.demo",
      salt: salt,
      hash: await hashPassword("victor456", salt),
      displayName: "Victor Wenbamamahalin",
      handle: "@wembaby",
      bio: "Film Enthusiast & Reviewer"
    });
    localStorage.setItem("filmlify_accounts", JSON.stringify(list));

    var films = [[510, "One Flew Over the Cuckoo's Nest"], [278, "The Shawshank Redemption"], [77, "Memento"], [274, "The Silence of the Lambs"]];
    var shows = [[1396, "Breaking Bad"], [60059, "Better Call Saul"], [1398, "The Sopranos"]];
    var favorites = [], watched = [];
    films.forEach(function (f) {
      favorites.push({ id: f[0], media_type: "movie", title: f[1] });
      watched.push({ key: "movie-" + f[0], title: f[1] });
    });
    shows.forEach(function (s) {
      favorites.push({ id: s[0], media_type: "tv", name: s[1] });
      watched.push({ key: "tv-" + s[0], title: s[1] });
    });
    watched.push({ key: "movie-641", title: "Requiem for a Dream" });

    var put = function (name, data) { localStorage.setItem(name + ":victor123", JSON.stringify(data)); };
    put("filmlify_favorites", favorites);
    put("filmlify_watched", watched);
    put("filmlify_reviews", [{
      id: 1, key: "movie-641", title: "Requiem for a Dream", stars: 5,
      text: "Ang lakas ng dating ng pelikulang ito. Hindi ko makakalimutan.", date: "Aug 29, 2026"
    }]);
  } catch (e) {
    console.error("Could not create the demo account:", e);
  }
}
seedDemoAccount();

async function fillMissingFavorites() {
  var favs = getList("filmlify_favorites");
  var changed = false;
  for (var i = 0; i < favs.length; i++) {
    var f = favs[i];
    if (f.poster_path !== undefined) { continue; }
    try {
      var response = await fetch(TMDB_URL + "/" + f.media_type + "/" + f.id + "?api_key=" + TMDB_KEY);
      if (!response.ok) { throw new Error("TMDB answered with error " + response.status); }
      var d = await response.json();
      f.poster_path = d.poster_path || "";
      f.title = d.title; f.name = d.name; f.overview = d.overview; f.vote_average = d.vote_average;
      f.release_date = d.release_date; f.first_air_date = d.first_air_date;
      f.genre_ids = (d.genres || []).map(function (g) { return g.id; });
      changed = true;
    } catch (error) {
      console.error("Could not load favorite " + f.id + ":", error);
    }
  }
  if (changed) { saveList("filmlify_favorites", favs); renderProfile(); }
}
fillMissingFavorites();

var cloudCounts = { followers: 0, following: 0 };
var myFollowing = [];
var myFollowers = [];

function cloudSession() {
  try { return JSON.parse(localStorage.getItem("filmlify_cloud")); } catch (e) { return null; }
}

async function refreshSession(session) {
  try {
    var r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!r.ok) { return null; }
    var d = await r.json();
    session.access_token = d.access_token;
    session.refresh_token = d.refresh_token;
    session.expires_at = Math.floor(Date.now() / 1000) + (d.expires_in || 3600);
    localStorage.setItem("filmlify_cloud", JSON.stringify(session));
    return session;
  } catch (e) { return null; }
}

async function db(path, method, body, extraHeaders) {
  var session = cloudSession();
  if (session && Date.now() / 1000 > session.expires_at - 30) { session = (await refreshSession(session)) || session; }
  var headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
  if (session) { headers.Authorization = "Bearer " + session.access_token; }
  if (extraHeaders) { Object.assign(headers, extraHeaders); }
  var response = await fetch(SUPABASE_URL + "/rest/v1/" + path, { method: method || "GET", headers: headers, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) { throw new Error("Database error " + response.status + ": " + await response.text()); }
  var text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function authCall(path, body) {
  try {
    var r = await fetch(SUPABASE_URL + "/auth/v1/" + path, {
      method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    var d = await r.json();
    if (!r.ok) { return { error: true, message: d.msg || d.error_description || d.message || "Something went wrong." }; }
    return d;
  } catch (e) { return { error: true, message: "Could not reach the database. Check your internet." }; }
}

async function cloudAuth(isSignUp, user, email, pass) {
  try {
    var data;
    if (isSignUp) {
      user = user.toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(user)) { return "Username: 3-20 letters, numbers or _ only."; }
      var taken = await db("profiles?username=eq." + encodeURIComponent(user) + "&select=id");
      if (taken.length) { return "That username is already taken."; }
      data = await authCall("signup", { email: email, password: pass, data: { username: user } });
    } else {
      if (!/^\S+@\S+\.\S+$/.test(user)) { return "Enter the email you signed up with."; }
      data = await authCall("token?grant_type=password", { email: user, password: pass });
    }
    if (data.error) { return data.message; }
    if (!data.access_token) { return "Account created! Check your email to confirm it, then sign in."; }

    var rows = await db("profiles?id=eq." + data.user.id + "&select=username,display_name,bio", "GET", null, { Authorization: "Bearer " + data.access_token });
    var profile = rows[0] || { username: user };
    localStorage.setItem("filmlify_cloud", JSON.stringify({
      access_token: data.access_token, refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      user_id: data.user.id, username: profile.username, displayName: profile.display_name, bio: profile.bio
    }));
    sessionStorage.setItem("flash", (isSignUp ? "Welcome to Filmlify, " : "Welcome back, ") + profile.username + "!");
    sessionStorage.setItem("goto", returnTo || "#home");
    location.reload();
    return "";
  } catch (error) {
    console.error(error);
    return "Something went wrong. Please try again.";
  }
}

function cloudSaveReview(r) {
  var u = currentUser();
  if (!CLOUD || !u || !r) { return; }
  db("reviews", "POST", { user_id: u.id, local_id: r.id, tmdb_key: r.key, title: r.title, poster: r.poster || "", stars: r.stars, body: r.text || "" }, { Prefer: "return=minimal" })
    .then(loadFriendFeed).catch(function (e) { console.error("Could not share review:", e); });
}
function cloudDeleteReview(localId) {
  var u = currentUser();
  if (!CLOUD || !u) { return; }
  db("reviews?user_id=eq." + u.id + "&local_id=eq." + localId, "DELETE").catch(function (e) { console.error(e); });
}
function cloudUpdateProfile(info) {
  var u = currentUser();
  if (!CLOUD || !u) { return; }
  db("profiles?id=eq." + u.id, "PATCH", { display_name: info.name, bio: info.bio }, { Prefer: "return=minimal" }).catch(function (e) { console.error(e); });
}

async function refreshFollowing() {
  var u = currentUser();
  if (!CLOUD || !u) { return; }
  try {
    var mine = await db("follows?follower=eq." + u.id + "&select=following");
    var theirs = await db("follows?following=eq." + u.id + "&select=follower");
    myFollowing = mine.map(function (r) { return r.following; });
    myFollowers = theirs.map(function (r) { return r.follower; });
    cloudCounts = { following: myFollowing.length, followers: myFollowers.length };
    updateStats();
  } catch (e) { console.error("Could not load follows:", e); }
}

async function toggleFollowUser(id, username) {
  var u = currentUser();
  if (!u) { requireLogin("follow people"); return; }
  try {
    if (myFollowing.indexOf(id) >= 0) {
      await db("follows?follower=eq." + u.id + "&following=eq." + id, "DELETE");
      showMessage("You unfollowed @" + username + ".");
    } else {
      await db("follows", "POST", { follower: u.id, following: id }, { Prefer: "return=minimal" });
      showMessage("You are now following @" + username + "!");
    }
  } catch (e) { console.error(e); showMessage("Could not update. Please try again."); return; }
  await loadPeople();
  loadFriendFeed();
}

function personRow(p) {
  var row = document.createElement("div");
  row.className = "item";
  var text = document.createElement("span");
  var name = document.createElement("b");
  name.textContent = p.display_name || p.username;
  var handle = document.createElement("small");
  handle.textContent = "@" + p.username;
  text.appendChild(name);
  text.appendChild(document.createElement("br"));
  text.appendChild(handle);
  var button = document.createElement("button");
  button.className = "btn small";
  button.textContent = myFollowing.indexOf(p.id) >= 0 ? "Following ✓" : "Follow";
  button.onclick = function () { toggleFollowUser(p.id, p.username); };
  row.appendChild(text);
  row.appendChild(button);
  return row;
}
function fillPeopleList(box, people, emptyText) {
  box.replaceChildren();
  if (people.length === 0) { box.textContent = emptyText; }
  people.forEach(function (p) { box.appendChild(personRow(p)); });
}
async function profilesByIds(ids) {
  if (ids.length === 0) { return []; }
  return await db("profiles?id=in.(" + ids.join(",") + ")&select=id,username,display_name");
}

async function searchPeople() {
  var box = document.getElementById("peopleResults");
  var text = document.getElementById("peopleSearch").value.trim().toLowerCase();
  if (text.length < 2) { box.textContent = "Type at least 2 letters."; return; }
  try {
    var me = currentUser();
    var found = await db("profiles?username=ilike.*" + encodeURIComponent(text) + "*&limit=10&select=id,username,display_name");
    fillPeopleList(box, found.filter(function (p) { return p.id !== me.id; }), "Nobody found with that username.");
  } catch (e) { console.error(e); box.textContent = "Search failed. Please try again."; }
}

async function loadPeople() {
  var note = document.getElementById("peopleNote");
  if (!CLOUD) {
    note.textContent = "The accounts database is not connected yet. Add your Supabase URL and key at the top of script.js.";
    return;
  }
  if (!currentUser()) { return; }
  await refreshFollowing();
  try {
    fillPeopleList(document.getElementById("followingList"), await profilesByIds(myFollowing), "You are not following anyone yet.");
    fillPeopleList(document.getElementById("followersList"), await profilesByIds(myFollowers), "No followers yet.");
    if (document.getElementById("peopleSearch").value.trim().length >= 2) { searchPeople(); }
  } catch (e) { console.error(e); }
}

async function loadFriendFeed() {
  var box = document.getElementById("friendFeed");
  if (!CLOUD || !currentUser()) { return; }
  await refreshFollowing();
  try {
    if (myFollowing.length === 0) { box.textContent = "No friend activity yet. Follow people to see their reviews here."; box.className = "empty"; return; }
    var rows = await db("reviews?user_id=in.(" + myFollowing.join(",") + ")&select=*,profiles(username)&order=created_at.desc&limit=8");
    box.className = "";
    box.replaceChildren();
    if (rows.length === 0) { box.textContent = "The people you follow have not written reviews yet."; return; }
    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "item with-pic";
      var pic = document.createElement("div");
      pic.className = "pic tall";
      if (r.poster) { pic.classList.add("has-image"); pic.style.backgroundImage = "url(" + POSTER_URL + r.poster + ")"; }
      var text = document.createElement("span");
      var who = document.createElement("b");
      who.textContent = "@" + (r.profiles ? r.profiles.username : "someone") + " ";
      var stars = document.createElement("span");
      stars.className = "star";
      stars.textContent = starText(r.stars);
      text.appendChild(who);
      text.appendChild(document.createTextNode("reviewed " + r.title + " "));
      text.appendChild(stars);
      if (r.body) { text.appendChild(document.createElement("br")); text.appendChild(document.createTextNode(r.body)); }
      var date = document.createElement("small");
      date.textContent = new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      text.appendChild(document.createElement("br"));
      text.appendChild(date);
      row.appendChild(pic);
      row.appendChild(text);
      box.appendChild(row);
    });
  } catch (e) { console.error("Could not load friend activity:", e); }
}

var peopleTimer = null;
document.getElementById("peopleSearch").addEventListener("input", function () {
  clearTimeout(peopleTimer);
  peopleTimer = setTimeout(function () { if (CLOUD && currentUser()) { searchPeople(); } }, 300);
});
window.addEventListener("hashchange", function () { if (location.hash === "#people") { loadPeople(); } });
if (location.hash === "#people") { loadPeople(); }

if (CLOUD) {
  document.querySelector('label[for="user"]').textContent = "Email";
  document.getElementById("user").placeholder = "Enter your email";
  refreshFollowing().then(loadFriendFeed);
}