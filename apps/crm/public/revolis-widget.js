(function () {
  var container = document.getElementById("revolis-verified-badge");
  if (!container) return;

  var brokerSlug = container.getAttribute("data-slug");
  if (!brokerSlug) return;

  var baseUrl = container.getAttribute("data-base-url") || "https://app.revolis.ai";
  var href = baseUrl.replace(/\/+$/, "") + "/makleri/" + encodeURIComponent(brokerSlug);

  container.innerHTML =
    '<a href="' +
    href +
    '" target="_blank" rel="noopener noreferrer" style="text-decoration:none">' +
    '<div style="background:#0a0a0b;border:1px solid #eab308;padding:10px 20px;border-radius:12px;display:inline-flex;align-items:center;gap:10px;font-family:Inter,Arial,sans-serif;">' +
    '<span style="color:#eab308;font-weight:700;font-size:12px;">CERTIFIED BY REVOLIS.AI</span>' +
    '<div style="width:1px;height:20px;background:rgba(234,179,8,0.3)"></div>' +
    '<span style="color:#fff;font-size:10px;letter-spacing:1px">VERIFIED AGENT</span>' +
    "</div>" +
    "</a>";
})();
