
(function () {
  "use strict";

  const AI_WORKER_URL = "https://orzeszek-backend.vercel.app/api/chat";
  const DEBUG = true;
  let history = [];

  if (
    typeof answerFoodQuestion !== "function" ||
    typeof streamChatMessage !== "function"
  ) {
    console.warn("ai.js: nie znaleziono funkcji czatu.");
    return;
  }

  function systemPrompt() {
    const styleMap = {
      sarcasm: "lekko sarkastyczny, ale życzliwy",
      kind: "ciepły i uprzejmy",
      motivation: "konkretny i motywujący",
      educational: "edukacyjny",
      neutral: "neutralny i rzeczowy"
    };

    let tone = "neutralny i rzeczowy";

    try {
      const picked = Array.from(selectedStyleIds())
        .map(id => styleMap[id])
        .filter(Boolean);
      if (picked.length) tone = picked.join("; ");
    } catch (e) {}

    let knowledge = "";

    try {
      knowledge = readProductKnowledge({ textContent: "" })
        .map(p => "- " + p.name + ": " + p.fact)
        .join("\n");
    } catch (e) {}

    return (
      "Jesteś Orzeszkiem, przyjazną wiewiórką aplikacji TasteShift. " +
      "Odpowiadasz po polsku, jasno i maksymalnie w 5 zdaniach. " +
      "Ton: " + tone + ". " +
      "Pomagasz w składnikach, przepisach, zamiennikach i pomysłach na posiłki. " +
      "Nie proponujesz głodówek, restrykcyjnych diet ani odchudzania. " +
      "Nie diagnozujesz i nie zastępujesz specjalisty. " +
      "Nie zawstydzasz użytkownika.\n" +
      (knowledge ? "Baza produktów:\n" + knowledge : "")
    );
  }

  async function askAI(userText) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(AI_WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          history: history,
          style: systemPrompt()
        }),
        signal: controller.signal
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          "HTTP " + res.status + " — " +
          (data.error || "Błąd serwera")
        );
      }

      const text = data.reply;

      if (typeof text !== "string" || !text.trim()) {
        throw new Error("Backend nie zwrócił odpowiedzi.");
      }

      history.push(
        { role: "user", content: userText },
        { role: "assistant", content: text.trim() }
      );

      history = history.slice(-12);
      return text.trim();

    } finally {
      clearTimeout(timer);
    }
  }

  document.addEventListener("submit", async function (event) {
    if (!event.target || event.target.id !== "chatForm") return;

    event.stopImmediatePropagation();
    event.preventDefault();

    if (chatReplyPending) return;

    const message = chatInput.value.trim();
    if (!message) return;

    chatReplyPending = true;
    chatSendButton.disabled = true;

    addChatMessage(message, "user");

    if (typeof recordStreakActivity === "function") {
      recordStreakActivity();
    }

    chatInput.value = "";

    const typing = document.createElement("div");
    typing.className = "chat-message mascot chat-typing";
    typing.setAttribute("aria-label", "Orzeszek pisze");
    typing.innerHTML = "<span></span><span></span><span></span>";

    chatMessages.append(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    let reply;

    try {
      reply = await askAI(message);
    } catch (err) {
      console.error("AI niedostępne:", err);

      if (DEBUG) {
        addChatMessage(
          "[Diagnostyka] " + (err.message || "Nieznany błąd"),
          "mascot"
        );
      }

      reply = addChatStyle(answerFoodQuestion(message));
    }

    typing.remove();

    try {
      await streamChatMessage(reply);
    } finally {
      chatReplyPending = false;
      chatSendButton.disabled = false;
      chatInput.focus();
    }
  }, true);
})();
